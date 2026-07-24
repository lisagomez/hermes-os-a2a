"""Tests del motor STT pluggable: factory estricta y mock deterministico."""
from pathlib import Path

import pytest

from stt import MockSTT, crear_motor


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
