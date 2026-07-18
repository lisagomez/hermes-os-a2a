"""Tests del Worker (PRP-010): el drenado serial de la cola.

El test que justifica toda la fase es `test_nunca_dos_motores_a_la_vez`: un motor espia que
detecta SOLAPAMIENTO. Si eso falla, el cx33 se queda sin RAM, los gates fallan por timeout
y rechazamos codigo bueno — el pecado que este PRP existe para evitar.
"""
from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from cola import ColaMemoria
from pipeline import PipelineError
from worker import Worker


# ---------- dobles ----------

class MotorConcurrencia:
    """Registra si dos corridas se solapan. La verdad, no la intencion."""

    def __init__(self, duracion: float = 0.05) -> None:
        self.activas = 0
        self.solapamiento = False
        self.orden: list[str] = []
        self._duracion = duracion

    async def procesar(self, tarea: dict) -> dict:
        self.activas += 1
        if self.activas > 1:
            self.solapamiento = True  # ¡dos motores a la vez!
        self.orden.append(tarea["task_id"])
        await asyncio.sleep(self._duracion)
        self.activas -= 1
        return {"resultado": {"task_id": tarea["task_id"]},
                "veredicto": {"veredicto": "aprobado", "gates": [], "hallazgos": []}}


class PipelineQueTruena:
    def __init__(self, exc: PipelineError) -> None:
        self._exc = exc
        self.llamadas = 0

    async def procesar(self, tarea: dict) -> dict:
        self.llamadas += 1
        raise self._exc


class EstadoEspia:
    def __init__(self) -> None:
        self.transiciones: list[tuple[str, str]] = []

    async def transicionar(self, task_id: str, estado: str, **campos) -> None:
        self.transiciones.append((task_id, estado))


class PresupuestoFake:
    def __init__(self, margen: bool = True, motivo: str = "ok") -> None:
        self._margen, self._motivo = margen, motivo
        self.consultas = 0

    async def hay_margen(self):
        self.consultas += 1
        return self._margen, self._motivo


class ColaConCASPerdido(ColaMemoria):
    """Otro proceso se lleva la tarea entre el pick y el claim (CAS perdido)."""

    async def reclamar(self):
        await super().reclamar()  # la saca...
        return None               # ...pero el CAS lo gana otro


def tarea(task_id: str) -> dict:
    return {
        "task_id": task_id, "departamento": "software", "objetivo": "x",
        "contexto": {}, "criterios_aceptacion": ["build verde"],
        "limites": {"intentos_max": 3}, "observaciones": [],
    }


def worker_con(cola, pipeline, estado=None, presupuesto=None, repo=None) -> Worker:
    return Worker(
        cola=cola, pipeline=pipeline, estado=estado or EstadoEspia(),
        presupuesto=presupuesto or PresupuestoFake(),
        repo=repo or Path("/repo-que-no-existe"),  # refrescar_master degrada con gracia
        pausa_s=0.001,
    )


async def drenar(worker: Worker, vueltas: int = 5) -> None:
    for _ in range(vueltas):
        await worker.un_ciclo()


# ---------- lo que justifica la fase ----------

def test_nunca_dos_motores_a_la_vez():
    """Tres tareas encoladas a la vez → se ejecutan UNA DETRAS DE OTRA, en orden."""
    cola = ColaMemoria()
    motor = MotorConcurrencia()
    worker = worker_con(cola, motor)

    async def escenario():
        for t in ("t-1", "t-2", "t-3"):
            await cola.encolar(tarea(t))
        # Dos ciclos EN PARALELO a proposito: aun asi, un solo worker = un motor.
        await asyncio.gather(drenar(worker), drenar(worker))

    asyncio.run(escenario())

    assert motor.solapamiento is False  # jamas dos motores + dos npm build en 8 GB
    assert motor.orden == ["t-1", "t-2", "t-3"]  # FIFO


def test_el_orden_respeta_la_prioridad_antes_que_el_fifo():
    cola = ColaMemoria()
    motor = MotorConcurrencia(duracion=0)
    worker = worker_con(cola, motor)

    async def escenario():
        for t in ("t-1", "t-2", "t-3"):
            await cola.encolar(tarea(t))
        # Elisa adelanta t-3 (en la cola real esto lo hace el host-job con credencial).
        for f in cola._pendientes:
            if f["tarea"]["task_id"] == "t-3":
                f["prioridad"] = 10
        await drenar(worker)

    asyncio.run(escenario())
    assert motor.orden == ["t-3", "t-1", "t-2"]


# ---------- presupuesto ----------

def test_sin_margen_no_saca_tarea_y_la_cola_queda_intacta():
    cola = ColaMemoria()
    motor = MotorConcurrencia()
    presupuesto = PresupuestoFake(margen=False, motivo="tope diario alcanzado")
    worker = worker_con(cola, motor, presupuesto=presupuesto)

    async def escenario():
        await cola.encolar(tarea("t-1"))
        await drenar(worker, vueltas=3)
        return await cola.estado_cola()

    estado_cola = asyncio.run(escenario())

    assert motor.orden == []  # no se ejecuto nada
    assert [f["task_id"] for f in estado_cola["cola"]] == ["t-1"]  # la cola NO se pierde


def test_el_presupuesto_se_consulta_antes_de_CADA_tarea():
    cola = ColaMemoria()
    presupuesto = PresupuestoFake()
    worker = worker_con(cola, MotorConcurrencia(duracion=0), presupuesto=presupuesto)

    async def escenario():
        for t in ("t-1", "t-2"):
            await cola.encolar(tarea(t))
        await drenar(worker, vueltas=2)

    asyncio.run(escenario())
    assert presupuesto.consultas >= 2  # una por tarea, no una vez al arrancar


# ---------- fallos: escalar vs devolver a la cola ----------

def test_fallo_de_la_tarea_escala():
    cola, estado = ColaMemoria(), EstadoEspia()
    worker = worker_con(cola, PipelineQueTruena(PipelineError("motor: se rompio", escalar=True)),
                        estado=estado)

    async def escenario():
        await cola.encolar(tarea("t-1"))
        await worker.un_ciclo()

    asyncio.run(escenario())
    assert estado.transiciones == [("t-1", "escalada")]


def test_fallo_de_INFRAESTRUCTURA_devuelve_la_tarea_a_la_cola():
    """El Supervisor caido no es culpa de la tarea: escalarla seria culpar al trabajo de un
    problema nuestro (el pecado del 2026-07-12)."""
    cola, estado = ColaMemoria(), EstadoEspia()
    roto = PipelineQueTruena(PipelineError("supervisor: no disponible", escalar=False))
    worker = worker_con(cola, roto, estado=estado)

    async def escenario():
        await cola.encolar(tarea("t-1"))
        await worker.un_ciclo()

    asyncio.run(escenario())
    assert estado.transiciones == [("t-1", "recibida")]  # vuelve a la fila, no se escala


# ---------- CAS ----------

def test_si_otro_gana_el_CAS_este_worker_no_ejecuta():
    """Aunque por accidente haya dos procesos (rebuild solapado, `docker run` a mano),
    nunca dos motores sobre la MISMA tarea."""
    cola = ColaConCASPerdido()
    motor = MotorConcurrencia()
    worker = worker_con(cola, motor)

    async def escenario():
        await cola.encolar(tarea("t-1"))
        await worker.un_ciclo()

    asyncio.run(escenario())
    assert motor.orden == []  # no se la llevo: no la ejecuta
