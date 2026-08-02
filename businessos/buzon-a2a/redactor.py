"""redactor.py — motor de redaccion del buzon (A3), pluggable y determinista.

Doctrina de la fabrica: motor SIEMPRE pluggable/mockeable (2026-07-03). El motor
por defecto es una PLANTILLA determinista: cero tokens, cero credenciales, y el
borrador que produce es estructuralmente incapaz de seguir instrucciones
inyectadas en el correo entrante (no interpreta el texto, solo lo acusa).
Un motor con modelo sera un plugin opt-in FUTURO y correra bajo los MISMOS
11 gates + A5 — por diseño, no por confianza.

Contrato de salida: el dict `borrador` que consumen politicas.evaluar y
correos_salientes (SPEC-buzon-a2a; ver politicas.py, docstring).
"""
from __future__ import annotations

import os

LEYENDA_DEFAULT = (
    "Este mensaje fue redactado por un agente automatizado de A2A y revisado "
    "y aprobado por una persona antes de su envio."
)


def leyenda() -> str:
    return os.environ.get("BUZON_LEYENDA", LEYENDA_DEFAULT)


class RedactorPlantilla:
    """Acuse de recibo + siguiente paso por clase. No interpreta el entrante."""

    CLASES = {
        "acuse_recibo": (
            "Recibimos tu mensaje y ya esta en manos del equipo. "
            "Te respondemos en breve con el siguiente paso."
        ),
        "informacion_general": (
            "Gracias por escribirnos. Adjuntamos en proximas comunicaciones la "
            "informacion publica solicitada; una persona del equipo dara "
            "seguimiento a tu caso."
        ),
        "seguimiento": (
            "Seguimos atentos a tu caso. Una persona del equipo retomara el "
            "hilo con la informacion pendiente."
        ),
    }

    def redactar(self, entrante: dict, buzon: dict, clase: str,
                 instrucciones: str = "") -> dict:
        """Borrador de respuesta al entrante. `instrucciones` (del equipo, NO del
        correo) solo elige la clase/tono; la plantilla no incorpora texto libre."""
        cuerpo_base = self.CLASES.get(clase, self.CLASES["acuse_recibo"])
        asunto = entrante.get("asunto") or ""
        if not asunto.lower().startswith("re:"):
            asunto = f"Re: {asunto}" if asunto else "Re: tu mensaje"
        cuerpo = (
            f"Hola,\n\n{cuerpo_base}\n\n"
            f"Saludos,\n{buzon.get('direccion', '')}\n\n--\n{leyenda()}"
        )
        return {
            "hilo_id": entrante.get("hilo_id", ""),
            "destinatarios": {"to": [entrante.get("remitente", "")], "cc": []},
            "asunto": asunto,
            "cuerpo": cuerpo,
            "cabeceras": {"Auto-Submitted": "auto-replied"},
            "adjuntos": [],
            "automatico": True,
            "derivado_de_hilos": [entrante.get("hilo_id", "")],
        }
