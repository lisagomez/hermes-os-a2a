"""Executor del buzon con PostgREST MOCKEADO (httpx.MockTransport) y cola espia.

Invariantes: Task encolado ANTES del primer status update; un borrador jamas se
pierde en silencio (Supabase caido = failed reintentable); un gate CRITICO en
rojo = rechazado_gates (no llega a A5); cuarentena y modo cerrado se aplican.
"""
from __future__ import annotations

import asyncio
import json

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

from correos import BuzonStore
from executor import BuzonExecutor

ENTRANTE = {
    "id": "ce-1", "buzon_id": "bz-1", "hilo_id": "h1",
    "remitente": "cliente@externo.com",
    "destinatarios": {"to": ["ventas@miempresa.com"], "cc": []},
    "asunto": "Consulta", "cuerpo_saneado": "Hola, quiero informacion.",
    "saneado_meta": {"eliminados": ["bloque invisible: div oculto (display:none)"]},
    "hash_original": "0" * 64, "dmarc_alineado": True, "remitente_conocido": True,
}

BUZON = {
    "id": "bz-1", "tenant_id": "a2a", "direccion": "ventas@miempresa.com",
    "proveedor": "imap", "modo_contraparte": "abierto_cuarentena",
    "clases_permitidas": ["acuse_recibo"], "dominios_enlaces": ["miempresa.com"],
    "cuota_hora": 10, "cuota_hilo": 5, "aprobador_rol": "PM", "activo": True,
}


def handler_base(capturas: dict, entrante: dict = None, buzon: dict = None,
                 enviados_hilo: int = 0, pausa: bool = False):
    entrante = ENTRANTE if entrante is None else entrante
    buzon = BUZON if buzon is None else buzon

    def handler(request: httpx.Request) -> httpx.Response:
        ruta, q = request.url.path, str(request.url.query)
        if request.method == "GET":
            if ruta.endswith("/correos_entrantes") and "id=eq." in q:
                return httpx.Response(200, json=[entrante] if entrante else [])
            if ruta.endswith("/correos_entrantes"):
                return httpx.Response(200, json=[entrante] if entrante else [])
            if ruta.endswith("/buzones"):
                return httpx.Response(200, json=[buzon] if buzon else [])
            if ruta.endswith("/correos_salientes") and "hilo_id" in q:
                return httpx.Response(200, json=[{"id": f"s{i}"} for i in range(enviados_hilo)])
            if ruta.endswith("/correos_salientes"):
                return httpx.Response(200, json=[])
            if ruta.endswith("/buzon_control"):
                return httpx.Response(200, json=[{"pausa_global": pausa}])
            if ruta.endswith("/buzon_bitacora"):
                return httpx.Response(200, json=[])
        if request.method == "POST":
            cuerpo = json.loads(request.content)
            capturas.setdefault(ruta.rsplit("/", 1)[-1], []).append(cuerpo)
            if ruta.endswith("/correos_salientes"):
                return httpx.Response(201, json=[{**cuerpo, "id": "sal-1"}])
            return httpx.Response(201)
        return httpx.Response(404)

    return handler


def store_mock(handler) -> BuzonStore:
    return BuzonStore(url="https://fake.supabase.co", key="k",
                      http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)))


class ColaEspia:
    def __init__(self) -> None:
        self.eventos: list = []

    async def enqueue_event(self, evento) -> None:
        self.eventos.append(evento)


def ejecutar(executor: BuzonExecutor, mensaje) -> ColaEspia:
    contexto = RequestContext(
        ServerCallContext(),
        request=SendMessageRequest(message=mensaje),
        task_id="bz-t-1",
        context_id="ctx-1",
    )
    cola = ColaEspia()
    asyncio.run(executor.execute(contexto, cola))
    return cola


def estados(cola: ColaEspia) -> list[int]:
    return [e.status.state for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)]


def artifact_de(cola: ColaEspia, nombre: str) -> dict:
    artifacts = [e.artifact for e in cola.eventos if isinstance(e, TaskArtifactUpdateEvent)]
    assert len(artifacts) == 1 and artifacts[0].name == nombre
    [data] = get_data_parts(artifacts[0].parts)
    return data


def razon_fallo(cola: ColaEspia) -> str:
    fallo = [e for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)][-1]
    return fallo.status.message.parts[0].text


# ---------- redactar: happy path ----------

def test_redactar_pendiente_aprobacion_con_gates_verdes(monkeypatch):
    monkeypatch.setenv("BUZON_CANARIO", "CANARIO-3f9a")
    capturas: dict = {}
    cola = ejecutar(
        BuzonExecutor(store=store_mock(handler_base(capturas))),
        new_data_message({"accion": "redactar", "correo_entrante_id": "ce-1"}),
    )
    # Gotcha SDK v1: el Task va encolado ANTES del primer status update.
    assert isinstance(cola.eventos[0], Task)
    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED
    data = artifact_de(cola, "borrador-evaluado")
    assert data["estado"] == "pendiente_aprobacion"
    assert data["persistido"] is True and data["correo_saliente_id"] == "sal-1"
    assert len(data["gates"]) == 11 and all(g["paso"] for g in data["gates"])
    # La fila persistida lleva el contrato de la tabla:
    [fila] = capturas["correos_salientes"]
    assert fila["estado"] == "pendiente_aprobacion"
    assert fila["destinatarios"]["to"] == ["cliente@externo.com"]
    assert fila["cabeceras"]["Auto-Submitted"] == "auto-replied"
    assert len(fila["sha256"]) == 64 and fila["en_respuesta_a"] == "ce-1"
    # y quedo bitacora del evento:
    assert capturas.get("buzon_bitacora")


def test_redactar_sin_canario_configurado_es_rechazado_gates(monkeypatch):
    """Fail-closed: sin canario el gate CRITICO esta rojo → no llega a A5."""
    monkeypatch.delenv("BUZON_CANARIO", raising=False)
    capturas: dict = {}
    cola = ejecutar(
        BuzonExecutor(store=store_mock(handler_base(capturas))),
        new_data_message({"accion": "redactar", "correo_entrante_id": "ce-1"}),
    )
    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED
    data = artifact_de(cola, "borrador-evaluado")
    assert data["estado"] == "rechazado_gates"
    [fila] = capturas["correos_salientes"]
    assert fila["estado"] == "rechazado_gates"


# ---------- leer: cuarentena tipada ----------

def test_leer_devuelve_extractos_tipados(monkeypatch):
    monkeypatch.setenv("BUZON_CANARIO", "CANARIO-3f9a")
    cola = ejecutar(
        BuzonExecutor(store=store_mock(handler_base({}))),
        new_data_message({"accion": "leer", "hilo_id": "h1"}),
    )
    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED
    data = artifact_de(cola, "hilo-en-cuarentena")
    [c] = data["correos"]
    assert c["id"] == "ce-1" and c["remitente"] == "cliente@externo.com"
    assert c["eliminados"]  # lo que se quito viaja declarado
    assert "cuerpo" not in c  # solo extracto saneado, referencias simbolicas


def test_leer_hilo_vacio_es_failed():
    cola = ejecutar(
        BuzonExecutor(store=store_mock(handler_base({}, entrante={}))),
        new_data_message({"accion": "leer", "hilo_id": "h9"}),
    )
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED


# ---------- politica de contrapartes ----------

def test_cerrado_con_desconocido_es_failed():
    entrante = {**ENTRANTE, "remitente_conocido": False}
    buzon = {**BUZON, "modo_contraparte": "cerrado"}
    cola = ejecutar(
        BuzonExecutor(store=store_mock(handler_base({}, entrante=entrante, buzon=buzon))),
        new_data_message({"accion": "redactar", "correo_entrante_id": "ce-1"}),
    )
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "revision humana" in razon_fallo(cola)


def test_cuarentena_tras_2_intercambios_escala(monkeypatch):
    monkeypatch.setenv("BUZON_CANARIO", "CANARIO-3f9a")
    entrante = {**ENTRANTE, "remitente_conocido": False}
    cola = ejecutar(
        BuzonExecutor(store=store_mock(handler_base({}, entrante=entrante, enviados_hilo=2))),
        new_data_message({"accion": "redactar", "correo_entrante_id": "ce-1"}),
    )
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "humano" in razon_fallo(cola)


def test_clase_fuera_de_permitidas_es_failed():
    cola = ejecutar(
        BuzonExecutor(store=store_mock(handler_base({}))),
        new_data_message({"accion": "redactar", "correo_entrante_id": "ce-1",
                          "clase": "propuesta_comercial"}),
    )
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "clases_permitidas" in razon_fallo(cola)


def test_buzon_inactivo_es_failed():
    buzon = {**BUZON, "activo": False}
    cola = ejecutar(
        BuzonExecutor(store=store_mock(handler_base({}, buzon=buzon))),
        new_data_message({"accion": "redactar", "correo_entrante_id": "ce-1"}),
    )
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED


# ---------- entrada invalida / fallo visible ----------

def test_texto_libre_es_failed():
    cola = ejecutar(BuzonExecutor(store=BuzonStore(url="", key="")),
                    new_text_message("hazme un correo"))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED


def test_accion_desconocida_es_failed():
    cola = ejecutar(BuzonExecutor(store=BuzonStore(url="", key="")),
                    new_data_message({"accion": "enviar", "correo_entrante_id": "x"}))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "leer" in razon_fallo(cola)  # y "enviar" NO es accion: el buzon no envia


def test_supabase_caido_es_failed_no_borrador_perdido():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    cola = ejecutar(
        BuzonExecutor(store=store_mock(handler)),
        new_data_message({"accion": "redactar", "correo_entrante_id": "ce-1"}),
    )
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "Supabase" in razon_fallo(cola)


def test_sin_supabase_el_fallo_nombra_su_causa():
    """Regresion del 1er arranque real: sin env decia 'UnsupportedProtocol'."""
    cola = ejecutar(BuzonExecutor(store=BuzonStore(url="", key="")),
                    new_data_message({"accion": "leer", "hilo_id": "h1"}))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    razon = razon_fallo(cola)
    assert "Supabase no configurado" in razon and "SUPABASE_URL" in razon
    assert "UnsupportedProtocol" not in razon
