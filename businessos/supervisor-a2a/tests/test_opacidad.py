"""Opacidad de la superficie A2A del Supervisor (PRP-006).

Desde fuera SOLO existen: la Agent Card, el endpoint JSON-RPC y /health.
Las reglas, los worktrees y los veredictos NO se exponen; Starlette puro =
sin /docs ni /openapi.json.
"""
from starlette.testclient import TestClient

from a2a.utils import AGENT_CARD_WELL_KNOWN_PATH, DEFAULT_RPC_URL

from app import build_app

RUTAS_INTERNAS = [
    "/openapi.json",
    "/docs",
    "/redoc",
    "/reglas",
    "/gates",
    "/veredictos",
    "/tareas",
    "/workspace",
]


def test_rutas_internas_inalcanzables():
    client = TestClient(build_app())
    for ruta in RUTAS_INTERNAS:
        r = client.get(ruta)
        assert r.status_code == 404, f"{ruta} respondio {r.status_code}: filtra interior"


def test_superficie_es_exactamente_card_rpc_y_health():
    paths = sorted(r.path for r in build_app().routes)
    assert paths == sorted([AGENT_CARD_WELL_KNOWN_PATH, DEFAULT_RPC_URL, "/health"])


def test_health_no_reporta_reglas_ni_veredictos():
    r = TestClient(build_app()).get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
