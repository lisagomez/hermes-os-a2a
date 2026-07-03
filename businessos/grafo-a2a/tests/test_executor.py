"""Tests del executor puente (Fase 2 del PRP-005), con el grafo MOCKEADO.

Sin red ni LLM: httpx.MockTransport simula al grafo; una cola espia captura
los eventos A2A. Invariante de regla de oro: el artifact SIEMPRE lleva la
EvaluacionResponse integra (disclaimer + fuentes) o la tarea falla.
"""
from __future__ import annotations

import asyncio
import json

import httpx
import pytest

from a2a.helpers import get_data_parts, new_data_message, new_text_message
from a2a.server.agent_execution import RequestContext
from a2a.server.context import ServerCallContext
from a2a.types import SendMessageRequest, TaskArtifactUpdateEvent, TaskState, TaskStatusUpdateEvent

from executor import EntradaInvalida, GrafoExecutor, solicitud_desde_mensaje

RESPUESTA_GRAFO = {
    "id": "11111111-1111-1111-1111-111111111111",
    "contexto": {"jurisdiccion": "MX", "dimension": "fiscal", "regimen": "PM_TITULO_II", "fecha": "2026-06-15"},
    "estado": "deducible",
    "conceptos": [
        {
            "descripcion": "Honorarios de consultoria fiscal",
            "categoria": "honorarios",
            "estado": "deducible",
            "razon": "LISR Art. 27, fraccion V",
            "fuente": {
                "clave": "MX-LISR-27-V",
                "cita": "LISR Art. 27, fraccion V",
                "url": "https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf",
                "vigencia": {"desde": "2025-01-01", "hasta": None},
            },
            "banderas": [],
            "checklist": ["CFDI vigente"],
        }
    ],
    "banderas_rojas": [],
    "checklist": ["CFDI vigente"],
    "fuentes": [
        {
            "clave": "MX-LISR-27-V",
            "cita": "LISR Art. 27, fraccion V",
            "url": "https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf",
            "vigencia": {"desde": "2025-01-01", "hasta": None},
        }
    ],
    "disclaimer": "Esto no es asesoria fiscal; senala riesgos, el profesional decide.",
}


class ColaEspia:
    """EventQueue minima (el SDK la define como protocolo con enqueue_event)."""

    def __init__(self) -> None:
        self.eventos: list = []

    async def enqueue_event(self, evento) -> None:
        self.eventos.append(evento)


def contexto_con(mensaje) -> RequestContext:
    return RequestContext(
        ServerCallContext(),
        request=SendMessageRequest(message=mensaje),
        task_id="tarea-1",
        context_id="ctx-1",
    )


def grafo_mock(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


def estados(cola: ColaEspia) -> list[int]:
    return [
        e.status.state for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)
    ]


def artifacts(cola: ColaEspia) -> list:
    return [e.artifact for e in cola.eventos if isinstance(e, TaskArtifactUpdateEvent)]


def ejecutar(executor: GrafoExecutor, mensaje) -> ColaEspia:
    cola = ColaEspia()
    asyncio.run(executor.execute(contexto_con(mensaje), cola))
    return cola


def test_datapart_estructurado_entrega_evaluacion_integra():
    capturadas = []

    def grafo(request: httpx.Request) -> httpx.Response:
        capturadas.append(json.loads(request.content))
        return httpx.Response(200, json=RESPUESTA_GRAFO)

    executor = GrafoExecutor(grafo_url="http://grafo:3000", http_client=grafo_mock(grafo))
    solicitud = {
        "contexto": {"jurisdiccion": "MX", "dimension": "fiscal"},
        "conceptos": [{"descripcion": "Honorarios de consultoria fiscal", "importe": 12000}],
    }
    cola = ejecutar(executor, new_data_message(solicitud))

    assert capturadas == [solicitud]  # el puente NO altera la solicitud
    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED
    [artifact] = artifacts(cola)
    assert artifact.name == "evaluacion"
    [entregada] = get_data_parts(artifact.parts)
    # Regla de oro: la respuesta viaja INTEGRA — disclaimer y fuentes intactos.
    assert entregada["disclaimer"] == RESPUESTA_GRAFO["disclaimer"]
    assert entregada["fuentes"][0]["cita"] == "LISR Art. 27, fraccion V"
    assert entregada["conceptos"][0]["estado"] == "deducible"


def test_texto_libre_un_concepto_por_linea():
    capturadas = []

    def grafo(request: httpx.Request) -> httpx.Response:
        capturadas.append(json.loads(request.content))
        return httpx.Response(200, json=RESPUESTA_GRAFO)

    executor = GrafoExecutor(http_client=grafo_mock(grafo))
    cola = ejecutar(
        executor,
        new_text_message("Honorarios de consultoria fiscal\n\nCarga de gasolina magna\n"),
    )

    assert capturadas == [
        {
            "conceptos": [
                {"descripcion": "Honorarios de consultoria fiscal"},
                {"descripcion": "Carga de gasolina magna"},
            ]
        }
    ]
    assert estados(cola)[-1] == TaskState.TASK_STATE_COMPLETED


def test_mensaje_invalido_falla_sin_llamar_al_grafo():
    llamadas = []

    def grafo(request: httpx.Request) -> httpx.Response:
        llamadas.append(request)
        return httpx.Response(200, json=RESPUESTA_GRAFO)

    executor = GrafoExecutor(http_client=grafo_mock(grafo))
    cola = ejecutar(executor, new_data_message({"sin_conceptos": True}))

    assert llamadas == []
    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert artifacts(cola) == []


def test_grafo_caido_falla_con_razon_clara():
    def grafo(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    executor = GrafoExecutor(http_client=grafo_mock(grafo))
    cola = ejecutar(executor, new_text_message("Honorarios"))

    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    fallo = [e for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)][-1]
    assert "grafo no disponible" in fallo.status.message.parts[0].text


def test_rechazo_del_grafo_propaga_detalle():
    def grafo(request: httpx.Request) -> httpx.Response:
        return httpx.Response(422, json={"detail": "conceptos: lista vacia"})

    executor = GrafoExecutor(http_client=grafo_mock(grafo))
    cola = ejecutar(executor, new_text_message("Honorarios"))

    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    fallo = [e for e in cola.eventos if isinstance(e, TaskStatusUpdateEvent)][-1]
    assert "422" in fallo.status.message.parts[0].text


def test_regla_de_oro_sin_disclaimer_no_se_entrega():
    """Defensa en profundidad: si el grafo (o un proxy) devolviera una evaluacion
    sin disclaimer/fuentes, el puente NO la entrega — falla la tarea."""
    mutilada = {k: v for k, v in RESPUESTA_GRAFO.items() if k != "disclaimer"}

    def grafo(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=mutilada)

    executor = GrafoExecutor(http_client=grafo_mock(grafo))
    cola = ejecutar(executor, new_text_message("Honorarios"))

    assert estados(cola)[-1] == TaskState.TASK_STATE_FAILED
    assert artifacts(cola) == []


def test_solicitud_desde_mensaje_rechaza_multiples_dataparts():
    m = new_data_message({"conceptos": [{"descripcion": "a"}]})
    m.parts.append(new_data_message({"conceptos": [{"descripcion": "b"}]}).parts[0])
    with pytest.raises(EntradaInvalida):
        solicitud_desde_mensaje(m)
