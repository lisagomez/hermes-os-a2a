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

import chequeos_adquisicion  # noqa: F401 — registra sus chequeos en gates.CHEQUEOS
from contrato import ContratoInvalido, validar_resultado
from gates import Gate, cargar_configs, correr_gates
from veredicto import emitir_veredicto

DEFAULT_WORKSPACE = "/workspace"
# Fase 9: el default es el DIRECTORIO de reglas (multi-departamento). Un env
# SUPERVISOR_REGLAS apuntando a un archivo sigue funcionando (un solo dept).
DEFAULT_REGLAS = Path(__file__).resolve().parent / "reglas"


class SupervisorA2A(AgentExecutor):
    """La config se carga (y valida) al CONSTRUIR: config invalida = no arranca."""

    def __init__(
        self,
        gates: list[Gate] | None = None,
        workspace_root: Path | None = None,
        reglas_path: Path | None = None,
    ) -> None:
        # gates inyectados (tests): aplican a cualquier departamento.
        self._gates_inyectados = gates
        self._gates_por_dep = None if gates is not None else cargar_configs(
            reglas_path or Path(os.environ.get("SUPERVISOR_REGLAS", DEFAULT_REGLAS))
        )
        self._workspace_root = workspace_root or Path(
            os.environ.get("TRIO_WORKSPACE", DEFAULT_WORKSPACE)
        )

    def _gates_de(self, departamento: str) -> list[Gate] | None:
        if self._gates_inyectados is not None:
            return self._gates_inyectados
        return self._gates_por_dep.get(departamento)

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

        gates_dep = self._gates_de(resultado["departamento"])
        if gates_dep is None:
            # Error de DESPLIEGUE (falta reglas/<dep>.toml), no un veredicto:
            # un juicio sin reglas cargadas seria un sello de goma.
            await updater.failed(
                updater.new_agent_message(parts=[new_text_part(
                    f"sin reglas cargadas para departamento "
                    f"{resultado['departamento']!r} (falta reglas/<dep>.toml)"
                )])
            )
            return

        # El contrato garantiza worktree relativo y sin '..' — se ancla al volumen.
        worktree = self._workspace_root / resultado["worktree"]
        # Los gates re-ejecutan builds/tests: fuera del event loop.
        resultados = await asyncio.to_thread(correr_gates, gates_dep, worktree)
        veredicto = emitir_veredicto(resultado["task_id"], resultados)

        await updater.add_artifact([new_data_part(veredicto)], name="veredicto")
        await updater.complete()

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        await updater.cancel()
