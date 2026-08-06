"""stt.py — motor de speech-to-text pluggable (puente adquisicion-transcripcion).

Mismo principio que el motor del Ejecutor (Fase 6c): el motor es SIEMPRE
pluggable/mockeable. `MockSTT` valida servicio+protocolo+persistencia al 100%
sin dependencias (cero tokens, cero binarios). `GroqWhisperSTT` es el motor
real (Adopcion 1 del PRP Makeflowia): whisper-large-v3 via api.groq.com,
INACTIVO por default — activarlo (`STT_ENGINE=groq`) manda el audio a un
proveedor externo y es decision de la duena (gate §9 del departamento), con
verificacion de retencion de datos de Groq antes del primer audio real.

Config invalida = el servicio NO arranca (patron gates del Supervisor): un
STT_ENGINE desconocido, o `groq` sin GROQ_API_KEY, lanza en el import de
app.py; nunca degrada en silencio a mock.
"""
from __future__ import annotations

import math
import os
from dataclasses import dataclass
from pathlib import Path

import httpx

MOTORES_SOPORTADOS = ("mock", "groq")

GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
GROQ_MODELO = "whisper-large-v3"
GROQ_TIMEOUT_S = 120.0
# Limite del tier gratuito de Groq (el dev tier admite mas; ajustable por env).
GROQ_MAX_AUDIO_BYTES = 25 * 1024 * 1024
# Tarifa por HORA de audio (no tokens): el costo NO cabe en token_usage sin
# ensuciar el ledger -> hueco DECLARADO en el log (criterio filas_sin_costo).
GROQ_TARIFA_USD_HORA = 0.111
# Bajo confianza 0.5 el formateador marca [inaudible]; un tramo que el propio
# Whisper juzga probable no-habla no debe salir como texto confiable.
NO_SPEECH_UMBRAL = 0.6
NO_SPEECH_TOPE_CONFIANZA = 0.4


@dataclass(frozen=True)
class Segmento:
    """Un tramo de la transcripcion, atribuido y con tiempo."""

    inicio_s: float
    hablante: str  # "asesor" | "cliente" | "voz" (motor sin diarizacion)
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


class GroqWhisperSTT:
    """Motor real: whisper-large-v3 en Groq (Adopcion 1, PRP Makeflowia).

    Puente determinista SIN LLM: el audio del volumen (solo lectura) se sube
    por multipart y la respuesta verbose_json trae segments con tiempos y
    log-probs — lo minimo para honrar el contrato Segmento sin inventar nada.
    Whisper NO diariza: todo tramo sale como hablante="voz" (la card y el
    skill lo dicen igual de claro).
    """

    nombre = "groq"

    def __init__(
        self,
        api_key: str | None = None,
        http_client: httpx.Client | None = None,
        max_bytes: int | None = None,
    ) -> None:
        key = (api_key if api_key is not None else os.environ.get("GROQ_API_KEY") or "").strip()
        if not key:
            raise RuntimeError(
                "STT_ENGINE=groq exige GROQ_API_KEY no vacia en el .env del "
                "servicio: sin ella el servicio NO arranca (jamas degrada a mock)."
            )
        self._key = key
        self._http = http_client
        self._max_bytes = (
            max_bytes
            if max_bytes is not None
            else int(os.environ.get("GROQ_MAX_AUDIO_BYTES") or GROQ_MAX_AUDIO_BYTES)
        )

    def transcribir(self, audio_path: Path, idioma: str) -> list[Segmento]:
        tam = audio_path.stat().st_size
        if tam > self._max_bytes:
            # Fallo PERMANENTE etiquetado: reintentar no lo cura; que nadie lo
            # confunda con un fallo transitorio de red.
            raise RuntimeError(
                f"audio de {tam} bytes excede el limite de la API de Groq "
                f"({self._max_bytes} bytes); fallo PERMANENTE, reintentar no lo "
                "cura — dividir o comprimir el audio"
            )
        nombre_envio = audio_path.name
        if nombre_envio.lower().endswith(".oga"):
            # Telegram entrega notas de voz .oga y Groq rechaza esa extension;
            # es el MISMO codec (ogg/opus). El volumen es ro: se renombra solo
            # en el multipart, nunca en disco.
            nombre_envio = nombre_envio[:-4] + ".ogg"
        respuesta = self._post(
            data={
                "model": GROQ_MODELO,
                "response_format": "verbose_json",
                # Groq espera ISO-639-1: "es-MX" -> "es".
                "language": idioma.split("-")[0].lower(),
                "temperature": "0",
            },
            files={"file": (nombre_envio, audio_path.read_bytes())},
        )
        return self._mapear(respuesta)

    def _post(self, data: dict, files: dict) -> dict:
        headers = {"Authorization": f"Bearer {self._key}"}
        if self._http is not None:
            r = self._http.post(GROQ_URL, headers=headers, data=data, files=files)
        else:
            with httpx.Client(timeout=GROQ_TIMEOUT_S) as client:
                r = client.post(GROQ_URL, headers=headers, data=data, files=files)
        if r.status_code != 200:
            raise RuntimeError(
                f"Groq respondio HTTP {r.status_code}: {r.text[:200]}"
            )
        return r.json()

    def _mapear(self, cuerpo: dict) -> list[Segmento]:
        # El costo se declara ANTES de validar: un 200 malformado ya se facturo
        # y un costo sin declarar es invisible (regla 2026-07-13).
        self._declarar_costo(cuerpo)
        segs = cuerpo.get("segments")
        if not isinstance(segs, list) or not segs:
            # verbose_json sin segments = contrato roto del proveedor; fallo
            # visible antes que inventar tiempos/confianzas.
            raise RuntimeError("Groq devolvio verbose_json sin 'segments'")
        segmentos: list[Segmento] = []
        for s in segs:
            # exp(avg_logprob) como proxy de confianza (0..1). Es un proxy
            # documentado, no una medida calibrada; el umbral [inaudible] del
            # executor (0.5) corta en exp(-0.69).
            confianza = math.exp(float(s.get("avg_logprob", -10.0)))
            if float(s.get("no_speech_prob", 0.0)) >= NO_SPEECH_UMBRAL:
                confianza = min(confianza, NO_SPEECH_TOPE_CONFIANZA)
            segmentos.append(
                Segmento(
                    inicio_s=float(s.get("start", 0.0)),
                    hablante="voz",  # whisper no diariza; no se finge asesor/cliente
                    texto=str(s.get("text") or "").strip(),
                    confianza=max(0.0, min(1.0, round(confianza, 4))),
                )
            )
        return segmentos

    @staticmethod
    def _declarar_costo(cuerpo: dict) -> None:
        # Groq tarifa por hora de audio, no tokens: no entra a token_usage.
        # Hueco declarado y VISIBLE (regla 2026-07-13: nada best-effort mudo).
        duracion_s = float(cuerpo.get("duration") or 0.0)
        costo = duracion_s / 3600.0 * GROQ_TARIFA_USD_HORA
        print(
            f"[transcripcion-a2a] costo declarado (hueco, fuera de token_usage): "
            f"{duracion_s:.1f}s de audio x ${GROQ_TARIFA_USD_HORA}/h = "
            f"${costo:.4f} USD (motor groq {GROQ_MODELO})",
            flush=True,
        )


def crear_motor(nombre: str | None = None):
    """Factory por env STT_ENGINE (default: mock). Desconocido -> RuntimeError."""
    elegido = (nombre or os.environ.get("STT_ENGINE") or "mock").strip().lower()
    if elegido == "mock":
        return MockSTT()
    if elegido == "groq":
        return GroqWhisperSTT()
    raise RuntimeError(
        f"STT_ENGINE={elegido!r} no soportado (soportados: {MOTORES_SOPORTADOS}). "
        "El motor se integra aqui como plugin, no se improvisa."
    )
