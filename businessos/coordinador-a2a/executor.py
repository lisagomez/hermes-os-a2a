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
import time
from pathlib import Path
from typing import Awaitable, Callable

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

# Reintento del Planner ante fallos TRANSITORIOS del proveedor (429/5xx/conexion), 2026-07-25.
PLAN_TRANSITORIOS_MAX = 6   # reintentos antes de rendirse (fusible ante mala clasificacion)
BACKOFF_BASE_S = 60.0       # 1er reintento; luego exponencial (60, 120, 240…)
ESPERA_MAX_S = 3600.0       # techo de una sola pausa (ni un `resets_at` raro cuelga la corrida)


def heredar_modelo_pref(plan: dict, tarea: dict) -> dict:
    """Las sub-tareas sin `limites.modelo_pref` heredan el del padre.

    Es el FALLBACK del ruteo: desde 2026-07-27 el Planner real puede estampar
    modelo_pref por sub-tarea vía `rutear_por_dificultad` (claude_planner, mapa
    en env PLANNER_RUTEO_MODELOS); lo que el ruteo no cubra (mapa apagado,
    dificultad sin mapeo, MockPlanner) cae aquí y hereda el del padre — sin
    esta herencia caería al modelo default del CLI, no al que pidió la feature.
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


def heredar_clasificacion(plan: dict, tarea: dict) -> dict:
    """Las sub-tareas sin `clasificacion` propia heredan la del padre.

    Gemela de `heredar_modelo_pref` y por el mismo motivo: la clasificación
    (eje_dei + vendible, módulo act del ERP) se decide en la feature PADRE y el
    Planner no la emite — sin herencia explícita, cada sub-tarea caería al
    default 'operacion, no vendible' y la cosecha de activos perdería el gasto
    de las hijas. Una sub-tarea con clasificación propia se respeta.
    """
    clasif = tarea.get("clasificacion")
    if not clasif:
        return plan
    subs = [
        s if s.get("clasificacion") else {**s, "clasificacion": dict(clasif)}
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
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
        reloj: Callable[[], float] = time.time,
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
        # Inyectables para que los tests no duerman de verdad ni dependan del reloj real.
        self._sleep = sleep
        self._reloj = reloj

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

        plan = await self._planificar(tarea, updater)
        if plan is None:
            return  # ya se marco failed (planner definitivo o reintentos agotados)

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

    async def _planificar(self, tarea: dict, updater: TaskUpdater) -> dict | None:
        """Planifica con reintento ante fallos TRANSITORIOS del proveedor (429/5xx/conexion).

        El Planner llama al modelo via z.ai igual que el Ejecutor: un 429 (tope 5h) o una
        conexion caida NO deben tirar la feature entera. A diferencia del Ejecutor —que tiene
        un worker con cola— aqui la planificacion es INLINE, asi que el reintento es un bucle
        acotado con backoff (o pausa hasta `resets_at` si es un 429 duro). Como `execute` esta
        blindado con asyncio.shield, la pausa sobrevive a un cliente que se desconecta. Un fallo
        DEFINITIVO (plan invalido, error de codigo) o agotar los reintentos marca la tarea
        failed, como hoy. Devuelve el plan (con modelo_pref heredado) o None si ya fallo.
        """
        for intento in range(1, PLAN_TRANSITORIOS_MAX + 1):
            try:
                return heredar_clasificacion(
                    heredar_modelo_pref(await self._planner.plan(tarea), tarea), tarea
                )
            except PlannerError as exc:
                if not exc.transitorio:
                    await self._fallar(updater, f"planner: {exc}")
                    return None
                if intento >= PLAN_TRANSITORIOS_MAX:
                    await self._fallar(
                        updater, f"planner (transitorio, agotados {intento} reintentos): {exc}"
                    )
                    return None
                espera = self._espera_de(exc.reanudar_epoch, intento)
                print(
                    f"[coordinador] planner TRANSITORIO ({exc}) → reintento {intento}, "
                    f"pausa {espera:.0f}s",
                    flush=True,
                )
                await self._sleep(espera)
        return None  # inalcanzable (el bucle sale por return)

    def _espera_de(self, reanudar_epoch: int | None, intento: int) -> float:
        """Segundos a esperar: hasta `resets_at` si lo hay, si no backoff exponencial. Con techo."""
        if reanudar_epoch:
            return max(0.0, min(reanudar_epoch - self._reloj(), ESPERA_MAX_S))
        return min(BACKOFF_BASE_S * (2 ** (intento - 1)), ESPERA_MAX_S)

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
