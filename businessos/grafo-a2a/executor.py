"""executor.py — puente determinista al grafo (PRP-005, Fase 2).

El executor NO es un LLM: valida la entrada, llama a POST {GRAFO_URL}/evaluaciones
y devuelve la EvaluacionResponse INTEGRA como artifact (regla de oro: disclaimer
y fuentes viajan intactos; prohibido resumir). Entrada invalida o grafo caido ->
tarea `failed` con razon clara; nunca un veredicto inventado.

Opacidad por diseno: este modulo solo conoce POST /evaluaciones. Los demas
endpoints del grafo no se rutean ni se mencionan.
"""
from __future__ import annotations

import os
from typing import Any

import httpx

from a2a.helpers import get_data_parts, get_text_parts, new_data_part, new_task, new_text_part
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.tasks import TaskUpdater
from a2a.types import TaskState

DEFAULT_GRAFO_URL = "http://grafo:3000"
TIMEOUT_S = 15.0


class EntradaInvalida(ValueError):
    """La entrada del mensaje A2A no forma una solicitud de evaluacion."""


def solicitud_desde_mensaje(message: Any) -> dict:
    """Parts del mensaje -> EvaluacionRequest (dict), sin interpretar con IA.

    - DataPart (uno): la solicitud estructurada tal cual ({contexto?, conceptos}).
    - TextPart(s): texto libre -> un concepto por linea, contexto default del
      grafo (MX/fiscal); el fail-safe `dudoso` cubre lo no clasificable.
    """
    datas = get_data_parts(message.parts)
    if len(datas) > 1:
        raise EntradaInvalida("envia UNA solicitud por mensaje (un solo DataPart)")
    if datas:
        solicitud = datas[0]
        if not isinstance(solicitud, dict) or not solicitud.get("conceptos"):
            raise EntradaInvalida(
                'el DataPart debe ser {"contexto"?: {...}, "conceptos": [{"descripcion": ...}]}'
            )
        return solicitud

    lineas = [
        linea.strip()
        for texto in get_text_parts(message.parts)
        for linea in texto.splitlines()
        if linea.strip()
    ]
    if not lineas:
        raise EntradaInvalida(
            "mensaje vacio: envia un DataPart JSON o texto con un concepto por linea"
        )
    return {"conceptos": [{"descripcion": linea} for linea in lineas]}


class GrafoExecutor(AgentExecutor):
    """Puente A2A -> grafo. `http_client` inyectable para tests (MockTransport)."""

    def __init__(
        self,
        grafo_url: str | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._grafo_url = (grafo_url or os.environ.get("GRAFO_URL", DEFAULT_GRAFO_URL)).rstrip("/")
        self._http = http_client

    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        # El protocolo exige encolar el Task ANTES de cualquier status update
        # (gotcha del SDK v1; los tutoriales v0.2 no lo muestran).
        if context.current_task is None:
            await event_queue.enqueue_event(
                new_task(
                    context.task_id,
                    context.context_id,
                    TaskState.TASK_STATE_SUBMITTED,
                    history=[context.message] if context.message else None,
                )
            )
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        await updater.start_work()

        try:
            solicitud = solicitud_desde_mensaje(context.message)
        except EntradaInvalida as exc:
            await self._fallar(updater, f"entrada invalida: {exc}")
            return

        try:
            respuesta = await self._evaluar(solicitud)
        except httpx.HTTPError as exc:
            await self._fallar(updater, f"grafo no disponible: {type(exc).__name__}")
            return

        if respuesta.status_code != 200:
            detalle = self._detalle_error(respuesta)
            await self._fallar(
                updater, f"el grafo rechazo la solicitud ({respuesta.status_code}): {detalle}"
            )
            return

        evaluacion = respuesta.json()
        # Regla de oro: jamas entregar una evaluacion sin disclaimer y fuentes.
        if not evaluacion.get("disclaimer") or "fuentes" not in evaluacion:
            await self._fallar(updater, "respuesta del grafo sin disclaimer/fuentes: no se entrega")
            return

        await updater.add_artifact([new_data_part(evaluacion)], name="evaluacion")
        await updater.complete()

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        await updater.cancel()

    async def _evaluar(self, solicitud: dict) -> httpx.Response:
        url = f"{self._grafo_url}/evaluaciones"
        if self._http is not None:
            return await self._http.post(url, json=solicitud, timeout=TIMEOUT_S)
        async with httpx.AsyncClient() as client:
            return await client.post(url, json=solicitud, timeout=TIMEOUT_S)

    @staticmethod
    def _detalle_error(respuesta: httpx.Response) -> str:
        try:
            return str(respuesta.json().get("detail", respuesta.text))[:300]
        except ValueError:
            return respuesta.text[:300]

    @staticmethod
    async def _fallar(updater: TaskUpdater, razon: str) -> None:
        await updater.failed(updater.new_agent_message(parts=[new_text_part(razon)]))
