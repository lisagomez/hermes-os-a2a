"""ejecutor_cliente.py — cliente del Coordinador hacia el Ejecutor (PRP-007 → PRP-010).

El enjambre manda UNA sub-tarea y necesita de vuelta {resultado, veredicto}. Lo que cambio
con la COLA: el Ejecutor ya no construye al recibir — **encola** y responde
`{encolada, posicion}`. Asi que este cliente ahora:

    1. ENCOLA la sub-tarea (A2A, respuesta en ~1 s)
    2. le hereda la prioridad del padre (para que no se quede detras de peticiones nuevas)
    3. ESPERA su turno consultando `tareas` (la cola es serial: puede tardar)
    4. reconstruye {resultado, veredicto} — con el diff leido de GIT, no de la fila

El punto 4 no es un detalle: `estado.py` recorta el diff a 20.000 chars para el jsonb, y la
integracion hace `git apply`. Integrar un diff truncado seria corromper el trabajo en
silencio. El Coordinador monta el mismo volumen que el Ejecutor: lee la verdad donde vive.

Sigue aceptando el artifact ANTIGUO ({resultado, veredicto} directo) — asi un Ejecutor sin
cola (o un rollback) no rompe el enjambre.
"""
from __future__ import annotations

import os
from pathlib import Path

import httpx

from a2a.client import A2ACardResolver, ClientConfig, ClientFactory
from a2a.helpers import get_data_parts, new_data_message
from a2a.types import SendMessageRequest, TaskState

from cola_espera import EsperaCola, EsperaError
from integracion import IntegracionError, diff_de_worktree

DEFAULT_EJECUTOR_URL = "http://ejecutor-a2a:4100"
DEFAULT_WORKSPACE = "/workspace"
TIMEOUT_S = 600.0  # el ENCOLADO es rapido; la espera del turno va aparte (cola_espera)


class EjecutorError(RuntimeError):
    """El Ejecutor no entregó un resultado+veredicto; el mensaje trae el porqué."""


class EjecutorCliente:
    def __init__(
        self,
        base_url: str | None = None,
        http_client: httpx.AsyncClient | None = None,
        espera: EsperaCola | None = None,
        workspace_root: Path | None = None,
    ) -> None:
        self._base = (base_url or os.environ.get("EJECUTOR_URL", DEFAULT_EJECUTOR_URL)).rstrip("/")
        self._http = http_client
        self._espera = espera or EsperaCola()
        self._workspace_root = workspace_root or Path(
            os.environ.get("TRIO_WORKSPACE", DEFAULT_WORKSPACE)
        )

    async def ejecutar(self, sub_tarea: dict) -> dict:
        """Sub-TAREA → message/send → {resultado, veredicto} del artifact del Ejecutor."""
        http = self._http or httpx.AsyncClient(timeout=TIMEOUT_S)
        try:
            try:
                card = await A2ACardResolver(http, self._base).get_agent_card()
            except Exception as exc:  # card inalcanzable = ejecutor caído
                raise EjecutorError(f"ejecutor no disponible: {type(exc).__name__}") from exc

            cliente = ClientFactory(ClientConfig(httpx_client=http, streaming=False)).create(card)
            tarea_final = None
            try:
                async for r in cliente.send_message(
                    SendMessageRequest(message=new_data_message(sub_tarea))
                ):
                    if r.HasField("task"):
                        tarea_final = r.task
            except EjecutorError:
                raise
            except Exception as exc:
                raise EjecutorError(f"fallo A2A con el ejecutor: {type(exc).__name__}") from exc

            if tarea_final is None:
                raise EjecutorError("el ejecutor no devolvió tarea")
            if tarea_final.status.state != TaskState.TASK_STATE_COMPLETED:
                detalle = ""
                if tarea_final.status.HasField("message") and tarea_final.status.message.parts:
                    detalle = tarea_final.status.message.parts[0].text
                raise EjecutorError(f"el ejecutor no completó la sub-tarea: {detalle[:300]}")
            if not tarea_final.artifacts:
                raise EjecutorError("el ejecutor completó sin artifact de resultado")
            datas = get_data_parts(tarea_final.artifacts[0].parts)
            if not datas or not isinstance(datas[0], dict):
                raise EjecutorError("el artifact del ejecutor viene vacio")
            artifact = datas[0]

            # Camino NUEVO (PRP-010): el Ejecutor encolo. Esperamos nuestro turno como
            # cualquiera — el enjambre no se salta la cola (si lo hiciera, reabriria el
            # agujero de concurrencia que la cola existe para cerrar).
            if artifact.get("encolada"):
                return await self._esperar_turno(sub_tarea["task_id"], artifact)

            # Camino ANTIGUO (Ejecutor sin cola / rollback): veredicto sincrono.
            if "veredicto" not in artifact:
                raise EjecutorError("el artifact del ejecutor no trae {resultado, veredicto}")
            return artifact
        finally:
            if self._http is None:
                await http.aclose()

    async def _esperar_turno(self, task_id: str, acuse: dict) -> dict:
        """La sub-tarea esta en la cola: heredar prioridad, esperar el veredicto, y armar el
        RESULTADO con el diff de git (la fila lo trae truncado: no sirve para `git apply`)."""
        print(
            f"[coordinador] {task_id} encolada (posicion {acuse.get('posicion')}); "
            "esperando turno — la cola es serial",
            flush=True,
        )
        try:
            fila = await self._espera.esperar(task_id)
        except EsperaError as exc:
            raise EjecutorError(f"esperando la sub-tarea en la cola: {exc}") from exc

        estado = fila["estado"]
        if estado in ("escalada", "cancelada"):
            raise EjecutorError(
                f"la sub-tarea {task_id} acabo en '{estado}' (intentos "
                f"{fila.get('intentos')}/{fila.get('intentos_max')}): el enjambre no la puede "
                "dar por buena. Mira su fila en `tareas` antes de relanzar el padre."
            )

        veredicto = fila.get("veredicto") or {}
        if not veredicto:
            raise EjecutorError(
                f"la sub-tarea {task_id} esta en '{estado}' pero su fila no trae veredicto"
            )
        resultado = dict(fila.get("resultado") or {})
        # El diff de la fila esta RECORTADO (jsonb, 20k): se relee de git, que es la verdad.
        try:
            diff, archivos = diff_de_worktree(self._workspace_root, task_id)
        except IntegracionError as exc:
            raise EjecutorError(f"no se pudo leer el diff de {task_id}: {exc.hallazgos}") from exc
        resultado.update({"task_id": task_id, "diff": diff, "archivos": archivos,
                          "worktree": f"worktree/{task_id}"})
        return {"resultado": resultado, "veredicto": veredicto}
