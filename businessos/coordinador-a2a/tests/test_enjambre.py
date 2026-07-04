"""Tests del scheduler del enjambre (Fase 7, Fase 3): DAG + fan-out + reintento + presupuesto.

Determinista, cero red/tokens: el Ejecutor y el Presupuesto son dobles. Verifican
lo que el scheduler garantiza — orden del DAG, tope de concurrencia, reintento por
sub-tarea con observaciones, corte por presupuesto y escalada.
"""
from __future__ import annotations

import asyncio

import pytest

import enjambre
from contrato import validar_plan


def sub(task_id, *, depende_de=None, alcance=None, intentos_max=3):
    return {"task_id": task_id, "objetivo": f"hacer {task_id}",
            "criterios_aceptacion": ["build verde"], "depende_de": depende_de or [],
            "alcance": alcance or [], "limites": {"intentos_max": intentos_max}}


def plan_de(*subs):
    return validar_plan({"sub_tareas": list(subs)})


def _sal(tid, aprobado):
    v = ({"task_id": tid, "veredicto": "aprobado",
          "gates": [{"regla": "b", "estado": "paso", "evidencia": "ok"}], "hallazgos": []}
         if aprobado else
         {"task_id": tid, "veredicto": "rechazado",
          "gates": [{"regla": "t", "estado": "fallo", "evidencia": f"{tid} fallo"}],
          "hallazgos": [{"regla": "t", "evidencia": f"{tid} fallo desc"}]})
    return {"resultado": {"task_id": tid}, "veredicto": v}


class EjecutorGuion:
    """Por task_id, una secuencia de 'aprobado'/'rechazado' (el último se repite)."""

    def __init__(self, guiones=None, siempre="aprobado") -> None:
        self._g = {k: list(v) for k, v in (guiones or {}).items()}
        self._siempre = siempre
        self.llamadas: list[tuple[str, list]] = []

    async def ejecutar(self, sub_tarea) -> dict:
        tid = sub_tarea["task_id"]
        self.llamadas.append((tid, list(sub_tarea.get("observaciones", []))))
        seq = self._g.get(tid)
        estado = (seq.pop(0) if len(seq) > 1 else seq[0]) if seq else self._siempre
        return _sal(tid, estado == "aprobado")


class PresupuestoSecuencia:
    def __init__(self, valores) -> None:
        self._v = list(valores)

    async def gasto_acumulado(self, task_ids) -> float:
        return self._v.pop(0) if len(self._v) > 1 else self._v[0]


def correr(plan, ejecutor, fan_out_max=3, presupuesto_usd=None, presupuesto=None, parent="p"):
    presupuesto = presupuesto or PresupuestoSecuencia([0.0])
    return asyncio.run(
        enjambre.correr(plan, ejecutor, presupuesto, fan_out_max, presupuesto_usd, parent)
    )


# ---------- camino feliz + orden del DAG ----------

def test_todas_aprobadas_es_aprobado():
    plan = plan_de(sub("a"), sub("b"), sub("perfil", depende_de=["a"]))
    r = correr(plan, EjecutorGuion())
    assert r["estado"] == "aprobado"
    assert set(r["sub_resultados"]) == {"a", "b", "perfil"}


def test_dependencia_corre_despues_de_su_prerequisito():
    ej = EjecutorGuion()
    plan = plan_de(sub("a"), sub("perfil", depende_de=["a"]))
    correr(plan, ej)
    ids = [tid for tid, _ in ej.llamadas]
    assert ids.index("a") < ids.index("perfil")  # nunca perfil antes que a


# ---------- tope de concurrencia ----------

class EjecutorConcurrencia:
    def __init__(self) -> None:
        self.actual = 0
        self.maximo = 0

    async def ejecutar(self, sub_tarea) -> dict:
        self.actual += 1
        self.maximo = max(self.maximo, self.actual)
        await asyncio.sleep(0.01)  # deja que la ola entera arranque antes de soltar
        self.actual -= 1
        return _sal(sub_tarea["task_id"], True)


def test_fan_out_max_acota_la_concurrencia():
    ej = EjecutorConcurrencia()
    plan = plan_de(sub("a"), sub("b"), sub("c"), sub("d"))  # 4 independientes
    correr(plan, ej, fan_out_max=2)
    assert ej.maximo == 2  # nunca más de 2 Ejecutores a la vez


# ---------- reintento por sub-tarea ----------

def test_rechazo_reintenta_con_observaciones_y_luego_aprueba():
    ej = EjecutorGuion({"a": ["rechazado", "aprobado"]})
    r = correr(plan_de(sub("a")), ej)
    assert r["estado"] == "aprobado"
    assert len(ej.llamadas) == 2
    # El segundo intento llevó las observaciones del rechazo.
    assert ej.llamadas[0][1] == []
    assert "a fallo desc" in ej.llamadas[1][1]


def test_agota_intentos_escala():
    ej = EjecutorGuion({"a": ["rechazado"]}, )  # siempre rechaza
    r = correr(plan_de(sub("a", intentos_max=2)), ej)
    assert r["estado"] == "escalado"
    assert "reintentos" in r["motivo"]
    assert len(ej.llamadas) == 2  # exactamente intentos_max intentos


def test_ejecutor_que_truena_escala():
    class EjecutorRoto:
        async def ejecutar(self, sub_tarea):
            raise RuntimeError("ejecutor caído")

    r = correr(plan_de(sub("a")), EjecutorRoto())
    assert r["estado"] == "escalado"


# ---------- corte por presupuesto ----------

def test_presupuesto_agotado_escala_y_no_lanza_mas():
    ej = EjecutorGuion()
    # 2 independientes, fan_out 1: la 1a ola corre una; antes de la 2a, el gasto excede.
    plan = plan_de(sub("a"), sub("b"))
    r = correr(plan, ej, fan_out_max=1, presupuesto_usd=1.0,
               presupuesto=PresupuestoSecuencia([0.0, 2.0]))
    assert r["estado"] == "escalado"
    assert "presupuesto" in r["motivo"]
    assert len(ej.llamadas) == 1  # la 2a sub-tarea nunca se lanzó


def test_sin_presupuesto_declarado_no_corta():
    """presupuesto_usd None → nunca se consulta el gasto ni se corta."""
    r = correr(plan_de(sub("a"), sub("b")), EjecutorGuion(), presupuesto_usd=None)
    assert r["estado"] == "aprobado"
