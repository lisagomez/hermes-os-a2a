"""Tests del Planner del Coordinador (Fase 7): MockPlanner + fábrica, cero tokens."""
import asyncio

import pytest

from planner import MockPlanner, PlannerError, crear_planner

PLAN_OK = {"sub_tareas": [
    {"task_id": "a", "objetivo": "hacer a", "criterios_aceptacion": ["build verde"]},
    {"task_id": "b", "objetivo": "hacer b", "criterios_aceptacion": ["build verde"],
     "depende_de": ["a"]},
]}


def plan_de(tarea):
    return asyncio.run(MockPlanner().plan(tarea))


def test_mock_planner_valida_el_dag_del_contexto():
    plan = plan_de({"contexto": {"mock_plan": PLAN_OK}})
    assert [s["task_id"] for s in plan["sub_tareas"]] == ["a", "b"]
    assert plan["orden"] == ["a", "b"]          # topológico: a antes que b
    assert plan["avisos"] == []


def test_mock_planner_sin_plan_es_error():
    with pytest.raises(PlannerError, match="mock_plan"):
        plan_de({"contexto": {}})


def test_mock_planner_dag_invalido_es_planner_error():
    """Un DAG con ciclo llega como PlannerError (no como ContratoInvalido crudo)."""
    ciclico = {"sub_tareas": [
        {"task_id": "a", "objetivo": "a", "criterios_aceptacion": ["x"], "depende_de": ["b"]},
        {"task_id": "b", "objetivo": "b", "criterios_aceptacion": ["x"], "depende_de": ["a"]},
    ]}
    with pytest.raises(PlannerError, match="inválido"):
        plan_de({"contexto": {"mock_plan": ciclico}})


def test_fabrica_mock():
    assert isinstance(crear_planner("mock"), MockPlanner)


def test_fabrica_desconocido_es_error():
    with pytest.raises(PlannerError, match="desconocido"):
        crear_planner("otro")
