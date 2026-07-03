"""executor.py — puente determinista al grafo (PRP-005).

El executor NO es un LLM: valida la entrada, llama a POST {GRAFO_URL}/evaluaciones
y devuelve la EvaluacionResponse INTEGRA como artifact (regla de oro: disclaimer
y fuentes viajan intactos). Entrada invalida o grafo caido -> tarea `failed` con
razon clara; nunca un veredicto inventado.

Fase 1 del blueprint: stub que falla toda tarea (el puente real es Fase 2).
"""
from __future__ import annotations

from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.tasks import TaskUpdater


class GrafoExecutor(AgentExecutor):
    """Puente A2A -> grafo. Solo conoce POST /evaluaciones (opacidad por diseno)."""

    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        await updater.failed(
            updater.new_agent_message(
                parts=[],
            )
        )

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        await updater.cancel()
