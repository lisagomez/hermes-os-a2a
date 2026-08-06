"""Tests del motor STT pluggable: factory estricta, mock y motor Groq real."""
import json
import math
from pathlib import Path

import httpx
import pytest

from stt import (
    GROQ_MODELO,
    GROQ_URL,
    GroqWhisperSTT,
    MockSTT,
    crear_motor,
)


def test_factory_default_es_mock(monkeypatch):
    monkeypatch.delenv("STT_ENGINE", raising=False)
    assert isinstance(crear_motor(), MockSTT)


def test_factory_desconocido_no_arranca(monkeypatch):
    """Config invalida = el servicio NO arranca (jamas degrada a mock en silencio)."""
    monkeypatch.setenv("STT_ENGINE", "whisper-magico")
    with pytest.raises(RuntimeError, match="no soportado"):
        crear_motor()


def test_mock_es_deterministico(tmp_path: Path):
    audio = tmp_path / "a.ogg"
    audio.write_bytes(b"xx")
    motor = MockSTT()
    a = motor.transcribir(audio, "es-MX")
    b = motor.transcribir(audio, "es-MX")
    assert a == b
    assert {s.hablante for s in a} == {"asesor", "cliente"}
    assert any(s.confianza < 0.5 for s in a), "el mock debe ejercitar el camino [inaudible]"


# ---------------------------------------------------------------------------
# GroqWhisperSTT (Adopcion 1, PRP Makeflowia)
# ---------------------------------------------------------------------------

# Respuesta verbose_json con la forma real de Groq/Whisper: avg_logprob es un
# log-prob (negativo); exp(-0.105)=0.90, exp(-1.6)=0.20. El segundo segmento
# ademas trae no_speech_prob alto: debe quedar bajo el umbral [inaudible].
RESPUESTA_VERBOSE = {
    "text": "Hola, gracias por tomar la llamada. mmm",
    "duration": 95.2,
    "language": "es",
    "segments": [
        {
            "start": 0.0,
            "end": 6.5,
            "text": " Hola, gracias por tomar la llamada.",
            "avg_logprob": -0.105,
            "no_speech_prob": 0.01,
        },
        {
            "start": 90.0,
            "end": 95.2,
            "text": " mmm",
            "avg_logprob": -0.2,
            "no_speech_prob": 0.93,
        },
    ],
}


def _motor_con_respuesta(respuesta, status_code=200, capturas=None):
    """Motor groq con transporte simulado que ASERTA la peticion saliente.

    MockTransport responde a cualquier URL (gotcha 2026-08-02): por eso el
    handler guarda la peticion para asertar URL/headers/multipart de verdad.
    """

    def handler(request: httpx.Request) -> httpx.Response:
        if capturas is not None:
            capturas.append(request)
        cuerpo = respuesta if isinstance(respuesta, str) else json.dumps(respuesta)
        return httpx.Response(status_code, text=cuerpo)

    cliente = httpx.Client(transport=httpx.MockTransport(handler))
    return GroqWhisperSTT(api_key="gsk_test", http_client=cliente)


def test_groq_factory_exige_api_key(monkeypatch):
    """groq sin GROQ_API_KEY = el servicio NO arranca (no degrada a mock)."""
    monkeypatch.setenv("STT_ENGINE", "groq")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="GROQ_API_KEY"):
        crear_motor()
    monkeypatch.setenv("GROQ_API_KEY", "   ")
    with pytest.raises(RuntimeError, match="GROQ_API_KEY"):
        crear_motor()


def test_groq_factory_con_key(monkeypatch):
    monkeypatch.setenv("STT_ENGINE", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test")
    assert isinstance(crear_motor(), GroqWhisperSTT)


def test_groq_peticion_saliente(tmp_path: Path):
    """URL, auth, modelo, formato e idioma ISO-639-1 en el multipart real."""
    audio = tmp_path / "lead-1.ogg"
    audio.write_bytes(b"OggS-bytes")
    capturas = []
    motor = _motor_con_respuesta(RESPUESTA_VERBOSE, capturas=capturas)
    motor.transcribir(audio, "es-MX")
    (req,) = capturas
    assert str(req.url) == GROQ_URL
    assert req.headers["authorization"] == "Bearer gsk_test"
    contenido = req.read()
    assert GROQ_MODELO.encode() in contenido
    assert b"verbose_json" in contenido
    # Valor COMPLETO del campo (terminado en \r\n): "es-MX" sin normalizar
    # pondria este assert rojo (control real, no de prefijo).
    assert b'name="language"\r\n\r\nes\r\n' in contenido  # "es-MX" -> "es"
    assert b'filename="lead-1.ogg"' in contenido
    assert b"OggS-bytes" in contenido


def test_groq_oga_se_renombra_a_ogg_solo_en_el_multipart(tmp_path: Path):
    """Telegram entrega .oga y Groq lo rechaza: mismo codec, extension .ogg.
    El volumen es ro: el archivo en disco NO se toca."""
    audio = tmp_path / "nota-voz.oga"
    audio.write_bytes(b"OggS")
    capturas = []
    motor = _motor_con_respuesta(RESPUESTA_VERBOSE, capturas=capturas)
    motor.transcribir(audio, "es-MX")
    contenido = capturas[0].read()
    assert b'filename="nota-voz.ogg"' in contenido
    assert b'filename="nota-voz.oga"' not in contenido
    assert audio.exists() and audio.name.endswith(".oga")  # disco intacto


def test_groq_mapea_segmentos_sin_inventar(tmp_path: Path):
    audio = tmp_path / "a.ogg"
    audio.write_bytes(b"x")
    motor = _motor_con_respuesta(RESPUESTA_VERBOSE)
    segmentos = motor.transcribir(audio, "es-MX")
    assert len(segmentos) == 2
    s0, s1 = segmentos
    # exp(avg_logprob) como proxy de confianza, sin inventar precision.
    assert s0.inicio_s == 0.0
    assert s0.texto == "Hola, gracias por tomar la llamada."
    assert s0.confianza == pytest.approx(math.exp(-0.105), abs=1e-3)
    assert s0.confianza >= 0.5  # audible: NO debe salir [inaudible]
    # whisper no diariza: nadie finge asesor/cliente.
    assert {s.hablante for s in segmentos} == {"voz"}
    # no_speech_prob alto -> tope bajo el umbral [inaudible] del executor.
    assert s1.confianza < 0.5


def test_groq_http_error_es_visible(tmp_path: Path):
    audio = tmp_path / "a.ogg"
    audio.write_bytes(b"x")
    motor = _motor_con_respuesta('{"error": "invalid file format"}', status_code=400)
    with pytest.raises(RuntimeError, match="HTTP 400"):
        motor.transcribir(audio, "es-MX")


def test_groq_sin_segments_es_fallo_visible(tmp_path: Path):
    """verbose_json sin segments = contrato roto: fallo antes que inventar."""
    audio = tmp_path / "a.ogg"
    audio.write_bytes(b"x")
    motor = _motor_con_respuesta({"text": "hola", "duration": 1.0})
    with pytest.raises(RuntimeError, match="sin 'segments'"):
        motor.transcribir(audio, "es-MX")


def test_groq_audio_gigante_es_fallo_permanente_etiquetado(tmp_path: Path):
    """Exceder el limite de la API no debe disfrazarse de fallo transitorio."""
    audio = tmp_path / "larga.ogg"
    audio.write_bytes(b"x" * 64)
    motor = GroqWhisperSTT(api_key="gsk_test", max_bytes=10)
    with pytest.raises(RuntimeError, match="PERMANENTE"):
        motor.transcribir(audio, "es-MX")
