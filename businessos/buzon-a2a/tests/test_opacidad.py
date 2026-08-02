"""Opacidad de la superficie A2A: solo {card, rpc, /health} (patron grafo-a2a).

El interior del buzon (correos, gates, buzones, bitacora) es inalcanzable.
"""
from starlette.testclient import TestClient

from a2a.utils import AGENT_CARD_WELL_KNOWN_PATH, DEFAULT_RPC_URL

from app import build_app

RUTAS_INTERNAS_DEL_BUZON = [
    "/correos",
    "/correos_entrantes",
    "/correos_salientes",
    "/buzones",
    "/bitacora",
    "/gates",
    "/openapi.json",
    "/docs",
    "/redoc",
]


def test_rutas_internas_inalcanzables():
    client = TestClient(build_app())
    for ruta in RUTAS_INTERNAS_DEL_BUZON:
        r = client.get(ruta)
        assert r.status_code == 404, f"{ruta} respondio {r.status_code}: filtra interior"


def test_superficie_es_exactamente_card_rpc_y_health():
    paths = sorted(r.path for r in build_app().routes)
    assert paths == sorted([AGENT_CARD_WELL_KNOWN_PATH, DEFAULT_RPC_URL, "/health"])


def test_health_no_reporta_nada_del_buzon():
    r = TestClient(build_app()).get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
