"""Tests del CoordinadorA2A (Fase 7, esqueleto): plan + fila padre, con dobles.

Cubren la validacion de la fase: tarea padre valida → Planner (mock) → plan en el
artifact + fila padre registrada; y TODO error (entrada, limites del enjambre,
planner) → tarea A2A failed con razon clara. Fan-out real = Fase 3.
"""
from __future__ import annotations

import asyncio

import pytest

from a2a.helpers import get_data_parts, new_data_message, new_text_message
from a2a.server.agent_execution import RequestContext
from a2a.server.context import ServerCallContext
from a2a.types import (
    SendMessageRequest,
    Task,
    TaskArtifactUpdateEvent,
    TaskState,
    TaskStatusUpdateEvent,
)

from contrato import ContratoInvalido
from executor import CoordinadorA2A, limites_enjambre
from integracion import IntegracionError
from planner import MockPlanner, PlannerError
from supervisor_cliente import SupervisorError


# ---------- dobles ----------

class ColaEspia:
    def __init__(self) -> None:
        self.eventos: list = []

    async def enqueue_event(self, evento) -> None:
        self.eventos.append(evento)


class EstadoEspia:
    """Doble de EstadoCoordinador: registra la fila padre sin tocar Supabase."""

    def __init__(self) -> None:
        self.padres: list[dict] = []
        self.transiciones: list[tuple[str, str]] = []

    async def registrar_padre(self, tarea, plan, fan_out_max, presupuesto_usd) -> None:
        self.padres.append({
            "task_id": tarea["task_id"], "plan": plan,
            "fan_out_max": fan_out_max, "presupuesto_usd": presupuesto_usd,
        })

    async def transicionar(self, task_id, estado, **campos) -> None:
        self.transiciones.append((task_id, estado))


class PlannerFake:
    def __init__(self, error: Exception | None = None) -> None:
        self._error = error

    async def plan(self, tarea) -> dict:
        if self._error:
            raise self._error
        return {"sub_tareas": [], "orden": [], "avisos": []}


def _veredicto(tid, aprobado=True):
    if aprobado:
        return {"task_id": tid, "veredicto": "aprobado",
                "gates": [{"regla": "build", "estado": "paso", "evidencia": "ok"}], "hallazgos": []}
    return {"task_id": tid, "veredicto": "rechazado",
            "gates": [{"regla": "tests", "estado": "fallo", "evidencia": f"{tid} fallo"}],
            "hallazgos": [{"regla": "tests", "evidencia": f"{tid} fallo", "archivo": "x.ts"}]}


class EjecutorFake:
    """Doble del cliente A2A al Ejecutor: aprueba todo por defecto."""

    def __init__(self, aprobar: bool = True) -> None:
        self._aprobar = aprobar
        self.llamadas: list[str] = []

    async def ejecutar(self, sub_tarea) -> dict:
        tid = sub_tarea["task_id"]
        self.llamadas.append(tid)
        return {"resultado": {"task_id": tid, "worktree": f"worktree/{tid}", "diff": "",
                              "archivos": [], "artefactos": {}, "notas": ""},
                "veredicto": _veredicto(tid, self._aprobar)}


class PresupuestoFake:
    def __init__(self, gasto: float = 0.0) -> None:
        self._gasto = gasto

    async def gasto_acumulado(self, task_ids) -> float:
        return self._gasto


class IntegrarFake:
    """Doble de integracion.integrar (sync callable): resultado integrado o conflicto."""

    def __init__(self, error: Exception | None = None, resultado: dict | None = None) -> None:
        self._error = error
        self._resultado = resultado
        self.llamadas = 0

    def __call__(self, repo, workspace_root, parent_id, orden, sub_resultados) -> dict:
        self.llamadas += 1
        if self._error:
            raise self._error
        return self._resultado or {
            "task_id": parent_id, "worktree": f"worktree/{parent_id}",
            "diff": "--- integrado ---", "archivos": ["app/x.ts"],
            "artefactos": {"engine": "enjambre"}, "notas": "integrado",
        }


class SupervisorFinalFake:
    """Doble del cliente A2A al Supervisor para el gate FINAL del todo integrado."""

    def __init__(self, aprobado: bool = True, error: Exception | None = None) -> None:
        self._aprobado = aprobado
        self._error = error
        self.recibidos: list[dict] = []

    async def evaluar(self, resultado) -> dict:
        self.recibidos.append(resultado)
        if self._error:
            raise self._error
        return _veredicto(resultado["task_id"], self._aprobado)


# ---------- helpers ----------

PLAN_MOCK = {"sub_tareas": [
    {"task_id": "auth", "objetivo": "auth google", "criterios_aceptacion": ["build verde"],
     "alcance": ["app/auth/**"]},
    {"task_id": "emails", "objetivo": "emails bienvenida", "criterios_aceptacion": ["build verde"],
     "alcance": ["app/emails/**"]},
    {"task_id": "perfil", "objetivo": "perfil editable", "criterios_aceptacion": ["build verde"],
     "depende_de": ["auth"], "alcance": ["app/perfil/**"]},
]}


def tarea_padre(task_id="cuentas-0007", *, mock_plan=PLAN_MOCK, limites=None, **extra) -> dict:
    base = {
        "task_id": task_id,
        "objetivo": "modulo de cuentas completo",
        "contexto": {"repo": "recetas", "mock_plan": mock_plan},
        "criterios_aceptacion": ["build verde en el todo integrado"],
        "limites": limites if limites is not None else {"fan_out_max": 3, "presupuesto_usd": 5.0},
    }
    base.update(extra)
    return base


def contexto_con(mensaje) -> RequestContext:
    return RequestContext(
        ServerCallContext(),
        request=SendMessageRequest(message=mensaje),
        task_id="tarea-a2a-1",
        context_id="ctx-1",
    )


def coordinador_con(planner=None, estado=None, ejecutor=None, presupuesto=None,
                    supervisor=None, integrar=None):
    estado = estado or EstadoEspia()
    coord = CoordinadorA2A(
        planner=planner or MockPlanner(),
        estado=estado,
        ejecutor=ejecutor or EjecutorFake(),
        presupuesto=presupuesto or PresupuestoFake(),
        supervisor=supervisor or SupervisorFinalFake(aprobado=True),
        integrar=integrar or IntegrarFake(),
    )
    return coord, estado


def ejecutar(coord, mensaje) -> ColaEspia:
    cola = ColaEspia()
    asyncio.run(coord.execute(contexto_con(mensaje), cola))
    return cola


def estados(cola: ColaEspia) -> list[int]:
    return [e.status.state for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)]


def artifacts(cola: ColaEspia) -> list:
    return [e.artifact for e in cola.eventos if isinstance(e, TaskArtifactUpdateEvent)]


def razon_de_fallo(cola: ColaEspia) -> str:
    fallos = [e for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)
              and e.status.state == TaskState.TASK_STATE_FAILED]
    assert fallos, "no hubo status FAILED"
    return fallos[-1].status.message.parts[0].text


# ---------- limites del enjambre (unidad) ----------

def test_limites_default_y_normalizacion_float():
    assert limites_enjambre({"limites": {}}) == (3, None)
    # Gotcha A2A: protobuf Struct entrega numeros como float.
    assert limites_enjambre({"limites": {"fan_out_max": 2.0, "presupuesto_usd": 4}}) == (2, 4.0)


@pytest.mark.parametrize("lim,frag", [
    ({"fan_out_max": 0}, "fan_out_max"),
    ({"fan_out_max": 2.5}, "fan_out_max"),
    ({"fan_out_max": True}, "fan_out_max"),
    ({"presupuesto_usd": -1}, "presupuesto_usd"),
])
def test_limites_invalidos(lim, frag):
    with pytest.raises(ContratoInvalido, match=frag):
        limites_enjambre({"limites": lim})


# ---------- happy path ----------

def test_flujo_completo_planifica_reparte_integra_verifica_y_aprueba():
    ejecutor = EjecutorFake(aprobar=True)
    integrar = IntegrarFake()
    supervisor = SupervisorFinalFake(aprobado=True)
    coord, estado = coordinador_con(ejecutor=ejecutor, integrar=integrar, supervisor=supervisor)
    cola = ejecutar(coord, new_data_message(tarea_padre()))

    # Gotcha SDK v1: el Task va encolado ANTES del primer status update.
    assert isinstance(cola.eventos[0], Task)
    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED

    [artifact] = artifacts(cola)
    assert artifact.name == "enjambre"
    [entregado] = get_data_parts(artifact.parts)
    assert [s["task_id"] for s in entregado["plan"]["sub_tareas"]] == ["auth", "emails", "perfil"]

    # Se repartieron las 3 sub-tareas y todas pasaron su gate por parte.
    assert set(ejecutor.llamadas) == {"auth", "emails", "perfil"}
    assert entregado["enjambre"]["estado"] == "aprobado"

    # Se integró UNA vez y el Supervisor verificó el TODO integrado (no las partes).
    assert integrar.llamadas == 1
    assert supervisor.recibidos[0]["task_id"] == "cuentas-0007"
    assert entregado["resultado_integrado"]["task_id"] == "cuentas-0007"
    assert entregado["veredicto_final"]["veredicto"] == "aprobado"

    # Trazabilidad del padre: en_revision (tras integrar) → aprobada (gate final verde).
    padre = estado.padres[0]
    assert padre["task_id"] == "cuentas-0007" and padre["fan_out_max"] == 3
    assert estado.transiciones == [("cuentas-0007", "en_revision"), ("cuentas-0007", "aprobada")]


def test_sub_tarea_que_no_pasa_escala_el_padre_sin_integrar():
    """El enjambre escala (una sub-tarea no pasa) → padre 'escalada'; NO se integra."""
    integrar = IntegrarFake()
    coord, estado = coordinador_con(ejecutor=EjecutorFake(aprobar=False), integrar=integrar)
    cola = ejecutar(coord, new_data_message(tarea_padre(limites={"fan_out_max": 3})))

    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED  # el A2A completa; el enjambre escala
    [entregado] = get_data_parts(artifacts(cola)[0].parts)
    assert entregado["enjambre"]["estado"] == "escalado"
    assert integrar.llamadas == 0  # no se integra lo que no pasó por partes
    assert estado.transiciones[-1] == ("cuentas-0007", "escalada")


def test_conflicto_de_integracion_escala():
    """Un diff que no aplica limpio = conflicto → escalada con el hallazgo (sin modelo)."""
    integrar = IntegrarFake(error=IntegracionError([{"regla": "integracion", "evidencia": "auth y perfil chocan"}]))
    coord, estado = coordinador_con(integrar=integrar)
    cola = ejecutar(coord, new_data_message(tarea_padre()))

    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED
    [entregado] = get_data_parts(artifacts(cola)[0].parts)
    assert entregado["integracion"]["estado"] == "conflicto"
    assert entregado["integracion"]["hallazgos"][0]["evidencia"] == "auth y perfil chocan"
    assert estado.transiciones[-1] == ("cuentas-0007", "escalada")


def test_gate_final_rojo_rechaza_el_todo():
    """Partes verdes pero el todo integrado rompe → veredicto final rechazado → 'rechazada'."""
    coord, estado = coordinador_con(supervisor=SupervisorFinalFake(aprobado=False))
    cola = ejecutar(coord, new_data_message(tarea_padre()))

    [entregado] = get_data_parts(artifacts(cola)[0].parts)
    assert entregado["veredicto_final"]["veredicto"] == "rechazado"
    assert estado.transiciones[-1] == ("cuentas-0007", "rechazada")


def test_supervisor_final_caido_falla():
    coord, _ = coordinador_con(supervisor=SupervisorFinalFake(error=SupervisorError("supervisor caido")))
    cola = ejecutar(coord, new_data_message(tarea_padre()))

    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "supervisor final: supervisor caido" in razon_de_fallo(cola)


# ---------- errores → failed con razon clara ----------

def test_mensaje_sin_datapart_falla():
    coord, estado = coordinador_con()
    cola = ejecutar(coord, new_text_message("hazme el modulo de cuentas"))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "tarea padre invalida" in razon_de_fallo(cola)
    assert estado.padres == []  # no se registro nada


def test_tarea_padre_sin_criterios_falla():
    t = tarea_padre()
    del t["criterios_aceptacion"]
    coord, _ = coordinador_con()
    cola = ejecutar(coord, new_data_message(t))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "criterios_aceptacion" in razon_de_fallo(cola)


def test_fan_out_invalido_falla():
    coord, _ = coordinador_con()
    cola = ejecutar(coord, new_data_message(tarea_padre(limites={"fan_out_max": 0})))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "fan_out_max" in razon_de_fallo(cola)


def test_planner_sin_plan_falla():
    """MockPlanner sin contexto['mock_plan'] → PlannerError → tarea failed."""
    coord, estado = coordinador_con()
    cola = ejecutar(coord, new_data_message(tarea_padre(mock_plan=None)))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "planner:" in razon_de_fallo(cola)
    assert estado.padres == []  # sin plan no se registra padre


def test_planner_que_truena_falla_con_razon():
    coord, _ = coordinador_con(planner=PlannerFake(error=PlannerError("modelo caido")))
    cola = ejecutar(coord, new_data_message(tarea_padre()))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "planner: modelo caido" in razon_de_fallo(cola)
