"""Tests del EjecutorA2A tras la COLA (PRP-010): `execute` ya NO construye — ENCOLA.

Lo que se fija aqui:
  - encolar responde rapido y NUNCA toca el motor (esa es toda la razon de ser de la cola);
  - jamas se dice "encolada" sin fila escrita (si la cola falla, la tarea A2A falla);
  - el contrato se valida ANTES de encolar (basura no entra a la cola);
  - las posiciones son las de verdad (1, 2, 3...).

El trabajo (worktree → motor → Supervisor) se testea en test_pipeline.py, y el drenado
serial en test_worker.py.
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

from cola import ColaError, ColaMemoria
from executor import EjecutorA2A


# ---------- dobles ----------

class ColaEspia:
    def __init__(self) -> None:
        self.eventos: list = []

    async def enqueue_event(self, evento) -> None:
        self.eventos.append(evento)


class ColaRota:
    """Supabase caido: encolar DEBE fallar ruidosamente, no mentir."""

    async def encolar(self, tarea: dict) -> dict:
        raise ColaError("HTTP 503: Supabase no responde")

    async def estado_cola(self) -> dict:
        raise ColaError("HTTP 503")

    async def reclamar(self):
        return None

    async def recuperar_huerfanas(self) -> list[str]:
        return []


class MotorEspia:
    """Si el motor se toca al encolar, la cola no sirve para nada. Debe quedarse a cero."""

    def __init__(self) -> None:
        self.corridas = 0

    async def run(self, tarea, worktree):
        self.corridas += 1
        return {"artefactos": {}, "notas": ""}


# ---------- helpers ----------

def tarea_valida(task_id: str = "t-100", **extra) -> dict:
    base = {
        "task_id": task_id,
        "objetivo": "crear el modulo x",
        "contexto": {},
        "criterios_aceptacion": ["build verde"],
        "limites": {"intentos_max": 3},
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


def ejecutar(ejecutor: EjecutorA2A, mensaje) -> ColaEspia:
    cola = ColaEspia()
    asyncio.run(ejecutor.execute(contexto_con(mensaje), cola))
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


# ---------- encolar ----------

def test_encolar_responde_posicion_y_no_toca_el_motor():
    motor = MotorEspia()
    ejecutor = EjecutorA2A(cola=ColaMemoria())
    cola_ev = ejecutar(ejecutor, new_data_message(tarea_valida()))

    # Gotcha SDK v1: el Task va encolado ANTES del primer status update.
    assert isinstance(cola_ev.eventos[0], Task)
    assert estados(cola_ev)[-1] == TaskState.TASK_STATE_COMPLETED

    [artifact] = artifacts(cola_ev)
    assert artifact.name == "encolada"
    [datos] = get_data_parts(artifact.parts)
    assert datos["encolada"] is True
    assert datos["task_id"] == "t-100"
    assert datos["posicion"] == 1
    assert datos["en_ejecucion"] is None
    assert [f["task_id"] for f in datos["cola"]] == ["t-100"]

    assert motor.corridas == 0  # LA razon de ser de la cola: encolar no construye


def test_las_posiciones_son_las_de_verdad():
    ejecutor = EjecutorA2A(cola=ColaMemoria())
    posiciones = []
    for i in (1, 2, 3):
        ev = ejecutar(ejecutor, new_data_message(tarea_valida(f"t-{i}")))
        [datos] = get_data_parts(artifacts(ev)[0].parts)
        posiciones.append(datos["posicion"])
    assert posiciones == [1, 2, 3]


def test_reintento_del_mismo_task_id_va_al_FINAL_de_la_cola():
    """Decision de la dueña: en serie, una tarea que falla no puede comerse tres turnos
    seguidos mientras cinco personas esperan."""
    memoria = ColaMemoria()
    ejecutor = EjecutorA2A(cola=memoria)
    for i in (1, 2, 3):
        ejecutar(ejecutor, new_data_message(tarea_valida(f"t-{i}")))

    # t-1 se re-encola (reintento con observaciones) → se va al final, no conserva su turno
    ev = ejecutar(ejecutor, new_data_message(
        tarea_valida("t-1", observaciones=["tests: falla el callback"])))
    [datos] = get_data_parts(artifacts(ev)[0].parts)
    assert datos["posicion"] == 3
    assert [f["task_id"] for f in datos["cola"]] == ["t-2", "t-3", "t-1"]


# ---------- honestidad: nunca "encolada" sin fila ----------

def test_si_la_cola_falla_la_tarea_falla_y_NO_dice_encolada():
    ejecutor = EjecutorA2A(cola=ColaRota())
    ev = ejecutar(ejecutor, new_data_message(tarea_valida("t-200")))

    assert estados(ev)[-1] == TaskState.TASK_STATE_FAILED
    assert "cola:" in razon_de_fallo(ev)
    assert artifacts(ev) == []  # ni un solo "encolada" sale de aqui


# ---------- el contrato se valida ANTES de encolar ----------

def test_mensaje_sin_datapart_falla_sin_encolar():
    memoria = ColaMemoria()
    ev = ejecutar(EjecutorA2A(cola=memoria), new_text_message("hazme un login"))

    assert estados(ev)[-1] == TaskState.TASK_STATE_FAILED
    assert "tarea invalida" in razon_de_fallo(ev)
    assert asyncio.run(memoria.estado_cola())["cola"] == []  # basura no entra a la cola


def test_dos_dataparts_falla():
    m = new_data_message(tarea_valida("t-103"))
    m.parts.append(new_data_message(tarea_valida("t-104")).parts[0])
    ev = ejecutar(EjecutorA2A(cola=ColaMemoria()), m)

    assert estados(ev)[-1] == TaskState.TASK_STATE_FAILED
    assert "UNA tarea por mensaje" in razon_de_fallo(ev)


def test_tarea_sin_criterios_falla_con_razon_del_contrato():
    tarea = tarea_valida("t-105")
    del tarea["criterios_aceptacion"]
    ev = ejecutar(EjecutorA2A(cola=ColaMemoria()), new_data_message(tarea))

    assert estados(ev)[-1] == TaskState.TASK_STATE_FAILED
    assert "criterios_aceptacion" in razon_de_fallo(ev)


def test_cliente_que_cuelga_no_deja_la_fila_a_medias():
    """Hermano del shield del PR #37: el encolado es corto, pero una vez empezado se
    termina — si no, el que pidio se queda sin saber y la fila queda a medias."""
    memoria = ColaMemoria()
    ejecutor = EjecutorA2A(cola=memoria)

    async def escenario():
        ev = ColaEspia()
        corrida = asyncio.create_task(
            ejecutor.execute(contexto_con(new_data_message(tarea_valida("t-300"))), ev)
        )
        await asyncio.sleep(0)  # deja arrancar el encolado
        corrida.cancel()
        try:
            await corrida
        except asyncio.CancelledError:
            pass
        return await memoria.estado_cola()

    cola = asyncio.run(escenario())
    assert [f["task_id"] for f in cola["cola"]] == ["t-300"]  # la fila SI se escribio
