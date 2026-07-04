"""ejecutor_cliente.py — cliente A2A del Coordinador hacia el Ejecutor (PRP-007).

El fan-out del enjambre son N llamadas A2A concurrentes al MISMO ejecutor-a2a
(que ya aísla por worktree/<task_id>). Este cliente manda UNA sub-tarea y recibe
de vuelta el artifact del Ejecutor {resultado, veredicto} — el mismo que el
Ejecutor ya entrega hoy (executor.py del ejecutor-a2a). Patrón idéntico a
supervisor_cliente.py del Ejecutor: descubre por Agent Card, usa message/send.
Inyectable en tests (httpx.ASGITransport o un doble) — cero red real.
"""
from __future__ import annotations

import os

import httpx

from a2a.client import A2ACardResolver, ClientConfig, ClientFactory
from a2a.helpers import get_data_parts, new_data_message
from a2a.types import SendMessageRequest, TaskState

DEFAULT_EJECUTOR_URL = "http://ejecutor-a2a:4100"
TIMEOUT_S = 600.0  # el Ejecutor corre el motor + los gates del Supervisor: NO es rápido


class EjecutorError(RuntimeError):
    """El Ejecutor no entregó un resultado+veredicto; el mensaje trae el porqué."""


class EjecutorCliente:
    def __init__(
        self,
        base_url: str | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._base = (base_url or os.environ.get("EJECUTOR_URL", DEFAULT_EJECUTOR_URL)).rstrip("/")
        self._http = http_client

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
            if not datas or not isinstance(datas[0], dict) or "veredicto" not in datas[0]:
                raise EjecutorError("el artifact del ejecutor no trae {resultado, veredicto}")
            return datas[0]
        finally:
            if self._http is None:
                await http.aclose()
