"""executor.py — el AgentExecutor A2A del Coordinador del enjambre (PRP-007).

Fase 2 (esqueleto): TAREA padre (DataPart) → validar contrato → Planner (pluggable)
→ PLAN (DAG validado) → fila PADRE en `tareas` → artifact {plan} de vuelta al
caller (Hermes). El fan-out real al Ejecutor, la integración y la verificación
final llegan en las Fases 3 y 4, detrás de esta misma superficie A2A.

Fronteras (SPEC-trio §2, extendidas): el Coordinador descompone y coordina
máquinas; NO decide merge/deploy, NO se auto-aprueba. Si algo falla (entrada,
planner) la tarea A2A queda `failed` con razón clara.
"""
from __future__ import annotations

import os

from a2a.helpers import get_data_parts, new_data_part, new_task, new_text_part
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.tasks import TaskUpdater
from a2a.types import TaskState

from contrato import ContratoInvalido, validar_tarea
from estado import EstadoCoordinador
from planner import Planner, PlannerError, crear_planner

FAN_OUT_DEFAULT = 3


def limites_enjambre(tarea: dict) -> tuple[int, float | None]:
    """Extrae y valida `fan_out_max` (>=1) y `presupuesto_usd` (>=0, opcional).

    Gotcha A2A: protobuf Struct entrega TODO número JSON como float — un entero
    integral se normaliza, no se rechaza (igual que intentos_max en contrato.py).
    """
    lim = tarea.get("limites", {})
    fan_out = lim.get("fan_out_max", FAN_OUT_DEFAULT)
    if isinstance(fan_out, float) and fan_out.is_integer():
        fan_out = int(fan_out)
    if not (isinstance(fan_out, int) and not isinstance(fan_out, bool) and fan_out >= 1):
        raise ContratoInvalido(
            "limites.fan_out_max: entero >= 1 (tope de concurrencia del enjambre; "
            "sin tope es una bomba de recursos y de costo)"
        )
    presupuesto = lim.get("presupuesto_usd")
    if presupuesto is not None:
        if isinstance(presupuesto, bool) or not isinstance(presupuesto, (int, float)) or presupuesto < 0:
            raise ContratoInvalido("limites.presupuesto_usd: numero >= 0 (o ausente)")
        presupuesto = float(presupuesto)
    return fan_out, presupuesto


class CoordinadorA2A(AgentExecutor):
    """Todas las dependencias inyectables (tests con dobles, cero red/tokens)."""

    def __init__(
        self,
        planner: Planner | None = None,
        estado: EstadoCoordinador | None = None,
    ) -> None:
        self._planner = planner or crear_planner(os.environ.get("COORDINADOR_PLANNER", "mock"))
        self._estado = estado or EstadoCoordinador()

    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        # Gotcha SDK v1: el Task va encolado ANTES del primer status update.
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

        datas = get_data_parts(context.message.parts) if context.message else []
        try:
            if len(datas) != 1:
                raise ContratoInvalido("envia UNA tarea padre por mensaje (un DataPart)")
            tarea = validar_tarea(datas[0])
            fan_out_max, presupuesto = limites_enjambre(tarea)
        except ContratoInvalido as exc:
            await self._fallar(updater, f"tarea padre invalida: {exc}")
            return

        try:
            plan = await self._planner.plan(tarea)
        except PlannerError as exc:
            await self._fallar(updater, f"planner: {exc}")
            return

        await self._estado.registrar_padre(tarea, plan, fan_out_max, presupuesto)

        # Fase 2: entregamos el plan. El fan-out real es Fase 3.
        await updater.add_artifact(
            [new_data_part({"plan": plan})],
            name="plan-enjambre",
        )
        await updater.complete()

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        await updater.cancel()

    @staticmethod
    async def _fallar(updater: TaskUpdater, razon: str) -> None:
        await updater.failed(updater.new_agent_message(parts=[new_text_part(razon)]))
