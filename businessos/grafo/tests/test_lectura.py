"""Tests de los endpoints de lectura pura (App C, paso 1): /reglas, /dimensiones,
/jurisdicciones. Mismo patron que test_api.py (overrides, sin DB) con una guarda:
test_api deja overrides GLOBALES a nivel de modulo, asi que aqui cada test
snapshotea y restaura app.dependency_overrides para no contaminar a los vecinos."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import app, dep_catalogos, dep_conocimiento

SEED = json.loads(
    (Path(__file__).resolve().parent.parent / "seed" / "reglas.json").read_text(encoding="utf-8")
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def _overrides_restaurados():
    previos = dict(app.dependency_overrides)
    yield
    app.dependency_overrides.clear()
    app.dependency_overrides.update(previos)


def _con_seed():
    app.dependency_overrides[dep_conocimiento] = lambda: {
        "reglas": SEED["reglas"],
        "categorias": SEED["categorias"],
    }


def test_openapi_sin_db_incluye_lectura():
    """Gotcha PRP-002: el contrato (con los 3 paths nuevos) se genera sin postgres."""
    spec = app.openapi()
    for path in ("/reglas", "/dimensiones", "/jurisdicciones"):
        assert path in spec["paths"], path
    assert client.get("/openapi.json").status_code == 200


def test_reglas_completas_con_seed_real():
    """El seed REAL pasa el contrato entero — incluye impactos con veredicto_base
    null y reglas sin source_version (las dos formas que el modelo debe tolerar)."""
    _con_seed()
    r = client.get("/reglas")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == len(SEED["reglas"])
    # regla de oro: ninguna regla sin fuente citada
    assert all(x["fuente_cita"] and x["fuente_url"] for x in body)
    # el seed real trae impactos sin veredicto (solo requisitos): no debe tronar
    assert any(i["veredicto_base"] is None for x in body for i in x["impactos"])
    # `vigente` depende de la fecha del request -> jamas cachear
    assert r.headers["cache-control"] == "no-store"


def test_reglas_filtro_por_jurisdiccion_y_dimension():
    _con_seed()
    r = client.get("/reglas?jurisdiccion=CO&dimension=fiscal")
    assert r.status_code == 200
    body = r.json()
    assert body, "el seed trae reglas CO/fiscal"
    assert all(x["jurisdiccion"] == "CO" and x["dimension"] == "fiscal" for x in body)


def test_reglas_filtro_normaliza_mayusculas():
    """'mx'/'FISCAL' deben casar igual que 'MX'/'fiscal' (los codigos son fijos)."""
    _con_seed()
    exacto = client.get("/reglas?jurisdiccion=MX&dimension=fiscal").json()
    laxo = client.get("/reglas?jurisdiccion=mx&dimension=FISCAL").json()
    assert exacto and [x["clave"] for x in laxo] == [x["clave"] for x in exacto]


def test_reglas_filtro_sin_resultados_es_lista_vacia():
    _con_seed()
    r = client.get("/reglas?jurisdiccion=ZZ")
    assert r.status_code == 200
    assert r.json() == []


def test_reglas_vigente_evaluada_a_la_fecha_pedida():
    """`fecha` hace el badge reproducible: la misma regla sale vigente o vencida
    segun el corte pedido, sin depender del reloj del servidor."""
    regla_vencida = {
        "clave": "MX-TEST-DEROGADA",
        "jurisdiccion": "MX",
        "dimension": "fiscal",
        "titulo": "Regla derogada de prueba",
        "texto_resumen": "Vigente solo durante 2024.",
        "fuente_cita": "Ley de prueba Art. 1",
        "fuente_url": "https://example.org/ley",
        "vigente_desde": "2024-01-01",
        "vigente_hasta": "2024-12-31",
        "impactos": [],
    }
    app.dependency_overrides[dep_conocimiento] = lambda: {
        "reglas": [regla_vencida], "categorias": [],
    }
    en_2024 = client.get("/reglas?fecha=2024-06-15").json()[0]
    assert en_2024["vigente"] is True
    despues = client.get("/reglas?fecha=2026-08-03").json()[0]
    assert despues["vigente"] is False  # badge "vencida" del explorador
    antes = client.get("/reglas?fecha=2023-12-31").json()[0]
    assert antes["vigente"] is False  # aun no entraba en vigor


def test_catalogos_happy_path():
    app.dependency_overrides[dep_catalogos] = lambda: {
        "jurisdicciones": SEED["jurisdicciones"],
        "dimensiones": SEED["dimensiones"],
    }
    jur = client.get("/jurisdicciones")
    assert jur.status_code == 200
    assert {j["codigo"] for j in jur.json()} == {"MX", "CO"}
    dim = client.get("/dimensiones")
    assert dim.status_code == 200
    codigos = {d["codigo"] for d in dim.json()}
    assert "fiscal" in codigos and "datos-personales" in codigos
    assert all(d["nombre"] for d in dim.json())


def test_lectura_sin_db_es_503():
    """Sin overrides las deps importan db real y aqui no hay postgres: 503, no 500."""
    app.dependency_overrides.pop(dep_conocimiento, None)
    app.dependency_overrides.pop(dep_catalogos, None)
    assert client.get("/reglas").status_code == 503
    assert client.get("/jurisdicciones").status_code == 503
    assert client.get("/dimensiones").status_code == 503


def test_fecha_invalida_es_422():
    _con_seed()
    assert client.get("/reglas?fecha=ayer").status_code == 422
