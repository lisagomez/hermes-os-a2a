"""Interop con el cliente REAL del SDK (cero red: httpx.ASGITransport).

La cola espia de test_executor.py NO caza el gotcha del SDK v1 (`new_task`
encolado antes del primer status update); el cliente real del SDK valida la
secuencia de eventos completa — este test existe por esa leccion (Fase 5).
"""
from __future__ import annotations

import asyncio
from pathlib import Path

import httpx

from a2a.client import A2ACardResolver, ClientConfig, ClientFactory
from a2a.helpers import get_data_parts, new_data_message
from a2a.types import SendMessageRequest, TaskState

from app import build_app
from executor import TranscripcionExecutor
from stt import MockSTT
from transcripciones import TranscripcionesStore


def _enviar(peticion: dict):
    app = build_app(
        TranscripcionExecutor(motor=MockSTT(), store=TranscripcionesStore(url="", key=""))
    )

    async def flujo():
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://transcripcion-a2a:4800",
        ) as http:
            card = await A2ACardResolver(http, "http://transcripcion-a2a:4800").get_agent_card()
            cliente = ClientFactory(ClientConfig(httpx_client=http, streaming=False)).create(card)
            final = None
            async for r in cliente.send_message(
                SendMessageRequest(message=new_data_message(peticion))
            ):
                if r.HasField("task"):
                    final = r.task
            assert final is not None, "el cliente del SDK no recibio tarea"
            return final

    return asyncio.run(flujo())


def test_interop_transcripcion_completa(tmp_path: Path):
    audio = tmp_path / "lead-777.ogg"
    audio.write_bytes(b"\x00fake")
    task = _enviar({
        "lead_id": "lead-777",
        "audio_path": str(audio),
        "asesor": "Victor",
        "modalidad": "visita",
    })
    assert task.status.state == TaskState.TASK_STATE_COMPLETED
    [artifact] = task.artifacts
    [data] = get_data_parts(artifact.parts)
    assert data["lead_id"] == "lead-777"
    assert data["persistido"] is False  # sin Supabase lo dice, no lo finge
    assert "[inaudible]" in data["contenido"]


def test_interop_peticion_invalida_es_failed(tmp_path: Path):
    task = _enviar({"lead_id": "lead-1"})  # sin audio_path/asesor/modalidad
    assert task.status.state == TaskState.TASK_STATE_FAILED
