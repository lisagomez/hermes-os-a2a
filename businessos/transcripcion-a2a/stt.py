"""stt.py — motor de speech-to-text pluggable (puente adquisicion-transcripcion).

Mismo principio que el motor del Ejecutor (Fase 6c): el motor es SIEMPRE
pluggable/mockeable. `MockSTT` valida servicio+protocolo+persistencia al 100%
sin dependencias (cero tokens, cero binarios); el motor real (faster-whisper u
otro) es una eleccion PENDIENTE de la duena (gate de §9 del departamento) y
entrara aqui como plugin sin tocar executor ni contrato.

Config invalida = el servicio NO arranca (patron gates del Supervisor): un
STT_ENGINE desconocido lanza en el import de app.py, nunca degrada en
silencio a mock.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

MOTORES_SOPORTADOS = ("mock",)  # candidatos reales (por elegir): faster-whisper


@dataclass(frozen=True)
class Segmento:
    """Un tramo de la transcripcion, atribuido y con tiempo."""

    inicio_s: float
    hablante: str  # "asesor" | "cliente"
    texto: str
    confianza: float  # 0..1; el formateador marca [inaudible] bajo umbral


class MockSTT:
    """Motor deterministico para dev/tests: no lee el audio, pero exige que
    exista (el contrato no cambia cuando llegue el motor real)."""

    nombre = "mock"

    def transcribir(self, audio_path: Path, idioma: str) -> list[Segmento]:
        # La existencia ya la valido el executor; aqui va la senal deterministica.
        return [
            Segmento(0.0, "asesor", "Hola, gracias por tomar la llamada.", 0.98),
            Segmento(14.0, "cliente", "Gracias a ti. Cuentame de que se trata.", 0.95),
            Segmento(62.0, "cliente", "Nuestro proceso de facturacion es muy manual.", 0.93),
            Segmento(90.0, "asesor", "", 0.20),  # tramo de baja confianza -> [inaudible]
        ]


def crear_motor(nombre: str | None = None):
    """Factory por env STT_ENGINE (default: mock). Desconocido -> RuntimeError."""
    elegido = (nombre or os.environ.get("STT_ENGINE") or "mock").strip().lower()
    if elegido == "mock":
        return MockSTT()
    raise RuntimeError(
        f"STT_ENGINE={elegido!r} no soportado (soportados: {MOTORES_SOPORTADOS}). "
        "El motor real es una eleccion pendiente de la duena; se integra aqui "
        "como plugin, no se improvisa."
    )
