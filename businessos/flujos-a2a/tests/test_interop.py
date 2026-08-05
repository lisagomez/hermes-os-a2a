"""Interop contra el app REAL de businessos/grafo/ — cero red, cero postgres.

El grafo se monta in-process via httpx.ASGITransport con el SEED REAL
(dependency_overrides, patron grafo/tests/test_lectura.py) y flujos-a2a le
habla por su cliente httpx normal. Los modulos homonimos (app, schemas) se
aislan con el swap de sys.modules del patron ejecutor-a2a/tests/test_interop.py.

Ademas del wire real, aqui se verifica el CONTRATO del constructor: la
plantilla que emite debe validar contra el EvaluacionRequest del grafo.
"""
from __future__ import annotations

import importlib
import json
import sys
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from app import crear_app

GRAFO_DIR = Path(__file__).resolve().parent.parent.parent / "grafo"
SEED = json.loads((GRAFO_DIR / "seed" / "reglas.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def grafo_mods():
    """Importa app/schemas del grafo aislando los nombres que chocan con los nuestros."""
    clashes = ("app", "schemas")
    originales = {m: sys.modules.pop(m) for m in clashes if m in sys.modules}
    sys.path.insert(0, str(GRAFO_DIR))
    try:
        mods = {}
        for nombre in ("schemas", "evaluador", "app"):
            sys.modules.pop(nombre, None)
            mods[nombre] = importlib.import_module(nombre)
            assert Path(mods[nombre].__file__).parent == GRAFO_DIR, nombre
        yield mods
    finally:
        sys.path.remove(str(GRAFO_DIR))
        for m in ("schemas", "evaluador", "app"):
            sys.modules.pop(m, None)
        sys.modules.update(originales)


@pytest.fixture(scope="module")
def cliente(grafo_mods):
    """TestClient de flujos-a2a hablando con el grafo real cargado con el seed real."""
    grafo_app = grafo_mods["app"]
    grafo_app.app.dependency_overrides[grafo_mods["app"].dep_conocimiento] = lambda: {
        "reglas": SEED["reglas"],
        "categorias": SEED["categorias"],
    }
    grafo_app.app.dependency_overrides[grafo_mods["app"].dep_catalogos] = lambda: {
        "jurisdicciones": SEED["jurisdicciones"],
        "dimensiones": SEED["dimensiones"],
    }
    grafo_app.app.dependency_overrides[grafo_mods["app"].dep_listar] = lambda: (
        lambda limit: [
            {"id": "e-1", "created_at": "2026-08-01T00:00:00",
             "contexto": {"jurisdiccion": "MX", "dimension": "fiscal",
                          "regimen": "PM_TITULO_II", "fecha": "2026-08-01"},
             "salida": {"estado": "dudoso", "fuentes": [],
                        "disclaimer": "Esto no es asesoria fiscal."}}
        ][:limit]
    )
    transport = httpx.ASGITransport(app=grafo_app.app)
    try:
        yield TestClient(crear_app(transport=transport))
    finally:
        grafo_app.app.dependency_overrides.clear()


def test_arbol_contra_grafo_real(cliente):
    r = cliente.get("/arbol")
    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["total_reglas"] == len(SEED["reglas"])
    codigos_jur = [j["codigo"] for j in cuerpo["jurisdicciones"]]
    assert codigos_jur == [j["codigo"] for j in SEED["jurisdicciones"]]
    # cada jurisdiccion lista TODAS las dimensiones del catalogo (huecos visibles)
    dims_catalogo = [d["codigo"] for d in SEED["dimensiones"]]
    for j in cuerpo["jurisdicciones"]:
        assert [d["codigo"] for d in j["dimensiones"]] == dims_catalogo
    # regla de oro intacta a traves del proxy: toda regla con fuente
    reglas = [r_ for j in cuerpo["jurisdicciones"] for d in j["dimensiones"] for r_ in d["reglas"]]
    assert len(reglas) == len(SEED["reglas"])
    assert all(x["fuente_cita"] and x["fuente_url"] for x in reglas)
    assert all("vigente" in x for x in reglas)


def test_constructor_emite_payload_que_el_grafo_acepta(cliente, grafo_mods):
    """El contrato que importa: la plantilla valida contra EvaluacionRequest REAL."""
    r = cliente.get("/constructor?jurisdiccion=MX&dimension=fiscal")
    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["regimenes"] == ["PM_TITULO_II"]  # el seed solo trae ese + GENERAL
    assert cuerpo["categorias"], "MX/fiscal referencia categorias en el seed"
    assert all(c["clave"] and c["nombre"] and c["descripcion"] for c in cuerpo["categorias"])

    payload = cuerpo["plantilla_payload"]
    payload["conceptos"] = [{"descripcion": "hotel en Guadalajara", "importe": 1500.0}]
    req = grafo_mods["schemas"].EvaluacionRequest(**payload)
    assert req.contexto.jurisdiccion == "MX" and req.contexto.regimen == "PM_TITULO_II"


def test_constructor_ambito_sin_reglas_no_truena(cliente):
    r = cliente.get("/constructor?jurisdiccion=ZZ&dimension=fiscal")
    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["categorias"] == [] and cuerpo["regimenes"] == []
    assert cuerpo["regimen_default"] == "PM_TITULO_II"  # el default del grafo, no un invento


def test_catalogos_contra_grafo_real(cliente):
    r = cliente.get("/catalogos")
    assert r.status_code == 200
    assert {j["codigo"] for j in r.json()["jurisdicciones"]} == {"MX", "CO"}
    assert "datos-personales" in {d["codigo"] for d in r.json()["dimensiones"]}


def test_evaluaciones_contra_grafo_real(cliente):
    r = cliente.get("/evaluaciones?limit=1")
    assert r.status_code == 200
    filas = r.json()
    assert len(filas) == 1
    # disclaimer y salida INTACTOS a traves del proxy
    assert filas[0]["salida"]["disclaimer"] == "Esto no es asesoria fiscal."
