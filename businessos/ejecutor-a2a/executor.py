"""executor.py — el AgentExecutor A2A del Ejecutor del trio (PRP-006, Fase 2).

Flujo: TAREA (DataPart) → validar contrato → worktree/<task_id> (nunca main) →
engine (pluggable) → RESULTADO (diff real desde git, no testimonio) → Supervisor
via A2A → VEREDICTO → artifact {resultado, veredicto} de vuelta al caller (Hermes).

Fronteras (SPEC-trio §2): no decide QUE hacer, no se auto-aprueba. Si algo falla
(entrada, workspace, motor, supervisor) la tarea A2A es `failed` con razon clara.
"""
from __future__ import annotations

import os
from pathlib import Path

from a2a.helpers import get_data_parts, new_data_part, new_task, new_text_part
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.tasks import TaskUpdater
from a2a.types import TaskState

import workspace as ws
from contrato import ContratoInvalido, validar_resultado, validar_tarea, validar_veredicto
from engine import Engine, EngineError, crear_engine
from estado import EstadoTareas
from supervisor_cliente import SupervisorCliente, SupervisorError

DEFAULT_WORKSPACE = "/workspace"


class EjecutorA2A(AgentExecutor):
    """Todas las dependencias son inyectables (tests con dobles, cero red/tokens)."""

    def __init__(
        self,
        engine: Engine | None = None,
        supervisor: SupervisorCliente | None = None,
        estado: EstadoTareas | None = None,
        repo: Path | None = None,
        workspace_root: Path | None = None,
    ) -> None:
        self._engine = engine or crear_engine(os.environ.get("EJECUTOR_ENGINE", "mock"))
        self._supervisor = supervisor or SupervisorCliente()
        self._estado = estado or EstadoTareas()
        self._repo = repo or Path(os.environ.get("TRIO_REPO", "/repo"))
        self._workspace_root = workspace_root or Path(
            os.environ.get("TRIO_WORKSPACE", DEFAULT_WORKSPACE)
        )

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
                raise ContratoInvalido("envia UNA tarea por mensaje (un DataPart)")
            tarea = validar_tarea(datas[0])
        except ContratoInvalido as exc:
            await self._fallar(updater, f"tarea invalida: {exc}")
            return

        await self._estado.registrar_ejecucion(tarea)

        try:
            worktree = ws.preparar(self._repo, self._workspace_root, tarea["task_id"])
        except Exception as exc:  # WorkspaceError o fallo git inesperado
            await self._fallar(updater, f"workspace: {exc}")
            await self._estado.transicionar(tarea["task_id"], "escalada")
            return

        try:
            salida_motor = await self._engine.run(tarea, worktree)
        except EngineError as exc:
            await self._fallar(updater, f"motor: {exc}")
            await self._estado.transicionar(tarea["task_id"], "escalada")
            return

        try:
            resultado = validar_resultado(
                {
                    "task_id": tarea["task_id"],
                    "departamento": tarea["departamento"],  # el Supervisor rutea reglas por esto
                    "worktree": f"worktree/{tarea['task_id']}",
                    "diff": ws.diff_de(worktree),
                    "archivos": ws.archivos_cambiados(worktree),
                    "artefactos": salida_motor.get("artefactos", {}),
                    "notas": salida_motor.get("notas", ""),
                }
            )
        except (ContratoInvalido, ws.WorkspaceError) as exc:
            await self._fallar(updater, f"resultado invalido: {exc}")
            await self._estado.transicionar(tarea["task_id"], "escalada")
            return

        await self._estado.transicionar(tarea["task_id"], "en_revision", resultado=resultado)

        try:
            veredicto = validar_veredicto(await self._supervisor.evaluar(resultado))
        except SupervisorError as exc:
            await self._fallar(updater, f"supervisor: {exc}")
            return
        except ContratoInvalido as exc:
            await self._fallar(updater, f"veredicto del supervisor invalido: {exc}")
            return

        estado_final = "aprobada" if veredicto["veredicto"] == "aprobado" else "rechazada"
        await self._estado.transicionar(tarea["task_id"], estado_final, veredicto=veredicto)

        await updater.add_artifact(
            [new_data_part({"resultado": resultado, "veredicto": veredicto})],
            name="resultado-revisado",
        )
        await updater.complete()

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        await updater.cancel()

    @staticmethod
    async def _fallar(updater: TaskUpdater, razon: str) -> None:
        await updater.failed(updater.new_agent_message(parts=[new_text_part(razon)]))
