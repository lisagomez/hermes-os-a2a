"""Tests del Agent Card de ventas (Fase 9): promesa comercial honesta, sin interior."""
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
    assert card.name == "ventas-a2a"
    assert card.skills[0].id == "recibir-interes"


def test_card_capacidades_no_mienten():
    card = build_card()
    assert not card.capabilities.streaming
    assert not card.capabilities.push_notifications
    assert card.supported_interfaces[0].protocol_binding == "JSONRPC"
    assert card.supported_interfaces[0].url == DEFAULT_PUBLIC_URL


def test_card_url_configurable(monkeypatch):
    monkeypatch.setenv("VENTAS_PUBLIC_URL", "https://ventas.ejemplo.mx/a2a")
    card = build_card()
    assert card.supported_interfaces[0].url == "https://ventas.ejemplo.mx/a2a"


def test_card_declara_fronteras_negativas():
    """Honestidad comercial DESDE la card: lo que este agente NO hace, literal."""
    payload = json.dumps(json_format.MessageToDict(build_card())).lower()
    for frontera in ("no cierro tratos", "no fijo precios", "no firmo", "no envio correos"):
        assert frontera in payload, f"la card no declara su frontera: {frontera!r}"
    assert "supervision" in payload  # la promesa dice que hay supervision, no autonomia


def test_card_no_expone_interior():
    """Ni Supabase, ni la tabla, ni endpoints internos: solo la promesa."""
    payload = json.dumps(json_format.MessageToDict(build_card())).lower()
    for prohibido in ("supabase", "service_role", "leads?", "rest/v1", "postgres"):
        assert prohibido not in payload, f"la card filtra interior: {prohibido}"
