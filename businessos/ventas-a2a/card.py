"""card.py — Agent Card de ventas-a2a (Fase 9, departamento adquisicion).

La card es la puerta COMERCIAL publica: un agente de terceros descubre la
oferta white-label y deja su interes. La promesa incluye sus fronteras
negativas LITERALES: este agente no cierra tratos, no fija precios finales,
no firma contratos y no envia correos — registra el interes, comparte la
oferta aprobada y un humano da seguimiento. La `url` sale de
VENTAS_PUBLIC_URL para que la card no mienta el dia que se publique.
"""
from __future__ import annotations

import os

from a2a.types import AgentCapabilities, AgentCard, AgentInterface, AgentSkill
from a2a.utils import TransportProtocol

DEFAULT_PUBLIC_URL = "http://ventas-a2a:4400"

MODO_JSON = "application/json"
MODO_TEXTO = "text/plain"

EJEMPLO_LEAD = (
    '{"empresa": "ACME S.A.", "contacto": "maria@acme.mx", '
    '"mensaje": "Nos interesa el departamento de software white-label", '
    '"presupuesto": 2000}'
)


def build_card() -> AgentCard:
    """Construye la Agent Card. Lee env en cada llamada (testeable con monkeypatch)."""
    url = os.environ.get("VENTAS_PUBLIC_URL", DEFAULT_PUBLIC_URL)

    skill = AgentSkill(
        id="recibir-interes",
        name="Recibir interes comercial (lead)",
        description=(
            "Registro tu interes en el departamento de software con IA bajo "
            "supervision (white-label) y te comparto la oferta publica aprobada: "
            "que incluye, rango de precios de referencia y siguientes pasos. "
            "Un humano del equipo da seguimiento a cada lead. Fronteras: NO "
            "cierro tratos, NO fijo precios finales, NO firmo contratos y NO "
            "envio correos — cualquier termino lo negocia y aprueba un humano."
        ),
        tags=["ventas", "white-label", "software", "leads", "adquisicion", "departamento"],
        examples=[
            EJEMPLO_LEAD,
            "Nos interesa un departamento de desarrollo con IA; contacto: maria@acme.mx",
        ],
        input_modes=[MODO_JSON, MODO_TEXTO],
        output_modes=[MODO_JSON],
    )

    return AgentCard(
        name="ventas-a2a",
        description=(
            "Puerta comercial del departamento de adquisicion: recibo interes en "
            "el white-label (su departamento de software con IA bajo supervision, "
            "con su marca) y comparto la oferta publica. No cierro tratos, no "
            "fijo precios finales, no firmo contratos, no envio correos: registro "
            "tu interes y un humano da seguimiento."
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
