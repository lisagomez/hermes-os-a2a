"""card.py — Agent Card del grafo-a2a (Fase 5, PRP-005).

La card es la promesa publica del agente: UNA capacidad (evaluar impacto
regulatorio con fuente citada) y NADA del interior del grafo (reglas, seed,
endpoints operativos). La `url` sale de GRAFO_A2A_PUBLIC_URL para que la card
no mienta el dia que el servicio se publique detras de auth (residual futuro).
"""
from __future__ import annotations

import os

from a2a.types import AgentCapabilities, AgentCard, AgentInterface, AgentSkill
from a2a.utils import TransportProtocol

DEFAULT_PUBLIC_URL = "http://grafo-a2a:4000"

MODO_JSON = "application/json"
MODO_TEXTO = "text/plain"

EJEMPLO_ESTRUCTURADO = (
    '{"contexto": {"jurisdiccion": "MX", "dimension": "fiscal", "fecha": "2026-06-15"}, '
    '"conceptos": [{"descripcion": "Honorarios de consultoria fiscal", "importe": 12000}]}'
)


def build_card() -> AgentCard:
    """Construye la Agent Card. Lee env en cada llamada (testeable con monkeypatch)."""
    url = os.environ.get("GRAFO_A2A_PUBLIC_URL", DEFAULT_PUBLIC_URL)

    skill = AgentSkill(
        id="evaluar-impacto-regulatorio",
        name="Evaluar impacto regulatorio",
        description=(
            "Evalua conceptos de gasto/clausulas y devuelve veredicto por concepto "
            "(deducible/no_deducible/dudoso), banderas rojas, checklist de requisitos "
            "y fuentes citadas (ley, articulo, URL). Fail-safe: lo no clasificable "
            "sale 'dudoso'. La respuesta SIEMPRE incluye disclaimer: senala riesgos, "
            "NO es asesoria."
        ),
        tags=[
            "fiscal", "contable", "contractual", "regulatorio", "datos-personales",
            "comercio-exterior", "aduanas", "LATAM", "MX", "CO", "compliance",
        ],
        examples=[
            EJEMPLO_ESTRUCTURADO,
            "Honorarios de consultoria fiscal por 12000 MXN",
        ],
        input_modes=[MODO_JSON, MODO_TEXTO],
        output_modes=[MODO_JSON],
    )

    return AgentCard(
        name="grafo-a2a",
        description=(
            "Evaluo impacto fiscal, contable, contractual, regulatorio, de datos "
            "personales y de comercio exterior en LATAM (hoy MX y CO) con veredicto "
            "por concepto y fuente citada. Senalo riesgos; NO asesoro: toda respuesta "
            "incluye disclaimer y fuentes."
        ),
        version="1.0.0",
        supported_interfaces=[
            AgentInterface(url=url, protocol_binding=TransportProtocol.JSONRPC)
        ],
        capabilities=AgentCapabilities(streaming=False, push_notifications=False),
        default_input_modes=[MODO_JSON, MODO_TEXTO],
        default_output_modes=[MODO_JSON],
        skills=[skill],
    )
