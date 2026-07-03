"""Opacidad de la superficie A2A (Fase 3 del PRP-005; criterio de exito, no detalle).

Desde fuera SOLO existen: la Agent Card, el endpoint JSON-RPC y /health.
El interior del grafo (evaluaciones persistidas, salud del conocimiento,
reglas, seed) y toda introspeccion (openapi/docs) son inalcanzables.
"""
from starlette.testclient import TestClient

from a2a.utils import AGENT_CARD_WELL_KNOWN_PATH, DEFAULT_RPC_URL

from app import build_app

RUTAS_INTERNAS_DEL_GRAFO = [
    "/evaluaciones",
    "/evaluaciones?limit=100",
    "/salud-conocimiento",
    "/openapi.json",
    "/docs",
    "/redoc",
    "/reglas",
    "/seed",
]


def test_rutas_internas_inalcanzables():
    client = TestClient(build_app())
    for ruta in RUTAS_INTERNAS_DEL_GRAFO:
        r = client.get(ruta)
        assert r.status_code == 404, f"{ruta} respondio {r.status_code}: filtra interior"


def test_superficie_es_exactamente_card_rpc_y_health():
    """Inventario de rutas: si alguien agrega una, este test lo hace explicito."""
    paths = sorted(r.path for r in build_app().routes)
    assert paths == sorted([AGENT_CARD_WELL_KNOWN_PATH, DEFAULT_RPC_URL, "/health"])


def test_health_no_reporta_nada_del_grafo():
    r = TestClient(build_app()).get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
