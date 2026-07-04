"""Tests del Agent Card del Coordinador (Fase 7): promesa honesta, sin interior."""
import json

from google.protobuf import json_format
from starlette.testclient import TestClient

from a2a.types import AgentCard
from a2a.utils import AGENT_CARD_WELL_KNOWN_PATH

from app import build_app
from card import DEFAULT_PUBLIC_URL, build_card
from executor import CoordinadorA2A


def app_de_prueba():
    """App sin dependencias reales (el executor no se ejercita en estos tests)."""
    return build_app(executor=CoordinadorA2A(planner=object(), estado=object()))


def test_card_servida_en_well_known():
    """El path vigente es agent-card.json (los tutoriales viejos usan agent.json)."""
    client = TestClient(app_de_prueba())
    r = client.get(AGENT_CARD_WELL_KNOWN_PATH)
    assert r.status_code == 200
    card = json_format.ParseDict(r.json(), AgentCard(), ignore_unknown_fields=True)
    assert card.name == "coordinador-a2a"
    assert card.skills[0].id == "coordinar-enjambre"


def test_card_capacidades_no_mienten():
    card = build_card()
    assert not card.capabilities.streaming
    assert not card.capabilities.push_notifications
    assert card.supported_interfaces[0].protocol_binding == "JSONRPC"
    assert card.supported_interfaces[0].url == DEFAULT_PUBLIC_URL


def test_card_url_configurable(monkeypatch):
    monkeypatch.setenv("COORDINADOR_PUBLIC_URL", "https://ejemplo.mx/coordinador")
    card = build_card()
    assert card.supported_interfaces[0].url == "https://ejemplo.mx/coordinador"


def test_card_promesa_con_fronteras_sin_interior():
    """Promete descomponer+coordinar con criterios; NO decide merge/deploy ni se
    auto-aprueba. Y no filtra infraestructura interna."""
    payload = json.dumps(json_format.MessageToDict(build_card())).lower()
    for prohibido in ("supabase", "service_role", "postgres", "ejecutor-a2a:", "supervisor-a2a:", "token_usage"):
        assert prohibido not in payload, f"la card filtra interior: {prohibido}"
    assert "criterios de aceptacion" in payload
    for frontera in ("no decido merge/deploy", "no me auto-apruebo"):
        assert frontera in payload, f"la card no declara la frontera: {frontera}"


def test_card_declara_modos_json():
    card = build_card()
    assert list(card.default_input_modes) == ["application/json"]
    assert list(card.default_output_modes) == ["application/json"]
