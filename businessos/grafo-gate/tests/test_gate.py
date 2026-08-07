"""Tests del grafo-gate: fail-closed, auth, mínimo privilegio y proxy."""
import sys
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import MAX_BODY, crear_app  # noqa: E402

TOKEN = "t" * 40
UPSTREAM = "http://grafo:3000"


def transporte_ok(respuesta_json: dict | None = None, status: int = 200) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url == f"{UPSTREAM}/evaluaciones"
        return httpx.Response(status, json=respuesta_json or {"conceptos": [], "disclaimer": "x"})

    return httpx.MockTransport(handler)


def cliente(transport: httpx.AsyncBaseTransport | None = None) -> TestClient:
    return TestClient(crear_app(token=TOKEN, upstream=UPSTREAM, transport=transport))


# --- fail-closed -------------------------------------------------------------

def test_sin_token_no_arranca():
    with pytest.raises(RuntimeError, match="fail-closed"):
        crear_app(token="", upstream=UPSTREAM)


def test_token_corto_no_arranca():
    with pytest.raises(RuntimeError, match="fail-closed"):
        crear_app(token="corto", upstream=UPSTREAM)


# --- auth --------------------------------------------------------------------

def test_sin_header_401():
    r = cliente(transporte_ok()).post("/evaluaciones", json={"x": 1})
    assert r.status_code == 401


def test_token_equivocado_401():
    r = cliente(transporte_ok()).post(
        "/evaluaciones", json={"x": 1}, headers={"Authorization": "Bearer nope" + "n" * 40}
    )
    assert r.status_code == 401


def test_token_correcto_proxy_200():
    r = cliente(transporte_ok({"conceptos": [{"estado": "permitido"}], "disclaimer": "d"})).post(
        "/evaluaciones", json={"x": 1}, headers={"Authorization": f"Bearer {TOKEN}"}
    )
    assert r.status_code == 200
    assert r.json()["conceptos"][0]["estado"] == "permitido"


# --- mínimo privilegio -------------------------------------------------------

def test_solo_evaluaciones_existe():
    c = cliente(transporte_ok())
    auth = {"Authorization": f"Bearer {TOKEN}"}
    assert c.get("/reglas", headers=auth).status_code in (404, 405)
    assert c.get("/salud-conocimiento", headers=auth).status_code in (404, 405)
    assert c.get("/evaluaciones", headers=auth).status_code == 405  # solo POST


def test_health_publico_sin_token():
    r = cliente(transporte_ok()).get("/health")
    assert r.status_code == 200
    assert r.json()["servicio"] == "grafo-gate"


# --- límites y degradación declarada -----------------------------------------

def test_cuerpo_grande_413():
    r = cliente(transporte_ok()).post(
        "/evaluaciones",
        content=b"x" * (MAX_BODY + 1),
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
    )
    assert r.status_code == 413


def test_upstream_caido_502():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("boom", request=request)

    r = cliente(httpx.MockTransport(handler)).post(
        "/evaluaciones", json={"x": 1}, headers={"Authorization": f"Bearer {TOKEN}"}
    )
    assert r.status_code == 502


def test_status_del_grafo_se_respeta():
    r = cliente(transporte_ok({"error": "cuerpo invalido"}, status=422)).post(
        "/evaluaciones", json={"x": 1}, headers={"Authorization": f"Bearer {TOKEN}"}
    )
    assert r.status_code == 422
