"""Opacidad de la superficie A2A de enriquecimiento (App A).

Desde fuera SOLO existen: la Agent Card, el endpoint JSON-RPC y /health.
Ledger, consolidado, vigilancia 69-B y toda introspeccion (openapi/docs)
son inalcanzables.
"""
from starlette.testclient import TestClient

from app import build_app

RUTAS_QUE_NO_DEBEN_EXISTIR = [
    "/leads",
    "/intentos",
    "/enriquecimiento_intento",
    "/lead_enriquecimiento",
    "/contraparte_69b",
    "/override_69b",
    "/evaluaciones",
    "/openapi.json",
    "/docs",
    "/redoc",
]


def test_rutas_internas_inalcanzables():
    client = TestClient(build_app())
    for ruta in RUTAS_QUE_NO_DEBEN_EXISTIR:
        r = client.get(ruta)
        assert r.status_code == 404, f"{ruta} respondio {r.status_code}: filtra interior"


def test_health_no_filtra_nada():
    r = TestClient(build_app()).get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_card_publicada():
    r = TestClient(build_app()).get("/.well-known/agent-card.json")
    assert r.status_code == 200
    assert r.json()["name"] == "enriquecimiento-a2a"
