"""supervisor_cliente.py — cliente A2A del Coordinador hacia el Supervisor (PRP-007).

La verificación FINAL del enjambre: el Coordinador entrega el RESULTADO INTEGRADO
(la rama tarea/<parent_id> con los diffs aplicados) al MISMO supervisor-a2a, que
re-ejecuta los gates de cero sobre el todo. El veredicto del conjunto es
independiente de los veredictos por parte: gate final rojo = escalada, no "aprobado
por partes" (SPEC-trio §7.4). Patrón idéntico al supervisor_cliente.py del Ejecutor.
"""
from __future__ import annotations

import os

import httpx

from a2a.client import A2ACardResolver, ClientConfig, ClientFactory
from a2a.helpers import get_data_parts, new_data_message
from a2a.types import SendMessageRequest, TaskState

DEFAULT_SUPERVISOR_URL = "http://supervisor-a2a:4200"
TIMEOUT_S = 300.0  # el gate final re-ejecuta build/tests sobre el todo: NO es sub-segundo


class SupervisorError(RuntimeError):
    """El Supervisor no entregó un veredicto; el mensaje trae el porqué."""


class SupervisorCliente:
    def __init__(
        self,
        base_url: str | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._base = (base_url or os.environ.get("SUPERVISOR_URL", DEFAULT_SUPERVISOR_URL)).rstrip("/")
        self._http = http_client

    async def evaluar(self, resultado: dict) -> dict:
        """RESULTADO integrado → message/send → veredicto (dict) del artifact."""
        http = self._http or httpx.AsyncClient(timeout=TIMEOUT_S)
        try:
            try:
                card = await A2ACardResolver(http, self._base).get_agent_card()
            except Exception as exc:  # card inalcanzable = supervisor caído
                raise SupervisorError(f"supervisor no disponible: {type(exc).__name__}") from exc

            cliente = ClientFactory(ClientConfig(httpx_client=http, streaming=False)).create(card)
            tarea_final = None
            try:
                async for r in cliente.send_message(
                    SendMessageRequest(message=new_data_message(resultado))
                ):
                    if r.HasField("task"):
                        tarea_final = r.task
            except SupervisorError:
                raise
            except Exception as exc:
                raise SupervisorError(f"fallo A2A con el supervisor: {type(exc).__name__}") from exc

            if tarea_final is None:
                raise SupervisorError("el supervisor no devolvió tarea")
            if tarea_final.status.state != TaskState.TASK_STATE_COMPLETED:
                detalle = ""
                if tarea_final.status.HasField("message") and tarea_final.status.message.parts:
                    detalle = tarea_final.status.message.parts[0].text
                raise SupervisorError(f"el supervisor no completó la revisión: {detalle[:300]}")
            if not tarea_final.artifacts:
                raise SupervisorError("el supervisor completó sin artifact de veredicto")
            datas = get_data_parts(tarea_final.artifacts[0].parts)
            if not datas or not isinstance(datas[0], dict):
                raise SupervisorError("el artifact del supervisor no trae veredicto JSON")
            return datas[0]
        finally:
            if self._http is None:
                await http.aclose()
