"""card.py — Agent Card del Coordinador del enjambre (Fase 7, PRP-007).

Promesa honesta (SPEC-trio §6, extendida): descompongo UNA feature grande en un
DAG de sub-tareas, coordino un enjambre ACOTADO de Ejecutores (tope de fan-out +
presupuesto), integro lo aprobado y entrego una rama integrada verificada de cero
por el Supervisor — o escalo. NO decido si mergear/desplegar (eso es del humano),
NO me auto-apruebo, NO resuelvo conflictos de merge con un modelo.
"""
from __future__ import annotations

import os

from a2a.types import AgentCapabilities, AgentCard, AgentInterface, AgentSkill
from a2a.utils import TransportProtocol

DEFAULT_PUBLIC_URL = "http://coordinador-a2a:4300"

MODO_JSON = "application/json"

EJEMPLO_TAREA = (
    '{"task_id": "cuentas-2026-0007", "objetivo": "Modulo de cuentas: registro con '
    'Google, perfil editable, panel admin y emails de bienvenida", '
    '"contexto": {"repo": "recetas"}, '
    '"criterios_aceptacion": ["build, typecheck y lint verdes en el todo integrado"], '
    '"limites": {"fan_out_max": 3, "presupuesto_usd": 5.0}}'
)


def build_card() -> AgentCard:
    """Construye la Agent Card. Lee env en cada llamada (testeable con monkeypatch)."""
    url = os.environ.get("COORDINADOR_PUBLIC_URL", DEFAULT_PUBLIC_URL)

    skill = AgentSkill(
        id="coordinar-enjambre",
        name="Coordinar un enjambre de software",
        description=(
            "Recibo UNA feature grande con criterios de aceptacion globales, la "
            "descompongo en un DAG de sub-tareas de alcance disjunto y coordino un "
            "enjambre ACOTADO de Ejecutores (tope de fan-out y presupuesto). Integro "
            "las ramas aprobadas y pido una verificacion FINAL del Supervisor sobre el "
            "todo integrado; entrego una rama integrada verificable — o escalo con el "
            "motivo. NO decido merge/deploy, NO me auto-apruebo, NO resuelvo conflictos "
            "de merge con un modelo."
        ),
        tags=["software", "enjambre", "swarm", "coordinador", "trio", "departamento"],
        examples=[EJEMPLO_TAREA],
        input_modes=[MODO_JSON],
        output_modes=[MODO_JSON],
    )

    return AgentCard(
        name="coordinador-a2a",
        description=(
            "Coordinador del enjambre (Fase 7): descompongo una feature grande en "
            "sub-tareas, coordino un enjambre acotado de Ejecutores (fan-out + "
            "presupuesto), integro lo aprobado y entrego una rama integrada verificada "
            "de cero por el Supervisor — o escalo. No decido merge/deploy, no me "
            "auto-apruebo."
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
