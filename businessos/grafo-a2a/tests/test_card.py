"""Tests del Agent Card (Fase 1 del PRP-005): la promesa publica, sin interior."""
import json

from google.protobuf import json_format
from starlette.testclient import TestClient

from a2a.types import AgentCard
from a2a.utils import AGENT_CARD_WELL_KNOWN_PATH

from app import build_app
from card import DEFAULT_PUBLIC_URL, build_card


def test_card_servida_en_well_known():
    """El path vigente es agent-card.json (los tutoriales viejos usan agent.json)."""
    client = TestClient(build_app())
    r = client.get(AGENT_CARD_WELL_KNOWN_PATH)
    assert r.status_code == 200
    # El payload valida contra el tipo AgentCard del SDK instalado. El SDK agrega
    # campos de compat v0.3 (p.ej. preferredTransport) que el proto v1 no tiene.
    card = json_format.ParseDict(r.json(), AgentCard(), ignore_unknown_fields=True)
    assert card.name == "grafo-a2a"
    assert card.skills[0].id == "evaluar-impacto-regulatorio"


def test_card_capacidades_no_mienten():
    """Streaming/push en falso mientras no existan de verdad (gotcha PRP)."""
    card = build_card()
    assert not card.capabilities.streaming
    assert not card.capabilities.push_notifications
    assert card.supported_interfaces[0].protocol_binding == "JSONRPC"
    assert card.supported_interfaces[0].url == DEFAULT_PUBLIC_URL


def test_card_url_configurable(monkeypatch):
    monkeypatch.setenv("GRAFO_A2A_PUBLIC_URL", "https://ejemplo.mx/a2a")
    card = build_card()
    assert card.supported_interfaces[0].url == "https://ejemplo.mx/a2a"


def test_card_anuncia_capacidad_sin_exponer_interior():
    """Opacidad desde la card: ni endpoints internos ni infraestructura del grafo."""
    payload = json.dumps(json_format.MessageToDict(build_card())).lower()
    for prohibido in ("salud-conocimiento", "/evaluaciones", "postgres", "seed", "grafo:3000"):
        assert prohibido not in payload, f"la card filtra interior: {prohibido}"
    # La promesa si declara la regla de oro: disclaimer y fuente citada.
    assert "disclaimer" in payload
    assert "fuente" in payload


def test_card_declara_modos_json_y_texto():
    card = build_card()
    assert "application/json" in card.default_input_modes
    assert "text/plain" in card.default_input_modes
    assert list(card.default_output_modes) == ["application/json"]
