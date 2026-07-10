"""Opacidad de la superficie A2A de ventas (Fase 9).

Desde fuera SOLO existen: la Agent Card, el endpoint JSON-RPC y /health.
Los leads registrados y toda introspeccion (openapi/docs) son inalcanzables:
la puerta comercial recibe, jamas lista.
"""
from starlette.testclient import TestClient

from app import build_app

RUTAS_QUE_NO_DEBEN_EXISTIR = [
    "/leads",
    "/leads?limit=100",
    "/oferta",
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
