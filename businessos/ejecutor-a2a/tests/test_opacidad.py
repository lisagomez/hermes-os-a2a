"""Opacidad de la superficie A2A del Ejecutor (validacion Fase 2 del PRP-006).

Desde fuera SOLO existen: la Agent Card, el endpoint JSON-RPC y /health.
El interior (workspace, tabla tareas, supervisor, engine) es inalcanzable;
Starlette puro = sin /docs ni /openapi.json.
"""
from starlette.testclient import TestClient

from a2a.utils import AGENT_CARD_WELL_KNOWN_PATH, DEFAULT_RPC_URL

from app import build_app
from executor import EjecutorA2A

RUTAS_INTERNAS = [
    "/openapi.json",
    "/docs",
    "/redoc",
    "/tareas",
    "/workspace",
    "/worktree",
    "/engine",
    "/supervisor",
]


def app_de_prueba():
    return build_app(executor=EjecutorA2A(supervisor=object(), estado=object()))


def test_rutas_internas_inalcanzables():
    client = TestClient(app_de_prueba())
    for ruta in RUTAS_INTERNAS:
        r = client.get(ruta)
        assert r.status_code == 404, f"{ruta} respondio {r.status_code}: filtra interior"


def test_superficie_es_exactamente_card_rpc_y_health():
    """Inventario de rutas: si alguien agrega una, este test lo hace explicito."""
    paths = sorted(r.path for r in app_de_prueba().routes)
    assert paths == sorted([AGENT_CARD_WELL_KNOWN_PATH, DEFAULT_RPC_URL, "/health"])


def test_health_no_reporta_nada_del_workspace_ni_tareas():
    r = TestClient(app_de_prueba()).get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
