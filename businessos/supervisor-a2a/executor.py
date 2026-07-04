"""executor.py — el AgentExecutor A2A del Supervisor del trio (PRP-006, Fase 3).

Flujo: RESULTADO (DataPart) → validar contrato → localizar worktree en el volumen
compartido → re-ejecutar los gates de la config versionada → VEREDICTO validado
como artifact. El worktree ausente NO es un fallo A2A: es un veredicto rechazado
(gates no ejecutables) — juicio, no excusa.

Frontera (SPEC-trio §2): juzga puro y stateless. No construye, no escribe
`tareas` (el Ejecutor es EL escritor de confianza: un solo escritor por fila).
"""
from __future__ import annotations

import asyncio
import os
from pathlib import Path

from a2a.helpers import get_data_parts, new_data_part, new_task, new_text_part
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.tasks import TaskUpdater
from a2a.types import TaskState

from contrato import ContratoInvalido, validar_resultado
from gates import Gate, cargar_config, correr_gates
from veredicto import emitir_veredicto

DEFAULT_WORKSPACE = "/workspace"
DEFAULT_REGLAS = Path(__file__).resolve().parent / "reglas" / "software.toml"


class SupervisorA2A(AgentExecutor):
    """La config se carga (y valida) al CONSTRUIR: config invalida = no arranca."""

    def __init__(
        self,
        gates: list[Gate] | None = None,
        workspace_root: Path | None = None,
        reglas_path: Path | None = None,
    ) -> None:
        self._gates = gates if gates is not None else cargar_config(
            reglas_path or Path(os.environ.get("SUPERVISOR_REGLAS", DEFAULT_REGLAS))
        )
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
                raise ContratoInvalido("envia UN resultado por mensaje (un DataPart)")
            resultado = validar_resultado(datas[0])
        except ContratoInvalido as exc:
            await updater.failed(
                updater.new_agent_message(parts=[new_text_part(f"resultado invalido: {exc}")])
            )
            return

        # El contrato garantiza worktree relativo y sin '..' — se ancla al volumen.
        worktree = self._workspace_root / resultado["worktree"]
        # Los gates re-ejecutan builds/tests: fuera del event loop.
        resultados = await asyncio.to_thread(correr_gates, self._gates, worktree)
        veredicto = emitir_veredicto(resultado["task_id"], resultados)

        await updater.add_artifact([new_data_part(veredicto)], name="veredicto")
        await updater.complete()

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        await updater.cancel()
