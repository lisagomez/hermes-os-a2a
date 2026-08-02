"""card.py — Agent Card de buzon-a2a (SPEC-buzon-a2a, HERALDO-6).

La card es la promesa publica: UNA skill ("mail") con la frontera dura en la
descripcion — este agente redacta y clasifica, JAMAS envia. Nada del interior
(tablas, gates, proveedores) se expone. La `url` sale de BUZON_PUBLIC_URL.
"""
from __future__ import annotations

import os

from a2a.types import AgentCapabilities, AgentCard, AgentInterface, AgentSkill
from a2a.utils import TransportProtocol

DEFAULT_PUBLIC_URL = "http://buzon-a2a:4900"

MODO_JSON = "application/json"

EJEMPLO_LEER = '{"accion": "leer", "hilo_id": "<id-del-hilo>"}'
EJEMPLO_REDACTAR = (
    '{"accion": "redactar", "correo_entrante_id": "<uuid>", "clase": "acuse_recibo"}'
)


def build_card() -> AgentCard:
    """Construye la Agent Card. Lee env en cada llamada (testeable con monkeypatch)."""
    url = os.environ.get("BUZON_PUBLIC_URL", DEFAULT_PUBLIC_URL)

    skill = AgentSkill(
        id="mail",
        name="Correo institucional operado por agentes",
        description=(
            "Lee hilos de correo SANEADOS (cuarentena: salida tipada con "
            "referencias) y redacta borradores de respuesta que pasan 11 gates "
            "deterministas. NUNCA envia: todo saliente exige firma humana (A5) "
            "y el envio lo hace un job aparte sin modelo. Autonomia acotada por "
            "politica de aprobacion (ISO/IEC 42001, supervision humana)."
        ),
        tags=["mail", "correo", "buzon", "aprobacion-humana", "compliance"],
        examples=[EJEMPLO_LEER, EJEMPLO_REDACTAR],
        input_modes=[MODO_JSON],
        output_modes=[MODO_JSON],
    )

    return AgentCard(
        name="buzon-a2a",
        description=(
            "Gestor de correo institucional operado por agentes con aprobacion "
            "humana obligatoria: redacto borradores bajo gates deterministas; "
            "no tengo credenciales de correo y no puedo enviar."
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
