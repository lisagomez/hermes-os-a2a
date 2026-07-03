"""Interoperabilidad end-to-end (Fase 3 del PRP-005).

Un cliente A2A del SDK oficial — simulando el agente de un tercero — descubre
al grafo-a2a por su Agent Card y completa una evaluacion REAL: el executor
puentea a la app del grafo con sus reglas reales (seed/reglas.json, patron de
los tests del propio grafo). Todo in-process via ASGITransport: sin red, sin
LLM (no hay ninguno instalado; el flujo entero es determinista).
"""
from __future__ import annotations

import asyncio
import importlib.util
import json
import sys
from pathlib import Path

import httpx
import pytest

from a2a.client import A2ACardResolver, ClientConfig, ClientFactory
from a2a.helpers import get_data_parts, new_data_message, new_text_message
from a2a.types import SendMessageRequest, TaskState

from app import build_app
from executor import GrafoExecutor

GRAFO_DIR = Path(__file__).resolve().parent.parent.parent / "grafo"


@pytest.fixture(scope="module")
def grafo_real():
    """La app REAL del grafo con el seed real (sin postgres, como en sus tests)."""
    if str(GRAFO_DIR) not in sys.path:
        sys.path.insert(0, str(GRAFO_DIR))
    spec = importlib.util.spec_from_file_location("grafo_app", GRAFO_DIR / "app.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules["grafo_app"] = mod
    spec.loader.exec_module(mod)

    seed = json.loads((GRAFO_DIR / "seed" / "reglas.json").read_text(encoding="utf-8"))
    mod.app.dependency_overrides[mod.dep_conocimiento] = lambda: {
        "reglas": seed["reglas"],
        "categorias": seed["categorias"],
    }
    mod.app.dependency_overrides[mod.dep_guardar] = lambda: (
        lambda contexto, entrada, salida: None
    )
    return mod.app


def evaluar_como_tercero(grafo_real, mensaje):
    """Flujo completo de un agente de un tercero: card -> cliente -> message/send."""

    async def flujo():
        # El executor del servicio habla con el grafo real (in-process).
        puente = httpx.AsyncClient(transport=httpx.ASGITransport(app=grafo_real))
        servicio = build_app(executor=GrafoExecutor(http_client=puente))

        # El tercero solo tiene la URL base: descubre TODO por la card.
        http = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=servicio), base_url="http://grafo-a2a:4000"
        )
        card = await A2ACardResolver(http, "http://grafo-a2a:4000").get_agent_card()
        cliente = ClientFactory(ClientConfig(httpx_client=http, streaming=False)).create(card)

        respuestas = []
        async for r in cliente.send_message(SendMessageRequest(message=mensaje)):
            respuestas.append(r)
        await http.aclose()
        await puente.aclose()
        return card, respuestas

    return asyncio.run(flujo())


def tarea_final(respuestas):
    tareas = [r.task for r in respuestas if r.HasField("task")]
    assert tareas, f"el cliente no recibio tarea: {respuestas}"
    return tareas[-1]


def test_tercero_descubre_por_card_y_evalua_con_fuente_real(grafo_real):
    solicitud = {
        "contexto": {"jurisdiccion": "MX", "dimension": "fiscal", "fecha": "2026-06-15"},
        "conceptos": [{"descripcion": "Honorarios de consultoria fiscal", "importe": 12000}],
    }
    card, respuestas = evaluar_como_tercero(grafo_real, new_data_message(solicitud))

    assert card.skills[0].id == "evaluar-impacto-regulatorio"
    tarea = tarea_final(respuestas)
    assert tarea.status.state == TaskState.TASK_STATE_COMPLETED

    [artifact] = tarea.artifacts
    [evaluacion] = get_data_parts(artifact.parts)
    # Evaluacion REAL con regla real del seed: LISR 27-V, deducible.
    assert evaluacion["conceptos"][0]["estado"] == "deducible"
    assert evaluacion["conceptos"][0]["fuente"]["clave"] == "MX-LISR-27-V"
    # Regla de oro a traves del protocolo: disclaimer y fuentes integros.
    assert evaluacion["disclaimer"]
    assert all(f["cita"] and f["url"] for f in evaluacion["fuentes"])


def test_tercero_manda_texto_libre_y_recibe_failsafe_dudoso(grafo_real):
    _, respuestas = evaluar_como_tercero(
        grafo_real, new_text_message("Ajuste interno misterioso XYZ")
    )
    tarea = tarea_final(respuestas)
    assert tarea.status.state == TaskState.TASK_STATE_COMPLETED

    [evaluacion] = get_data_parts(tarea.artifacts[0].parts)
    concepto = evaluacion["conceptos"][0]
    assert concepto["estado"] == "dudoso"
    assert concepto["razon"] == "sin regla aplicable"
    assert evaluacion["disclaimer"]
