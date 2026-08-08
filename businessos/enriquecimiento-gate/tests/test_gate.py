"""Tests del enriquecimiento-gate: fail-closed, auth, minimo privilegio y proxy."""
import json
import sys
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import MAX_BODY, crear_app  # noqa: E402

TOKEN = "t" * 40
UPSTREAM = "http://enriquecimiento-a2a:5000"
RPC_OK = {"jsonrpc": "2.0", "id": "1", "method": "SendMessage",
          "params": {"message": {"messageId": "m1", "role": "ROLE_USER",
                                 "parts": [{"data": {"lead_id": "lead-1"}}]}}}


def transporte(status: int = 200, espia: dict | None = None) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url) == f"{UPSTREAM}/"
        if espia is not None:
            espia["headers"] = dict(request.headers)
            espia["body"] = request.content.decode()
        return httpx.Response(status, json={"result": {"task": {"status": {"state": "TASK_STATE_COMPLETED"}}}})

    return httpx.MockTransport(handler)


def cliente(transport: httpx.AsyncBaseTransport | None = None) -> TestClient:
    return TestClient(crear_app(token=TOKEN, upstream=UPSTREAM, transport=transport))


# --- fail-closed -------------------------------------------------------------

def test_sin_token_no_arranca():
    with pytest.raises(RuntimeError, match="fail-closed"):
        crear_app(token="", upstream=UPSTREAM)


def test_token_corto_no_arranca():
    with pytest.raises(RuntimeError, match="32"):
        crear_app(token="corto", upstream=UPSTREAM)


# --- auth --------------------------------------------------------------------

def test_sin_authorization_401():
    assert cliente(transporte()).post("/rpc", json=RPC_OK).status_code == 401


def test_token_incorrecto_401():
    r = cliente(transporte()).post("/rpc", json=RPC_OK, headers={"Authorization": "Bearer otro"})
    assert r.status_code == 401


def test_con_token_pasa():
    r = cliente(transporte()).post("/rpc", json=RPC_OK, headers={"Authorization": f"Bearer {TOKEN}"})
    assert r.status_code == 200


# --- minimo privilegio -------------------------------------------------------

def test_solo_pasa_sendmessage():
    """Un gate que reenvia cualquier metodo del protocolo no es minimo
    privilegio, es un tunel."""
    malo = dict(RPC_OK, method="tasks/cancel")
    r = cliente(transporte()).post("/rpc", json=malo, headers={"Authorization": f"Bearer {TOKEN}"})
    assert r.status_code == 403
    assert "no permitido" in r.json()["error"]


def test_cuerpo_no_json_400():
    r = cliente(transporte()).post("/rpc", content=b"no soy json",
                                   headers={"Authorization": f"Bearer {TOKEN}",
                                            "content-type": "application/json"})
    assert r.status_code == 400


def test_health_no_exige_token_y_no_habla_del_upstream():
    body = cliente().get("/health").json()
    assert body == {"ok": True, "servicio": "enriquecimiento-gate"}


def test_sin_openapi_ni_docs():
    c = cliente()
    for ruta in ("/openapi.json", "/docs", "/redoc"):
        assert c.get(ruta).status_code == 404


def test_solo_la_ruta_rpc_existe():
    c = cliente()
    for ruta in ("/", "/evaluaciones", "/leads"):
        assert c.post(ruta, json=RPC_OK,
                      headers={"Authorization": f"Bearer {TOKEN}"}).status_code in (404, 405)


# --- proxy -------------------------------------------------------------------

def test_reenvia_el_header_de_version_del_protocolo():
    """Sin `A2A-Version: 1.0` el upstream responde -32009 (gotcha 2026-07-03).
    Lo pone el gate para que el cliente publico no tenga que saberlo."""
    espia: dict = {}
    cliente(transporte(espia=espia)).post("/rpc", json=RPC_OK,
                                          headers={"Authorization": f"Bearer {TOKEN}"})
    assert espia["headers"]["a2a-version"] == "1.0"
    assert json.loads(espia["body"])["method"] == "SendMessage"


def test_cuerpo_demasiado_grande_413():
    grande = dict(RPC_OK)
    grande["params"] = {"relleno": "x" * (MAX_BODY + 10)}
    r = cliente(transporte()).post("/rpc", json=grande, headers={"Authorization": f"Bearer {TOKEN}"})
    assert r.status_code == 413


def test_upstream_caido_502_y_no_silencioso(capfd):
    def boom(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("sin ruta")

    r = cliente(httpx.MockTransport(boom)).post(
        "/rpc", json=RPC_OK, headers={"Authorization": f"Bearer {TOKEN}"})
    assert r.status_code == 502
    assert "upstream inalcanzable" in capfd.readouterr().out
