"""cola_espera.py — el enjambre habla con la COLA (PRP-010, Fase 7).

El Ejecutor ya no construye al recibir: ENCOLA y responde `{encolada, posicion}`. El
Coordinador, que antes esperaba un veredicto sincrono, ahora hace lo mismo que el equipo:
encola su sub-tarea y **espera su turno**, consultando la fila en `tareas`.

Que cambia de verdad (decirlo claro, no esconderlo): el enjambre **ya no corre en paralelo**.
Las sub-tareas de una ola se encolan juntas, pero el worker las ejecuta **de una en una**
(concurrencia 1: el servidor tiene 8 GB y cada tarea son un CLI + `npm build` + Playwright,
dos veces). El enjambre sigue aportando lo que de verdad aporta —descomponer en un DAG,
respetar dependencias, integrar las ramas y pedir una verificacion final del todo—, pero el
`fan_out_max` ya no compra velocidad: compra ORDEN.

Fronteras: aqui solo se LEE `tareas` (el ciclo de estados de la sub-tarea es del worker; un
segundo escritor reabriria las carreras que el trio evita desde la Fase 6). La unica
escritura es la prioridad HEREDADA (ver `fijar_prioridad`), y solo sobre filas que siguen
en la cola.
"""
from __future__ import annotations

import asyncio
import os
from typing import Any

import httpx

TIMEOUT_HTTP_S = 15.0
# La sub-tarea puede esperar su turno detras de otras: la espera es LARGA a proposito.
ESPERA_MAX_S = float(os.environ.get("COORD_ESPERA_MAX_S", 4 * 3600))
INTERVALO_S = float(os.environ.get("COORD_ESPERA_INTERVALO_S", 10))

TERMINALES = {"aprobada", "rechazada", "escalada", "cancelada"}
ESTADO_COLA = "recibida"


class EsperaError(RuntimeError):
    """No se pudo esperar/consultar la sub-tarea. El mensaje dice exactamente que."""


class EsperaCola:
    """Lee la fila de la sub-tarea hasta que llega a un estado terminal."""

    def __init__(
        self,
        url: str | None = None,
        key: str | None = None,
        http_client: httpx.AsyncClient | None = None,
        intervalo_s: float = INTERVALO_S,
        espera_max_s: float = ESPERA_MAX_S,
    ) -> None:
        self._url = (url or os.environ.get("SUPABASE_URL") or "").rstrip("/")
        self._key = key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
        self._http = http_client
        self._intervalo = intervalo_s
        self._espera_max = espera_max_s

    @property
    def activo(self) -> bool:
        return bool(self._url and self._key)

    def _headers(self, extra: dict[str, str] | None = None) -> dict[str, str]:
        h = {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
            "Content-Type": "application/json",
        }
        return h | (extra or {})

    async def _pedir(self, metodo: str, path: str, **kw) -> Any:
        url = f"{self._url}/rest/v1/{path}"
        try:
            if self._http is not None:
                r = await self._http.request(metodo, url, **kw)
            else:
                async with httpx.AsyncClient(timeout=TIMEOUT_HTTP_S) as c:
                    r = await c.request(metodo, url, **kw)
        except httpx.HTTPError as exc:
            raise EsperaError(f"{metodo} {path}: {type(exc).__name__}: {exc}") from exc
        if r.status_code >= 300:
            raise EsperaError(f"{metodo} {path}: HTTP {r.status_code}: {r.text[:200]}")
        return r.json()

    # Sobre la PRIORIDAD (y por que el enjambre NO la toca):
    # El PRP pedia que las sub-tareas "heredaran la prioridad del padre". No se hace, y no
    # es un olvido: el padre NUNCA esta en la cola (lo ejecuta el Coordinador, no el worker),
    # asi que su prioridad es siempre 0 — heredar 0 es no hacer nada, y darle al Coordinador
    # una via para SUBIR prioridades reabriria justo lo que la cola cierra: que algo que no
    # es Elisa se cuele en la fila. Las sub-tareas entran como todo el mundo (FIFO).
    # Si una feature grande se atasca detras de peticiones nuevas, la palanca existe y es de
    # ella: `cola-trio.py prioriza <sub_task_id>`.

    async def esperar(self, task_id: str) -> dict:
        """Bloquea hasta que la sub-tarea llega a un estado terminal. Devuelve la fila."""
        if not self.activo:
            raise EsperaError(
                "el Coordinador no tiene credenciales para consultar la cola "
                "(SUPABASE_URL/SERVICE_ROLE_KEY): no puede saber como acabo la sub-tarea"
            )
        limite = asyncio.get_event_loop().time() + self._espera_max
        ultimo = ""
        while True:
            filas = await self._pedir(
                "GET",
                f"tareas?task_id=eq.{task_id}"
                "&select=task_id,estado,resultado,veredicto,intentos,intentos_max",
                headers=self._headers(),
            )
            if not filas:
                raise EsperaError(f"{task_id}: la fila no existe (¿se encolo de verdad?)")
            fila = filas[0]
            estado = fila["estado"]
            if estado != ultimo:
                print(f"[coordinador] {task_id}: {estado}", flush=True)
                ultimo = estado
            if estado in TERMINALES:
                return fila
            if asyncio.get_event_loop().time() > limite:
                raise EsperaError(
                    f"{task_id}: sigue en '{estado}' tras {self._espera_max/3600:.1f} h. "
                    "NO esta perdida (la cola es durable): revisa la cola con cola-trio.py "
                    "antes de relanzar nada."
                )
            await asyncio.sleep(self._intervalo)
