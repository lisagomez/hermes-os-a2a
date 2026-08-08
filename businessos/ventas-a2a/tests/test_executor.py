"""Tests del executor de ventas (Fase 9), con Supabase MOCKEADO.

Sin red ni LLM: httpx.MockTransport simula PostgREST; una cola espia captura
los eventos A2A. Invariante central (D6): un lead jamas se pierde en silencio —
con Supabase configurado, INSERT fallido = task failed (reintentable); sin
Supabase, el artifact dice `persistido: false`, nunca finge.
"""
from __future__ import annotations

import asyncio

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

from executor import VentasExecutor
from leads import LeadsStore
from oferta import OFERTA

LEAD_OK = {
    "empresa": "ACME S.A.",
    "contacto": "maria@acme.mx",
    "mensaje": "Nos interesa el white-label",
    "presupuesto": 2000,
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
        task_id="lead-t-1",
        context_id="ctx-1",
    )


def ejecutar(executor: VentasExecutor, mensaje) -> ColaEspia:
    cola = ColaEspia()
    asyncio.run(executor.execute(contexto_con(mensaje), cola))
    return cola


def estados(cola: ColaEspia) -> list[int]:
    return [e.status.state for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)]


def artifact_de(cola: ColaEspia) -> dict:
    artifacts = [e.artifact for e in cola.eventos if isinstance(e, TaskArtifactUpdateEvent)]
    assert len(artifacts) == 1 and artifacts[0].name == "lead-registrado"
    [data] = get_data_parts(artifacts[0].parts)
    return data


def store_mock(handler) -> LeadsStore:
    return LeadsStore(
        url="https://fake.supabase.co",
        key="k",
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )


def store_apagado() -> LeadsStore:
    return LeadsStore(url="", key="")


# ---------- happy path ----------

def test_lead_estructurado_persistido(monkeypatch):
    capturado = {}

    def handler(request: httpx.Request) -> httpx.Response:
        import json
        capturado.update(json.loads(request.content))
        capturado["_url"] = str(request.url)
        return httpx.Response(201)

    cola = ejecutar(VentasExecutor(store=store_mock(handler)), new_data_message(LEAD_OK))

    # Gotcha SDK v1: el Task va encolado ANTES del primer status update.
    assert isinstance(cola.eventos[0], Task)
    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED
    data = artifact_de(cola)
    assert data["lead_id"].startswith("a2a-")  # clave natural: contacto+empresa
    assert data["etapa"] == "nuevo"
    assert data["persistido"] is True
    assert data["oferta"] == OFERTA
    assert data["disclaimer"]  # SIEMPRE presente
    # La fila enviada a PostgREST lleva el contrato de la tabla:
    assert capturado["origen"] == "a2a"
    assert capturado["empresa"] == "ACME S.A."
    assert "etapa" not in capturado  # el default cubre la fila nueva; el upsert no resetea etapas avanzadas
    assert capturado["datos"] == {"presupuesto": 2000}
    assert "on_conflict=lead_id" in capturado["_url"]  # upsert idempotente (RUNBOOK P3)


def test_mismo_lead_mismo_id_dos_envios(monkeypatch):
    """RUNBOOK P3: dos envios del mismo contacto -> el MISMO lead_id (una fila)."""
    ids = []

    def handler(request: httpx.Request) -> httpx.Response:
        import json
        ids.append(json.loads(request.content)["lead_id"])
        return httpx.Response(201)

    ejecutar(VentasExecutor(store=store_mock(handler)), new_data_message(LEAD_OK))
    ejecutar(VentasExecutor(store=store_mock(handler)), new_data_message(dict(LEAD_OK)))
    assert len(ids) == 2 and ids[0] == ids[1]


def test_texto_libre_no_colapsa_ids():
    """Dos leads de texto libre distintos JAMAS comparten lead_id (sin clave natural)."""
    from executor import lead_id_de
    a = lead_id_de({"empresa": "", "contacto": "", "mensaje": "hola", "datos": {}})
    b = lead_id_de({"empresa": "", "contacto": "", "mensaje": "adios", "datos": {}})
    assert a != b and a.startswith("lead-") and b.startswith("lead-")


def test_texto_libre_es_lead_valido():
    cola = ejecutar(
        VentasExecutor(store=store_apagado()),
        new_text_message("Nos interesa; escribeme a maria@acme.mx"),
    )
    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED
    data = artifact_de(cola)
    assert data["persistido"] is False  # sin Supabase lo DICE, no lo finge


# ---------- entrada invalida ----------

def test_lead_sin_contacto_es_failed():
    cola = ejecutar(
        VentasExecutor(store=store_apagado()),
        new_data_message({"empresa": "ACME", "mensaje": "hola"}),
    )
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    fallo = [e for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)][-1]
    assert "contacto" in fallo.status.message.parts[0].text


def test_mensaje_vacio_es_failed():
    cola = ejecutar(VentasExecutor(store=store_apagado()), new_text_message("   "))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED


# ---------- fallo visible, no silencioso (D6) ----------

def test_supabase_caido_es_failed_no_lead_perdido():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    cola = ejecutar(VentasExecutor(store=store_mock(handler)), new_data_message(LEAD_OK))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    fallo = [e for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)][-1]
    assert "no se pudo guardar" in fallo.status.message.parts[0].text


def test_insert_rechazado_es_failed():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(409)  # p.ej. lead_id duplicado

    cola = ejecutar(VentasExecutor(store=store_mock(handler)), new_data_message(LEAD_OK))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    fallo = [e for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)][-1]
    assert "HTTP 409" in fallo.status.message.parts[0].text


# ---------- fronteras: la respuesta nunca pacta terminos ----------

def test_respuesta_no_pacta_precio_final():
    """La oferta trae rango de REFERENCIA; el disclaimer niega el pacto por canal."""
    cola = ejecutar(VentasExecutor(store=store_apagado()), new_data_message(LEAD_OK))
    data = artifact_de(cola)
    precios = data["oferta"]["precios_referencia_usd"]
    assert set(precios) == {"desde", "hasta", "nota"}  # rango, jamas un precio pactado
    assert "Ningun precio ni termino queda pactado" in data["disclaimer"]
