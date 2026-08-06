"""card.py — Agent Card de transcripcion-a2a (EG.CRM Hito 3, depto adquisicion).

Puente determinista de speech-to-text: transcribe la entrevista de
descubrimiento con marcas de tiempo, anclada al lead. Hablantes solo si el
motor diariza — el real (groq/whisper) NO: todo tramo sale como `Voz`, igual
que declara la descripcion servida de la card mas abajo. La promesa
incluye sus fronteras negativas LITERALES: no resume, no interpreta, no opina
y no completa lo inaudible — la transcripcion ES la fuente; el analisis es
tarea de otros skills. La `url` sale de TRANSCRIPCION_PUBLIC_URL para que la
card no mienta si algun dia se publica.
"""
from __future__ import annotations

import os

from a2a.types import AgentCapabilities, AgentCard, AgentInterface, AgentSkill
from a2a.utils import TransportProtocol

DEFAULT_PUBLIC_URL = "http://transcripcion-a2a:4800"

MODO_JSON = "application/json"

EJEMPLO_PETICION = (
    '{"lead_id": "lead-123", "audio_path": "/audio/lead-123-descubrimiento.ogg", '
    '"asesor": "Victor", "modalidad": "llamada", "idioma": "es-MX"}'
)


def build_card() -> AgentCard:
    """Construye la Agent Card. Lee env en cada llamada (testeable con monkeypatch)."""
    url = os.environ.get("TRANSCRIPCION_PUBLIC_URL", DEFAULT_PUBLIC_URL)

    skill = AgentSkill(
        id="transcribir-entrevista",
        name="Transcribir entrevista de descubrimiento",
        description=(
            "Convierto el audio de una entrevista de descubrimiento (visita o "
            "llamada) en una transcripcion literal con marcas de tiempo, anclada "
            "a la fila del lead. La atribucion de hablantes depende del motor "
            "configurado: el motor real (groq/whisper) NO diariza y cada tramo "
            "sale como 'voz'. Lo dudoso queda [inaudible], jamas adivinado. "
            "Fronteras: NO resumo, NO interpreto, NO opino, NO diarizo lo que el "
            "motor no distingue y NO completo lo inaudible — el analisis es "
            "tarea de otros skills del departamento."
        ),
        tags=["transcripcion", "stt", "adquisicion", "descubrimiento", "departamento"],
        examples=[EJEMPLO_PETICION],
        input_modes=[MODO_JSON],
        output_modes=[MODO_JSON],
    )

    return AgentCard(
        name="transcripcion-a2a",
        description=(
            "Puente determinista de speech-to-text del departamento de "
            "adquisicion (EG.CRM Hito 3): transcribo entrevistas de "
            "descubrimiento con marcas de tiempo, ancladas al lead. Sin LLM "
            "en la ruta de conversion y sin diarizacion (no anuncio lo que el "
            "motor no hace). No resumo, no interpreto, no opino."
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
