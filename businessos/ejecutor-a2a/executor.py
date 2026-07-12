"""executor.py — el AgentExecutor A2A del Ejecutor del trio (PRP-006, Fase 2).

Flujo: TAREA (DataPart) → validar contrato → worktree/<task_id> (nunca main) →
engine (pluggable) → RESULTADO (diff real desde git, no testimonio) → Supervisor
via A2A → VEREDICTO → artifact {resultado, veredicto} de vuelta al caller (Hermes).

Fronteras (SPEC-trio §2): no decide QUE hacer, no se auto-aprueba. Si algo falla
(entrada, workspace, motor, supervisor) la tarea A2A es `failed` con razon clara.

Durabilidad (2026-07-12, 1a corrida real): la corrida va BLINDADA contra la
desconexion del cliente (`asyncio.shield`). Un cliente impaciente cancelaba la
peticion HTTP y con ella el proceso del motor a media faena: minutos de trabajo y
tokens quemados a la basura, sin veredicto y sin rastro. El trabajo del servidor lo
termina el servidor; el cliente solo decide si sigue escuchando.
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
        """Blinda la corrida: si el cliente se va, el trabajo del servidor SIGUE."""
        corrida = asyncio.ensure_future(self._ejecutar(context, event_queue))
        try:
            await asyncio.shield(corrida)
        except asyncio.CancelledError:
            # El caller cerro la conexion (timeout corto, Ctrl-C, red). La corrida
            # sigue viva: terminara el motor, pedira veredicto y dejara el estado
            # final en `tareas` — de donde el cliente puede recuperarlo despues.
            corrida.add_done_callback(_reportar_huerfana)
            print(
                f"[ejecutor] cliente desconectado; la tarea {context.task_id} sigue "
                "corriendo y dejara su estado final en `tareas`",
                flush=True,
            )
            raise

    async def _ejecutar(self, context: RequestContext, event_queue: EventQueue) -> None:
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
        # El log LOCAL va primero: la razon viaja por A2A, y si el cliente ya se fue
        # (o el fallo es justo el transporte) se pierde. Sin esta linea cada fallo es
        # una autopsia a ciegas — la de la 1a corrida real costo media hora.
        print(f"[ejecutor] FALLO {updater.task_id}: {razon}", flush=True)
        await updater.failed(updater.new_agent_message(parts=[new_text_part(razon)]))


def _reportar_huerfana(corrida: asyncio.Future) -> None:
    """Cierra el ciclo de una corrida cuyo cliente ya no escucha (evita el
    'exception was never retrieved' y deja el desenlace en el log)."""
    if corrida.cancelled():
        print("[ejecutor] corrida huerfana CANCELADA", flush=True)
        return
    exc = corrida.exception()
    # Al final de una corrida huerfana los eventos van a una cola que ya nadie lee:
    # que el encolado falle es esperable y NO invalida el trabajo (motor, veredicto y
    # estado en `tareas` ya ocurrieron).
    print(
        f"[ejecutor] corrida huerfana terminada: {type(exc).__name__}: {exc}"
        if exc
        else "[ejecutor] corrida huerfana terminada ok",
        flush=True,
    )
