"""La Agent Card promete lo justo: skill mail, JSONRPC, sin streaming."""
from __future__ import annotations

from google.protobuf import json_format
from starlette.testclient import TestClient

from a2a.types import AgentCard
from a2a.utils import AGENT_CARD_WELL_KNOWN_PATH

from app import build_app


def card_publicada() -> AgentCard:
    r = TestClient(build_app()).get(AGENT_CARD_WELL_KNOWN_PATH)
    assert r.status_code == 200
    return json_format.ParseDict(r.json(), AgentCard(), ignore_unknown_fields=True)


def test_card_valida_y_con_skill_mail():
    card = card_publicada()
    assert card.name == "buzon-a2a"
    assert [s.id for s in card.skills] == ["mail"]
    assert not card.capabilities.streaming


def test_binding_jsonrpc():
    card = card_publicada()
    assert card.supported_interfaces[0].protocol_binding == "JSONRPC"


def test_frontera_no_envia_en_la_descripcion():
    card = card_publicada()
    assert "no puedo enviar" in card.description


def test_url_configurable_por_env(monkeypatch):
    monkeypatch.setenv("BUZON_PUBLIC_URL", "https://buzon.ejemplo.com")
    card = card_publicada()
    assert card.supported_interfaces[0].url == "https://buzon.ejemplo.com"
