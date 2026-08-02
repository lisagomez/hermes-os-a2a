"""card.py — Agent Card de enriquecimiento-a2a (App A, Waterfall Enrichment).

La card promete EXACTAMENTE lo que la cascada puede producir (email, telefono,
razon_social) y declara sus fronteras negativas literales: el RFC solo se
VALIDA (no se produce), no se escribe public.leads, no se contacta a nadie,
no se toma ninguna decision comercial, y el gate 69-B es fail-closed (sin
vigilancia previa del RFC, bloqueado). La `url` sale de
ENRIQUECIMIENTO_PUBLIC_URL para que la card no mienta si algun dia se publica.
"""
from __future__ import annotations

import os

from a2a.types import AgentCapabilities, AgentCard, AgentInterface, AgentSkill
from a2a.utils import TransportProtocol

DEFAULT_PUBLIC_URL = "http://enriquecimiento-a2a:5000"

MODO_JSON = "application/json"

EJEMPLO = (
    '{"lead_id": "lead-123", "campos": ["email", "telefono"], '
    '"rfc": "ABC680524P73", "nombre": "Maria", "apellido": "Lopez"}'
)


def build_card() -> AgentCard:
    """Construye la Agent Card. Lee env en cada llamada (testeable con monkeypatch)."""
    url = os.environ.get("ENRIQUECIMIENTO_PUBLIC_URL", DEFAULT_PUBLIC_URL)

    skill = AgentSkill(
        id="enriquecer-lead",
        name="Enriquecer un lead (waterfall por fuentes publicas)",
        description=(
            "Enriquezco un lead existente con email, telefono y/o razon social "
            "usando una cascada ordenada por costo: validacion local del RFC "
            "provisto, DENUE (INEGI, fuente publica oficial), vigilancia 69-B "
            "CFF (fail-closed: RFC sin consultar = bloqueado) e inferencia de "
            "correo por patron de dominio (siempre veredicto 'dudoso'). Cada "
            "intento queda en un ledger con su costo; cada hallazgo cita su "
            "fuente. El enriquecimiento de personas fisicas queda bloqueado "
            "mientras el grafo regulatorio (LFPDPPP 2025) no lo permita. "
            "Fronteras: NO produzco RFCs (solo valido el provisto), NO escribo "
            "en la tabla de leads, NO contacto a nadie y NO decido nada "
            "comercial — entrego hallazgos con procedencia y un humano decide."
        ),
        tags=["enriquecimiento", "leads", "waterfall", "denue", "69-b",
              "lfpdppp", "compliance", "adquisicion"],
        examples=[EJEMPLO, '{"lead_id": "lead-123"}'],
        input_modes=[MODO_JSON],
        output_modes=[MODO_JSON],
    )

    return AgentCard(
        name="enriquecimiento-a2a",
        description=(
            "Waterfall enrichment del departamento de adquisicion: completo "
            "datos de contacto de leads B2B desde fuentes publicas oficiales, "
            "con gate regulatorio del grafo (LFPDPPP 2025), gate 69-B CFF "
            "fail-closed y ledger de costos por intento. No escribo leads, no "
            "contacto a nadie, no tomo decisiones comerciales."
        ),
        version="1.0.0",
        supported_interfaces=[
            AgentInterface(url=url, protocol_binding=TransportProtocol.JSONRPC)
        ],
        capabilities=AgentCapabilities(streaming=False, push_notifications=False),
        default_input_modes=[MODO_JSON],
        default_output_modes=[MODO_JSON],
        skills=[skill],
    )
