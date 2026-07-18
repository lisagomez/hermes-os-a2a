"""executor.py — el AgentExecutor A2A del Coordinador del enjambre (PRP-007).

Flujo completo: TAREA padre (DataPart) → validar contrato → Planner (pluggable) →
PLAN (DAG) → fila PADRE → scheduler (fan-out acotado + presupuesto, Fase 3) →
integración de las ramas aprobadas + verificación FINAL del Supervisor sobre el
todo (Fase 4) → artifact de vuelta al caller (Hermes).

Fronteras (SPEC-trio §2, extendidas): el Coordinador descompone y coordina
máquinas; NO decide merge/deploy, NO se auto-aprueba, NO resuelve conflictos con un
modelo. El gate final rojo o un conflicto de integración = escalada, no "aprobado
por partes". Si algo falla (entrada, planner, supervisor) la tarea A2A queda
`failed` con razón clara.
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

import enjambre
import integracion
from contrato import ContratoInvalido, validar_tarea, validar_veredicto
from ejecutor_cliente import EjecutorCliente
from estado import EstadoCoordinador
from integracion import IntegracionError
from planner import Planner, PlannerError, crear_planner
from presupuesto import Presupuesto
from supervisor_cliente import SupervisorCliente, SupervisorError

FAN_OUT_DEFAULT = 3
DEFAULT_WORKSPACE = "/workspace"


def heredar_modelo_pref(plan: dict, tarea: dict) -> dict:
    """Las sub-tareas sin `limites.modelo_pref` heredan el del padre.

    El ruteo por tarea de la dueña (GLM-5.2 simple, Sonnet media/alta) se decide
    en la feature PADRE; el Planner no emite límites, así que sin esta herencia
    cada sub-tarea caería al modelo default del CLI, no al que pidió la feature.
    Una sub-tarea con su propio modelo_pref se respeta.
    """
    pref = tarea.get("limites", {}).get("modelo_pref")
    if not pref:
        return plan
    subs = [
        s if s.get("limites", {}).get("modelo_pref")
        else {**s, "limites": {**s.get("limites", {}), "modelo_pref": pref}}
        for s in plan["sub_tareas"]
    ]
    return {**plan, "sub_tareas": subs}


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
        ejecutor=None,
        presupuesto=None,
        supervisor=None,
        integrar=None,
        repo: Path | None = None,
        workspace_root: Path | None = None,
    ) -> None:
        self._planner = planner or crear_planner(os.environ.get("COORDINADOR_PLANNER", "mock"))
        self._estado = estado or EstadoCoordinador()
        self._ejecutor = ejecutor or EjecutorCliente()
        self._presupuesto = presupuesto or Presupuesto()
        self._supervisor = supervisor or SupervisorCliente()
        self._integrar = integrar or integracion.integrar
        self._repo = repo or Path(os.environ.get("TRIO_REPO", "/repo"))
        self._workspace_root = workspace_root or Path(
            os.environ.get("TRIO_WORKSPACE", DEFAULT_WORKSPACE)
        )

    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        """Blinda la corrida: si el cliente se va, el enjambre SIGUE.

        Misma leccion que el Ejecutor (PR #37), y aqui pesa mas: una corrida de enjambre es
        la MAS LARGA del sistema (N sub-tareas encoladas + integracion + verificacion final).
        Un cliente impaciente no puede tirar horas de trabajo. Con la cola, ademas, las
        sub-tareas ya viven en `tareas`: aunque esto muriera, el worker las terminaria — lo
        que se perderia es la integracion. Razon de mas para no morir.
        """
        corrida = asyncio.ensure_future(self._ejecutar(context, event_queue))
        try:
            await asyncio.shield(corrida)
        except asyncio.CancelledError:
            corrida.add_done_callback(
                lambda f: print(
                    f"[coordinador] corrida huerfana terminada: "
                    f"{f.exception() if not f.cancelled() else 'CANCELADA'}",
                    flush=True,
                )
            )
            print(
                f"[coordinador] cliente desconectado; el enjambre {context.task_id} sigue "
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
                raise ContratoInvalido("envia UNA tarea padre por mensaje (un DataPart)")
            tarea = validar_tarea(datas[0])
            fan_out_max, presupuesto = limites_enjambre(tarea)
        except ContratoInvalido as exc:
            await self._fallar(updater, f"tarea padre invalida: {exc}")
            return

        try:
            plan = heredar_modelo_pref(await self._planner.plan(tarea), tarea)
        except PlannerError as exc:
            await self._fallar(updater, f"planner: {exc}")
            return

        await self._estado.registrar_padre(tarea, plan, fan_out_max, presupuesto)
        task_id = tarea["task_id"]

        # Fase 3: reparte el DAG al Ejecutor (fan-out acotado + presupuesto).
        resumen = await enjambre.correr(
            plan, self._ejecutor, self._presupuesto, fan_out_max, presupuesto, task_id
        )
        if resumen["estado"] != "aprobado":
            await self._estado.transicionar(task_id, "escalada")
            await self._entregar(updater, {"plan": plan, "enjambre": resumen})
            return

        # Fase 4: integrar las ramas aprobadas (git apply topológico). Un conflicto se
        # escala con el hallazgo — ningún modelo lo resuelve en v1.
        try:
            integrado = self._integrar(
                self._repo, self._workspace_root, task_id, resumen["orden"], resumen["sub_resultados"]
            )
        except IntegracionError as exc:
            await self._estado.transicionar(task_id, "escalada")
            await self._entregar(updater, {
                "plan": plan, "enjambre": resumen,
                "integracion": {"estado": "conflicto", "hallazgos": exc.hallazgos},
            })
            return

        await self._estado.transicionar(task_id, "en_revision", resultado=integrado)

        # Verificación FINAL del Supervisor sobre el TODO integrado (re-gatea de cero).
        try:
            veredicto_final = validar_veredicto(await self._supervisor.evaluar(integrado))
        except SupervisorError as exc:
            await self._fallar(updater, f"supervisor final: {exc}")
            return
        except ContratoInvalido as exc:
            await self._fallar(updater, f"veredicto final invalido: {exc}")
            return

        # Gate final rojo = escalada (no "aprobado por partes"). Verde = listo para el
        # gate HUMANO de merge, que propone Hermes — el Coordinador nunca mergea.
        estado_final = "aprobada" if veredicto_final["veredicto"] == "aprobado" else "rechazada"
        await self._estado.transicionar(task_id, estado_final, veredicto=veredicto_final)
        await self._entregar(updater, {
            "plan": plan, "enjambre": resumen,
            "resultado_integrado": integrado, "veredicto_final": veredicto_final,
        })

    @staticmethod
    async def _entregar(updater: TaskUpdater, datos: dict) -> None:
        await updater.add_artifact([new_data_part(datos)], name="enjambre")
        await updater.complete()

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        await updater.cancel()

    @staticmethod
    async def _fallar(updater: TaskUpdater, razon: str) -> None:
        await updater.failed(updater.new_agent_message(parts=[new_text_part(razon)]))
