"""card.py — Agent Card del Ejecutor (Fase 6, PRP-006).

Promesa honesta (SPEC-trio §6): construye software a partir de UNA tarea con
criterios de aceptacion, en un workspace aislado, y entrega un resultado
verificable. NO promete decidir alcance, aprobarse a si mismo, ni desplegar.
"""
from __future__ import annotations

import os

from a2a.types import AgentCapabilities, AgentCard, AgentInterface, AgentSkill
from a2a.utils import TransportProtocol

DEFAULT_PUBLIC_URL = "http://ejecutor-a2a:4100"

MODO_JSON = "application/json"

EJEMPLO_TAREA = (
    '{"task_id": "rec-2026-0042", "objetivo": "Auth email+password y Google OAuth", '
    '"contexto": {"repo": "recetas"}, '
    '"criterios_aceptacion": ["build, typecheck y lint verdes"], '
    '"limites": {"intentos_max": 3}}'
)


def build_card() -> AgentCard:
    """Construye la Agent Card. Lee env en cada llamada (testeable con monkeypatch)."""
    url = os.environ.get("EJECUTOR_PUBLIC_URL", DEFAULT_PUBLIC_URL)

    skill = AgentSkill(
        id="construir-software",
        name="Construir y modificar software (en cola)",
        description=(
            "Recibo UNA tarea de desarrollo con criterios de aceptacion y la ENCOLO: "
            "respondo al instante {encolada, posicion, en_ejecucion, cola} — NO devuelvo "
            "el veredicto (la construccion tarda minutos y se ejecuta de una en una, en "
            "orden). Luego un worker unico la realiza en un workspace aislado (git "
            "worktree por tarea, nunca sobre main) y un Supervisor independiente la juzga; "
            "el desenlace se consulta en el snapshot `tareas.json` o llega avisado a "
            "#dep-desarrollo. Yo NO decido el alcance, NO me auto-apruebo y NO despliego."
        ),
        tags=["software", "desarrollo", "worktree", "trio", "departamento"],
        examples=[EJEMPLO_TAREA],
        input_modes=[MODO_JSON],
        output_modes=[MODO_JSON],
    )

    return AgentCard(
        name="ejecutor-a2a",
        description=(
            "Ejecutor del trio: ENCOLO tareas de software y las ejecuto de una en una "
            "(worker unico, serial) en un workspace aislado; el resultado lo juzga un "
            "Supervisor independiente. Al enviarme una tarea respondo su POSICION EN LA "
            "COLA, no el veredicto. No decido alcance, no me auto-apruebo, no despliego."
        ),
        version="2.0.0",  # la respuesta cambio de {resultado,veredicto} a {encolada,posicion}
        supported_interfaces=[
            AgentInterface(url=url, protocol_binding=TransportProtocol.JSONRPC)
        ],
        capabilities=AgentCapabilities(streaming=False, push_notifications=False),
        default_input_modes=[MODO_JSON],
        default_output_modes=[MODO_JSON],
        skills=[skill],
    )
