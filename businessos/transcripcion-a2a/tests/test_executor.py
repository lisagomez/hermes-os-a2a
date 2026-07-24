"""Tests del executor de transcripcion, con Supabase MOCKEADO y MockSTT.

Sin red ni LLM: httpx.MockTransport simula PostgREST; una cola espia captura
los eventos A2A. Invariante central: una transcripcion jamas se pierde en
silencio — con Supabase configurado, INSERT fallido = task failed
(reintentable); sin Supabase, el artifact dice `persistido: false`, nunca
finge. Fidelidad: lo dudoso sale [inaudible], jamas adivinado.
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

import httpx

from a2a.helpers import get_data_parts, new_data_message, new_text_message
from a2a.server.agent_execution import RequestContext
from a2a.server.context import ServerCallContext
from a2a.types import (
    SendMessageRequest,
    Task,
    TaskArtifactUpdateEvent,
    TaskState,
    TaskStatusUpdateEvent,
)

from executor import TranscripcionExecutor, confianza_global, formatear
from stt import MockSTT, Segmento
from transcripciones import TranscripcionesStore


def peticion_ok(tmp_path: Path) -> dict:
    audio = tmp_path / "lead-123.ogg"
    audio.write_bytes(b"\x00fake-audio")
    return {
        "lead_id": "lead-123",
        "audio_path": str(audio),
        "asesor": "Victor",
        "modalidad": "llamada",
    }


class ColaEspia:
    def __init__(self) -> None:
        self.eventos: list = []

    async def enqueue_event(self, evento) -> None:
        self.eventos.append(evento)


def contexto_con(mensaje) -> RequestContext:
    return RequestContext(
        ServerCallContext(),
        request=SendMessageRequest(message=mensaje),
        task_id="stt-t-1",
        context_id="ctx-1",
    )


def ejecutar(executor: TranscripcionExecutor, mensaje) -> ColaEspia:
    cola = ColaEspia()
    asyncio.run(executor.execute(contexto_con(mensaje), cola))
    return cola


def estados(cola: ColaEspia) -> list[int]:
    return [e.status.state for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)]


def artifact_de(cola: ColaEspia) -> dict:
    artifacts = [e.artifact for e in cola.eventos if isinstance(e, TaskArtifactUpdateEvent)]
    assert len(artifacts) == 1 and artifacts[0].name == "transcripcion"
    [data] = get_data_parts(artifacts[0].parts)
    return data


def store_mock(handler) -> TranscripcionesStore:
    return TranscripcionesStore(
        url="https://fake.supabase.co",
        key="k",
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )


def store_apagado() -> TranscripcionesStore:
    return TranscripcionesStore(url="", key="")


def executor_mock(store: TranscripcionesStore) -> TranscripcionExecutor:
    return TranscripcionExecutor(motor=MockSTT(), store=store)


# ---------- happy path ----------

def test_transcripcion_persistida(tmp_path):
    capturado = {}

    def handler(request: httpx.Request) -> httpx.Response:
        capturado.update(json.loads(request.content))
        return httpx.Response(201)

    cola = ejecutar(executor_mock(store_mock(handler)), new_data_message(peticion_ok(tmp_path)))

    # Gotcha SDK v1: el Task va encolado ANTES del primer status update.
    assert isinstance(cola.eventos[0], Task)
    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED
    data = artifact_de(cola)
    assert data["lead_id"] == "lead-123"
    assert data["persistido"] is True
    assert data["motor"] == "mock"
    # La fila enviada a PostgREST lleva el contrato de la tabla:
    assert capturado["lead_id"] == "lead-123"
    assert capturado["modalidad"] == "llamada"
    assert capturado["asesor"] == "Victor"
    assert capturado["idioma"] == "es-MX"  # default honesto
    assert capturado["tipo_reunion"] == "discovery"
    assert capturado["motor"] == "mock"
    assert isinstance(capturado["segmentos"], list) and capturado["segmentos"]


def test_formato_literal_con_tiempos_e_inaudible(tmp_path):
    cola = ejecutar(executor_mock(store_apagado()), new_data_message(peticion_ok(tmp_path)))
    data = artifact_de(cola)
    assert data["persistido"] is False  # sin Supabase lo DICE, no lo finge
    contenido = data["contenido"]
    assert "[00:00] Asesor:" in contenido
    assert "[01:02] Cliente:" in contenido
    assert "[inaudible]" in contenido  # bajo umbral se marca, jamas se adivina
    assert "Sin resumen ni interpretacion" in contenido


# ---------- entrada invalida ----------

def test_sin_lead_id_es_failed(tmp_path):
    p = peticion_ok(tmp_path)
    del p["lead_id"]
    cola = ejecutar(executor_mock(store_apagado()), new_data_message(p))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    fallo = [e for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)][-1]
    assert "lead_id" in fallo.status.message.parts[0].text


def test_modalidad_invalida_es_failed(tmp_path):
    p = peticion_ok(tmp_path)
    p["modalidad"] = "telepatia"
    cola = ejecutar(executor_mock(store_apagado()), new_data_message(p))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED


def test_texto_libre_es_failed():
    """El contrato es DataPart estructurado: el audio no viaja como texto."""
    cola = ejecutar(executor_mock(store_apagado()), new_text_message("transcribe esto"))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED


def test_audio_inexistente_es_failed(tmp_path):
    p = peticion_ok(tmp_path)
    p["audio_path"] = str(tmp_path / "no-existe.ogg")
    cola = ejecutar(executor_mock(store_apagado()), new_data_message(p))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    fallo = [e for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)][-1]
    assert "audio inexistente" in fallo.status.message.parts[0].text


# ---------- fallo visible, no silencioso ----------

def test_supabase_caido_es_failed_no_transcripcion_perdida(tmp_path):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    cola = ejecutar(executor_mock(store_mock(handler)), new_data_message(peticion_ok(tmp_path)))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    fallo = [e for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)][-1]
    assert "no se pudo guardar" in fallo.status.message.parts[0].text


def test_motor_reventado_es_failed(tmp_path):
    class MotorRoto:
        nombre = "roto"

        def transcribir(self, audio_path, idioma):
            raise OSError("device error")

    cola = ejecutar(
        TranscripcionExecutor(motor=MotorRoto(), store=store_apagado()),
        new_data_message(peticion_ok(tmp_path)),
    )
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    fallo = [e for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)][-1]
    assert "motor STT fallo" in fallo.status.message.parts[0].text


# ---------- deterministas puros ----------

def test_confianza_global_mapea_deterministico():
    seg = lambda c: Segmento(0.0, "asesor", "x", c)  # noqa: E731
    assert confianza_global([seg(0.95), seg(0.92)]) == "alta"
    assert confianza_global([seg(0.8), seg(0.7)]) == "media"
    assert confianza_global([seg(0.4)]) == "baja"
    assert confianza_global([]) == "baja"


def test_formatear_no_resume():
    """Si borro el formateador, esto se pone rojo: exige literalidad, no resumen."""
    peticion = {
        "lead_id": "lead-9", "modalidad": "visita",
        "idioma": "es-MX", "tipo_reunion": "demo",
    }
    segmentos = [Segmento(75.0, "cliente", "Todo lo hacemos en Excel.", 0.9)]
    out = formatear(peticion, segmentos, "mock")
    assert "[01:15] Cliente: Todo lo hacemos en Excel." in out
    assert "Tipo: demo" in out
    assert "Motor: mock" in out
