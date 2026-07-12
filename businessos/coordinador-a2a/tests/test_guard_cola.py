"""Guard de la COLA en el Coordinador (PRP-010, Fase 7 diferida) — sin red.

El Ejecutor ya no construye al recibir: ENCOLA y responde `{encolada, posicion}`. El enjambre
todavia espera un veredicto sincrono, asi que DEBE romper — pero rompiendo con la verdad. El
mensaje importa: un "no trae veredicto" manda a buscar el bug al sitio equivocado (justo lo
que nos costo el dia entero el 2026-07-12).

Se ejercita el cliente REAL (`EjecutorCliente.ejecutar`) contra un servicio A2A de verdad
—montado con el mismo SDK— que responde como responde el Ejecutor con cola.
"""
from __future__ import annotations

import asyncio

import httpx
import pytest

from a2a.helpers import new_data_part, new_task
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.routes import create_agent_card_routes, create_jsonrpc_routes
from a2a.server.tasks import InMemoryTaskStore, TaskUpdater
from a2a.types import (
    AgentCapabilities,
    AgentCard,
    AgentInterface,
    AgentSkill,
    TaskState,
)
from a2a.utils import DEFAULT_RPC_URL, TransportProtocol
from starlette.applications import Starlette

from ejecutor_cliente import EjecutorCliente, EjecutorError

URL = "http://ejecutor-a2a:4100"


class EjecutorQueEncola(AgentExecutor):
    """El Ejecutor de verdad tras PRP-010: acepta, encola y responde la posicion."""

    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        if context.current_task is None:
            await event_queue.enqueue_event(
                new_task(context.task_id, context.context_id,
                         TaskState.TASK_STATE_SUBMITTED,
                         history=[context.message] if context.message else None)
            )
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        await updater.start_work()
        await updater.add_artifact(
            [new_data_part({"encolada": True, "task_id": "sub-1", "posicion": 2,
                            "en_ejecucion": "otra", "cola": []})],
            name="encolada",
        )
        await updater.complete()

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        await TaskUpdater(event_queue, context.task_id, context.context_id).cancel()


def app_que_encola() -> Starlette:
    card = AgentCard(
        name="ejecutor-a2a",
        description="encola",
        version="2.0.0",
        supported_interfaces=[
            AgentInterface(url=URL, protocol_binding=TransportProtocol.JSONRPC)
        ],
        capabilities=AgentCapabilities(streaming=False, push_notifications=False),
        default_input_modes=["application/json"],
        default_output_modes=["application/json"],
        skills=[AgentSkill(id="construir-software", name="c", description="d", tags=["t"])],
    )
    handler = DefaultRequestHandler(
        agent_executor=EjecutorQueEncola(),
        task_store=InMemoryTaskStore(),
        agent_card=card,
    )
    return Starlette(routes=[
        *create_agent_card_routes(card),
        *create_jsonrpc_routes(handler, DEFAULT_RPC_URL),
    ])


def test_si_el_ejecutor_encola_el_enjambre_rompe_diciendo_la_verdad():
    sub_tarea = {
        "task_id": "sub-1", "departamento": "software", "objetivo": "x",
        "contexto": {}, "criterios_aceptacion": ["build verde"],
        "limites": {"intentos_max": 1},
    }

    async def escenario():
        http = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app_que_encola()), base_url=URL, timeout=30
        )
        cliente = EjecutorCliente(base_url=URL, http_client=http)
        try:
            with pytest.raises(EjecutorError) as e:
                await cliente.ejecutar(sub_tarea)
            return str(e.value)
        finally:
            await http.aclose()

    razon = asyncio.run(escenario())

    # El mensaje tiene que llevar al sitio correcto, no a un falso "no trae veredicto".
    assert "ENCOLO la sub-tarea" in razon
    assert "posicion 2" in razon
    assert "NO reintentar" in razon  # el worker ya la va a ejecutar: reintentar duplicaria
