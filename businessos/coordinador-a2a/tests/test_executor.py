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
from planner import MockPlanner, PlannerError


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


def coordinador_con(planner=None, estado=None):
    estado = estado or EstadoEspia()
    coord = CoordinadorA2A(planner=planner or MockPlanner(), estado=estado)
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

def test_tarea_padre_entrega_plan_y_registra_fila_padre():
    coord, estado = coordinador_con()
    cola = ejecutar(coord, new_data_message(tarea_padre()))

    # Gotcha SDK v1: el Task va encolado ANTES del primer status update.
    assert isinstance(cola.eventos[0], Task)
    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED

    [artifact] = artifacts(cola)
    assert artifact.name == "plan-enjambre"
    [entregado] = get_data_parts(artifact.parts)
    plan = entregado["plan"]
    assert [s["task_id"] for s in plan["sub_tareas"]] == ["auth", "emails", "perfil"]
    assert plan["orden"].index("auth") < plan["orden"].index("perfil")
    assert plan["avisos"] == []  # alcances disjuntos

    # Fila padre registrada con el plan y los limites.
    assert len(estado.padres) == 1
    padre = estado.padres[0]
    assert padre["task_id"] == "cuentas-0007"
    assert padre["fan_out_max"] == 3
    assert padre["presupuesto_usd"] == 5.0
    assert padre["plan"] == plan


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
