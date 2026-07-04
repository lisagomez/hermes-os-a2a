"""Tests del Agent Card del Supervisor (Fase 3 del PRP-006): juzga, no construye."""
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
    assert card.name == "supervisor-a2a"
    assert card.skills[0].id == "validar-resultado"


def test_card_capacidades_no_mienten():
    card = build_card()
    assert not card.capabilities.streaming
    assert not card.capabilities.push_notifications
    assert card.supported_interfaces[0].protocol_binding == "JSONRPC"
    assert card.supported_interfaces[0].url == DEFAULT_PUBLIC_URL


def test_card_url_configurable(monkeypatch):
    monkeypatch.setenv("SUPERVISOR_PUBLIC_URL", "https://ejemplo.mx/supervisor")
    card = build_card()
    assert card.supported_interfaces[0].url == "https://ejemplo.mx/supervisor"


def test_card_promete_juicio_con_fronteras_sin_interior():
    """Promete re-ejecutar y rechazar lo no comprobable; NO promete construir."""
    payload = json.dumps(json_format.MessageToDict(build_card())).lower()
    for prohibido in ("supabase", "service_role", "postgres", "software.toml", "token_usage"):
        assert prohibido not in payload, f"la card filtra interior: {prohibido}"
    assert "re-ejecut" in payload  # re-ejecuta, no confia
    assert "rechazo" in payload  # gate no ejecutable = rechazo
    for frontera in ("no construyo", "no decido"):
        assert frontera in payload, f"la card no declara la frontera: {frontera}"


def test_card_declara_modos_json():
    card = build_card()
    assert list(card.default_input_modes) == ["application/json"]
    assert list(card.default_output_modes) == ["application/json"]
