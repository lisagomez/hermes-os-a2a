"""card.py — Agent Card del Supervisor (Fase 6, PRP-006).

Promesa honesta (SPEC-trio §6): valida un RESULTADO contra las reglas del
departamento re-ejecutando los gates el mismo sobre el worktree. NO construye
software, NO decide alcance, NO confia en afirmaciones del Ejecutor.
"""
from __future__ import annotations

import os

from a2a.types import AgentCapabilities, AgentCard, AgentInterface, AgentSkill
from a2a.utils import TransportProtocol

DEFAULT_PUBLIC_URL = "http://supervisor-a2a:4200"

MODO_JSON = "application/json"

EJEMPLO_RESULTADO = (
    '{"task_id": "rec-2026-0042", "worktree": "worktree/rec-2026-0042", '
    '"diff": "diff --git a/src/auth.ts ...", "archivos": ["src/auth.ts"], '
    '"artefactos": {"build": "ok"}, "notas": "login implementado"}'
)


def build_card() -> AgentCard:
    """Construye la Agent Card. Lee env en cada llamada (testeable con monkeypatch)."""
    url = os.environ.get("SUPERVISOR_PUBLIC_URL", DEFAULT_PUBLIC_URL)

    skill = AgentSkill(
        id="validar-resultado",
        name="Validar un resultado contra las reglas del departamento",
        description=(
            "Recibo el RESULTADO de una tarea (worktree + diff) y re-ejecuto YO "
            "los gates reales de la config versionada del departamento (build, "
            "typecheck, lint, tests y chequeos estaticos) sobre el worktree — no "
            "confio en las afirmaciones del ejecutor. Un gate que no puede correr "
            "NUNCA se marca pasado: es rechazo con hallazgo. Entrego un veredicto "
            "estructurado: aprobado/rechazado + hallazgos con regla, evidencia y "
            "archivo. NO construyo software y NO decido el alcance."
        ),
        tags=["supervision", "gates", "veredicto", "trio", "departamento"],
        examples=[EJEMPLO_RESULTADO],
        input_modes=[MODO_JSON],
        output_modes=[MODO_JSON],
    )

    return AgentCard(
        name="supervisor-a2a",
        description=(
            "Supervisor del trio (Fase 6): valido un resultado contra las reglas "
            "versionadas del departamento re-ejecutando los gates reales sobre el "
            "worktree; veredicto estructurado con evidencia. Gate no ejecutable = "
            "rechazo. No construyo software, no decido alcance."
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
