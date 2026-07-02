"""Tests de la API (Fase C): contrato, validacion, invariantes y openapi sin DB."""
import json
from pathlib import Path

from fastapi.testclient import TestClient

from app import app, dep_conocimiento, dep_guardar

SEED = json.loads(
    (Path(__file__).resolve().parent.parent / "seed" / "reglas.json").read_text(encoding="utf-8")
)

app.dependency_overrides[dep_conocimiento] = lambda: {
    "reglas": SEED["reglas"],
    "categorias": SEED["categorias"],
}
app.dependency_overrides[dep_guardar] = lambda: (lambda contexto, entrada, salida: None)

client = TestClient(app)


def test_openapi_sin_db():
    """Gotcha PRP: el contrato se genera sin postgres (para imprimir el CLI)."""
    spec = app.openapi()
    assert "/evaluaciones" in spec["paths"]
    assert "/health" in spec["paths"]
    r = client.get("/openapi.json")
    assert r.status_code == 200


def test_evaluacion_happy_path():
    r = client.post("/evaluaciones", json={
        "contexto": {"fecha": "2026-06-15"},
        "conceptos": [
            {"descripcion": "Honorarios de consultoria fiscal", "importe": 12000},
            {"descripcion": "Carga de gasolina magna", "importe": 800},
        ],
    })
    assert r.status_code == 200
    body = r.json()
    assert body["estado"] == "dudoso"  # deducible + dudoso -> mixto
    assert body["disclaimer"]
    assert body["fuentes"] and all(f["cita"] and f["url"] for f in body["fuentes"])
    honorarios = body["conceptos"][0]
    assert honorarios["estado"] == "deducible"
    assert honorarios["fuente"]["clave"] == "MX-LISR-27-V"
    gasolina = body["conceptos"][1]
    assert any("efectivo" in b.lower() for b in gasolina["banderas"])
    assert body["banderas_rojas"]
    assert body["checklist"]


def test_no_clasificable_es_dudoso_sin_fuente():
    r = client.post("/evaluaciones", json={
        "conceptos": [{"descripcion": "Ajuste interno misterioso XYZ"}],
    })
    assert r.status_code == 200
    c = r.json()["conceptos"][0]
    assert c["estado"] == "dudoso"
    assert c["razon"] == "sin regla aplicable"
    assert c["fuente"] is None


def test_contexto_default():
    r = client.post("/evaluaciones", json={"conceptos": [{"descripcion": "Honorarios"}]})
    assert r.status_code == 200
    ctx = r.json()["contexto"]
    assert ctx["jurisdiccion"] == "MX"
    assert ctx["regimen"] == "PM_TITULO_II"
    assert ctx["fecha"]  # resuelta a hoy


def test_validacion_conceptos_vacios():
    assert client.post("/evaluaciones", json={"conceptos": []}).status_code == 422


def test_validacion_descripcion_vacia():
    assert client.post(
        "/evaluaciones", json={"conceptos": [{"descripcion": ""}]}
    ).status_code == 422


def test_validacion_importe_negativo():
    assert client.post(
        "/evaluaciones", json={"conceptos": [{"descripcion": "Honorarios", "importe": -5}]}
    ).status_code == 422


def test_health_sin_db_no_se_cae():
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    # sin postgres: db reporta el motivo, reglas es null; la API sigue viva
