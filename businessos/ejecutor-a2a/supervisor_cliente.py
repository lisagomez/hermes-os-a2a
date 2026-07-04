"""supervisor_cliente.py — cliente A2A del Ejecutor hacia el Supervisor (PRP-006).

El Ejecutor entrega su RESULTADO al Supervisor via A2A (SPEC-trio §5) — no a
Hermes, no al humano. Descubre por Agent Card y usa message/send; el veredicto
vuelve estructurado en el artifact. Inyectable en tests (httpx.ASGITransport o
un doble).
"""
from __future__ import annotations

import os

import httpx

from a2a.client import A2ACardResolver, ClientConfig, ClientFactory
from a2a.helpers import get_data_parts, new_data_message
from a2a.types import SendMessageRequest, TaskState

DEFAULT_SUPERVISOR_URL = "http://supervisor-a2a:4200"
TIMEOUT_S = 300.0  # los gates re-ejecutan build/tests: esto NO es sub-segundo


class SupervisorError(RuntimeError):
    """El Supervisor no entrego un veredicto; el mensaje trae el porque."""


class SupervisorCliente:
    def __init__(
        self,
        base_url: str | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._base = (base_url or os.environ.get("SUPERVISOR_URL", DEFAULT_SUPERVISOR_URL)).rstrip("/")
        self._http = http_client

    async def evaluar(self, resultado: dict) -> dict:
        """RESULTADO → message/send → veredicto (dict) del artifact del Supervisor."""
        http = self._http or httpx.AsyncClient(timeout=TIMEOUT_S)
        try:
            try:
                card = await A2ACardResolver(http, self._base).get_agent_card()
            except Exception as exc:  # card inalcanzable = supervisor caido
                raise SupervisorError(f"supervisor no disponible: {type(exc).__name__}") from exc

            cliente = ClientFactory(
                ClientConfig(httpx_client=http, streaming=False)
            ).create(card)
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
                raise SupervisorError("el supervisor no devolvio tarea")
            if tarea_final.status.state != TaskState.TASK_STATE_COMPLETED:
                detalle = ""
                if tarea_final.status.HasField("message") and tarea_final.status.message.parts:
                    detalle = tarea_final.status.message.parts[0].text
                raise SupervisorError(f"el supervisor no completo la revision: {detalle[:300]}")
            if not tarea_final.artifacts:
                raise SupervisorError("el supervisor completo sin artifact de veredicto")
            datas = get_data_parts(tarea_final.artifacts[0].parts)
            if not datas or not isinstance(datas[0], dict):
                raise SupervisorError("el artifact del supervisor no trae veredicto JSON")
            return datas[0]
        finally:
            if self._http is None:
                await http.aclose()
