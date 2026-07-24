"""Tests del Agent Card de transcripcion: promesa honesta, sin interior."""
import json

from google.protobuf import json_format
from starlette.testclient import TestClient

from a2a.types import AgentCard
from a2a.utils import AGENT_CARD_WELL_KNOWN_PATH

from app import build_app
from card import DEFAULT_PUBLIC_URL, build_card


def test_card_servida_en_well_known():
    client = TestClient(build_app())
    r = client.get(AGENT_CARD_WELL_KNOWN_PATH)
    assert r.status_code == 200
    card = json_format.ParseDict(r.json(), AgentCard(), ignore_unknown_fields=True)
    assert card.name == "transcripcion-a2a"
    assert card.skills[0].id == "transcribir-entrevista"


def test_card_capacidades_no_mienten():
    card = build_card()
    assert not card.capabilities.streaming
    assert not card.capabilities.push_notifications
    assert card.supported_interfaces[0].protocol_binding == "JSONRPC"
    assert card.supported_interfaces[0].url == DEFAULT_PUBLIC_URL


def test_card_url_desde_env(monkeypatch):
    monkeypatch.setenv("TRANSCRIPCION_PUBLIC_URL", "https://stt.ejemplo.mx")
    assert build_card().supported_interfaces[0].url == "https://stt.ejemplo.mx"


def test_card_declara_fronteras_negativas():
    """La card promete lo que NO hace (fidelidad, no interpretacion)."""
    texto = json.dumps(json_format.MessageToDict(build_card())).lower()
    for frontera in ("no resumo", "no interpreto", "no opino"):
        assert frontera in texto, f"la card no declara la frontera: {frontera!r}"
