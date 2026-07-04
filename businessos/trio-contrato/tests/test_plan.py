"""Tests del PLAN del enjambre (Fase 7 / PRP-007): DAG de sub-tareas.

Invariantes duras (ContratoInvalido): ids unicos, sin auto-dependencia, deps hacia
ids existentes, DAG aciclico, cada sub-tarea es una TAREA valida. Blando (avisos):
alcances solapados entre sub-tareas independientes.
"""
import pytest

from contrato import ContratoInvalido, validar_plan


def sub(task_id, *, depende_de=None, alcance=None, **extra):
    """Una sub-tarea valida minima (TAREA + depende_de + alcance)."""
    d = {
        "task_id": task_id,
        "objetivo": f"hacer {task_id}",
        "criterios_aceptacion": ["build verde"],
        "depende_de": depende_de or [],
        "alcance": alcance or [],
    }
    d.update(extra)
    return d


# --- DAG valido ---

def test_plan_valido_dos_paralelas_una_dependiente():
    """Traza del PRP: auth + emails independientes; perfil depende de auth."""
    plan = validar_plan({"sub_tareas": [
        sub("auth-google", alcance=["app/auth/**"]),
        sub("emails-bienvenida", alcance=["app/emails/**"]),
        sub("perfil-editable", depende_de=["auth-google"], alcance=["app/perfil/**"]),
    ]})
    assert len(plan["sub_tareas"]) == 3
    # El orden respeta la dependencia: auth antes que perfil.
    assert plan["orden"].index("auth-google") < plan["orden"].index("perfil-editable")
    # Alcances disjuntos → sin avisos.
    assert plan["avisos"] == []


def test_plan_normaliza_subtarea_como_tarea():
    plan = validar_plan({"sub_tareas": [sub("a")]})
    s = plan["sub_tareas"][0]
    assert s["departamento"] == "software"          # default de validar_tarea
    assert s["limites"]["intentos_max"] == 3         # default heredado
    assert s["depende_de"] == [] and s["alcance"] == []


def test_orden_topologico_cadena():
    plan = validar_plan({"sub_tareas": [
        sub("c", depende_de=["b"]),
        sub("b", depende_de=["a"]),
        sub("a"),
    ]})
    assert plan["orden"] == ["a", "b", "c"]


# --- avisos de solape (blando) ---

def test_alcances_solapados_sin_dependencia_avisa():
    plan = validar_plan({"sub_tareas": [
        sub("x", alcance=["app/core/**"]),
        sub("y", alcance=["app/core/db.ts"]),   # cae dentro de app/core/**
    ]})
    assert len(plan["avisos"]) == 1
    assert "'x'" in plan["avisos"][0] and "'y'" in plan["avisos"][0]


def test_alcances_solapados_con_dependencia_no_avisa():
    """Si hay relacion de dependencia, el orden ya las separa → sin aviso."""
    plan = validar_plan({"sub_tareas": [
        sub("x", alcance=["app/core/**"]),
        sub("y", depende_de=["x"], alcance=["app/core/db.ts"]),
    ]})
    assert plan["avisos"] == []


def test_avisos_no_bloquean():
    """Un solape es aviso, NO ContratoInvalido: el plan sigue siendo valido."""
    plan = validar_plan({"sub_tareas": [
        sub("x", alcance=["src/*.ts"]),
        sub("y", alcance=["src/a.ts"]),
    ]})
    assert plan["avisos"]  # hay aviso
    assert plan["orden"]   # y aun asi devuelve un plan usable


# --- invariantes duras ---

def test_ciclo_es_invalido():
    with pytest.raises(ContratoInvalido, match="ciclo"):
        validar_plan({"sub_tareas": [
            sub("a", depende_de=["b"]),
            sub("b", depende_de=["a"]),
        ]})


def test_dependencia_a_id_inexistente_es_invalida():
    with pytest.raises(ContratoInvalido, match="inexistente"):
        validar_plan({"sub_tareas": [sub("a", depende_de=["fantasma"])]})


def test_auto_dependencia_es_invalida():
    with pytest.raises(ContratoInvalido, match="si misma"):
        validar_plan({"sub_tareas": [sub("a", depende_de=["a"])]})


def test_ids_repetidos_es_invalido():
    with pytest.raises(ContratoInvalido, match="repetido"):
        validar_plan({"sub_tareas": [sub("a"), sub("a")]})


def test_sub_tareas_vacia_es_invalido():
    with pytest.raises(ContratoInvalido, match="sub_tareas"):
        validar_plan({"sub_tareas": []})


def test_plan_no_objeto_es_invalido():
    with pytest.raises(ContratoInvalido, match="objeto JSON"):
        validar_plan([sub("a")])


def test_subtarea_con_tarea_invalida_se_rechaza():
    """Reusa las invariantes de Fase 6: task_id con '..' es rechazado."""
    with pytest.raises(ContratoInvalido, match="task_id"):
        validar_plan({"sub_tareas": [sub("../evil")]})


def test_subtarea_sin_criterios_se_rechaza():
    mala = {"task_id": "a", "objetivo": "x", "criterios_aceptacion": []}
    with pytest.raises(ContratoInvalido, match="criterios"):
        validar_plan({"sub_tareas": [mala]})


def test_depende_de_no_lista_de_str_es_invalido():
    with pytest.raises(ContratoInvalido, match="depende_de"):
        validar_plan({"sub_tareas": [sub("a", depende_de=[1, 2])]})
