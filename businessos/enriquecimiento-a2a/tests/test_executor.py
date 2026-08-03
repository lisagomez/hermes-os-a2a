"""Executor A2A: fallos visibles y artifact completo (sin red, sin LLM)."""
from __future__ import annotations

import asyncio

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

from almacen import Almacen
from executor import EnriquecimientoExecutor
from fakes import DENUE_ACME, FakeDenueAPI, FakeGrafo, FakeSupabase, RFC_PM as PM
from gate_grafo import GateGrafo


class ColaEspia:
    def __init__(self) -> None:
        self.eventos: list = []

    async def enqueue_event(self, evento) -> None:
        self.eventos.append(evento)


def contexto_con(mensaje) -> RequestContext:
    return RequestContext(
        ServerCallContext(),
        request=SendMessageRequest(message=mensaje),
        task_id="enr-t-1",
        context_id="ctx-1",
    )


def armar(sb: FakeSupabase | None = None, grafo: FakeGrafo | None = None,
          denue_api: FakeDenueAPI | None = None) -> EnriquecimientoExecutor:
    grafo = grafo or FakeGrafo()
    gate = GateGrafo(url="http://g", http_client=grafo.client())
    if sb is None:
        almacen = Almacen(url="", key="")
    else:
        almacen = Almacen(url="http://sb", key="k", http_client=sb.client())
    return EnriquecimientoExecutor(
        gate=gate, almacen=almacen, denue=(denue_api or FakeDenueAPI([])).cliente())


def ejecutar(executor: EnriquecimientoExecutor, mensaje) -> ColaEspia:
    cola = ColaEspia()
    asyncio.run(executor.execute(contexto_con(mensaje), cola))
    return cola


def estados(cola: ColaEspia) -> list[int]:
    return [e.status.state for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)]


def artifact_de(cola: ColaEspia) -> dict:
    artifacts = [e.artifact for e in cola.eventos if isinstance(e, TaskArtifactUpdateEvent)]
    assert len(artifacts) == 1 and artifacts[0].name == "lead-enriquecido"
    [data] = get_data_parts(artifacts[0].parts)
    return data


def razon_de_fallo(cola: ColaEspia) -> str:
    fallo = [e for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)][-1]
    return fallo.status.message.parts[0].text


# ---------- happy path ----------

def test_flujo_feliz_artifact_completo():
    sb = FakeSupabase()
    sb.leads["lead-1"] = {"lead_id": "lead-1", "empresa": "ACME SA DE CV",
                          "contacto": "", "telefono": "", "datos": {"rfc": PM}}
    sb.filas_69b[PM] = {"rfc": PM, "estatus": "no_listado"}
    cola = ejecutar(armar(sb, denue_api=FakeDenueAPI(DENUE_ACME)),
                    new_data_message({"lead_id": "lead-1"}))

    # Gotcha SDK v1: el Task va encolado ANTES del primer status update.
    assert isinstance(cola.eventos[0], Task)
    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED
    data = artifact_de(cola)
    assert data["lead_id"] == "lead-1"
    assert data["persistido"] is True
    assert data["gate_69b"]["pasa"] is True
    assert data["resultados"]["telefono"]["valor"] == "5511112222"
    assert data["disclaimer"]  # SIEMPRE presente (viene del grafo)
    assert data["fuentes"]
    assert set(data["gate_grafo"]) == {
        "consulta a fuente publica oficial",
        "inferencia de correo corporativo por patron de correo de dominio",
        "dato de persona fisica para prospeccion",
        "transferencia internacional de datos a proveedor de enriquecimiento",
    }
    assert sb.escrituras_leads == []


def test_sin_supabase_no_finge_y_completa():
    cola = ejecutar(armar(None), new_data_message({"lead_id": "lead-x", "empresa": "ACME"}))
    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED
    data = artifact_de(cola)
    assert data["persistido"] is False


# ---------- entrada invalida ----------

def test_sin_lead_id_es_failed():
    cola = ejecutar(armar(None), new_data_message({"campos": ["email"]}))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "lead_id" in razon_de_fallo(cola)


def test_lead_id_con_separadores_de_query_es_failed():
    # defensa en profundidad anti-inyeccion PostgREST (QA PR #210):
    # el almacen ademas escapa (test_almacen_urls.py), pero esto ni entra
    cola = ejecutar(armar(None),
                    new_data_message({"lead_id": "x&select=*&limit=1"}))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "lead_id" in razon_de_fallo(cola)


def test_rfc_como_campo_producible_es_failed():
    # el RFC no es producible: solo se valida el provisto (contrato honesto)
    cola = ejecutar(armar(None), new_data_message({"lead_id": "l", "campos": ["rfc"]}))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "producible" in razon_de_fallo(cola)


def test_texto_libre_es_failed():
    cola = ejecutar(armar(None), new_text_message("enriquece el lead-1 porfa"))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED


# ---------- fallos visibles ----------

def test_grafo_caido_es_failed_nada_corre():
    api = FakeDenueAPI(DENUE_ACME)
    cola = ejecutar(armar(None, grafo=FakeGrafo(status_code=500), denue_api=api),
                    new_data_message({"lead_id": "lead-1", "empresa": "ACME"}))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "grafo" in razon_de_fallo(cola)
    assert api.llamadas == 0, "sin gate LFPDPPP nada corre (fail-closed)"


def test_lead_inexistente_es_failed():
    sb = FakeSupabase()
    cola = ejecutar(armar(sb), new_data_message({"lead_id": "lead-nope"}))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "no existe" in razon_de_fallo(cola)


def test_ledger_no_escribible_es_failed():
    sb = FakeSupabase()
    sb.leads["lead-1"] = {"lead_id": "lead-1", "empresa": "ACME", "contacto": "",
                          "telefono": "", "datos": {}}
    sb.fallar_ledger = True
    cola = ejecutar(armar(sb), new_data_message({"lead_id": "lead-1"}))
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert "ledger" in razon_de_fallo(cola)


# ---------- lo inline manda sobre lo leido ----------

def test_empresa_inline_pisa_la_del_lead():
    sb = FakeSupabase()
    sb.leads["lead-1"] = {"lead_id": "lead-1", "empresa": "OTRA SA", "contacto": "",
                          "telefono": "", "datos": {}}
    api = FakeDenueAPI(DENUE_ACME)
    cola = ejecutar(armar(sb, denue_api=api),
                    new_data_message({"lead_id": "lead-1", "empresa": "ACME SA DE CV",
                                      "rfc": PM}))
    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED
    data = artifact_de(cola)
    assert data["resultados"]["razon_social"]["valor"] == "ACME SA DE CV"
