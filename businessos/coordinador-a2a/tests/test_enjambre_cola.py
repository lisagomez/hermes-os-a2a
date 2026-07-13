"""El enjambre habla con la COLA (PRP-010, Fase 7) — sin red, sin tokens.

Sustituye al guard: el Coordinador ya no rompe cuando el Ejecutor encola. ENCOLA, espera su
turno como todo el mundo y reconstruye {resultado, veredicto}.

Los dos tests que importan:
  1. el ciclo encolar→esperar→veredicto contra un servicio A2A REAL (mismo SDK);
  2. que el diff sale de GIT y no de la fila — `estado.py` lo recorta a 20k para meterlo en
     el jsonb, y la integracion hace `git apply`: integrar un diff truncado seria corromper
     el trabajo en silencio.
"""
from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path

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

VEREDICTO_APROBADO = {
    "veredicto": "aprobado",
    "gates": [{"regla": "build", "estado": "paso", "evidencia": "exit 0"}],
    "hallazgos": [],
}


class EjecutorQueEncola(AgentExecutor):
    """El Ejecutor real tras PRP-010: acepta, encola y responde la posicion."""

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
        name="ejecutor-a2a", description="encola", version="2.0.0",
        supported_interfaces=[AgentInterface(url=URL, protocol_binding=TransportProtocol.JSONRPC)],
        capabilities=AgentCapabilities(streaming=False, push_notifications=False),
        default_input_modes=["application/json"], default_output_modes=["application/json"],
        skills=[AgentSkill(id="construir-software", name="c", description="d", tags=["t"])],
    )
    handler = DefaultRequestHandler(
        agent_executor=EjecutorQueEncola(), task_store=InMemoryTaskStore(), agent_card=card)
    return Starlette(routes=[*create_agent_card_routes(card),
                             *create_jsonrpc_routes(handler, DEFAULT_RPC_URL)])


class EsperaFake:
    """La cola: la sub-tarea espera su turno y acaba con un desenlace."""

    def __init__(self, fila: dict) -> None:
        self._fila = fila
        self.esperadas: list[str] = []

    async def esperar(self, task_id: str) -> dict:
        self.esperadas.append(task_id)
        return self._fila


@pytest.fixture()
def workspace(tmp_path: Path) -> Path:
    """Un worktree como el que deja el worker: cambios STAGED, sin commit."""
    wt = tmp_path / "worktree" / "sub-1"
    wt.mkdir(parents=True)
    for cmd in (["git", "init", "-b", "main"], ["git", "config", "user.email", "t@t"],
                ["git", "config", "user.name", "t"]):
        subprocess.run(cmd, cwd=wt, check=True, capture_output=True)
    (wt / "README.md").write_text("base\n")
    subprocess.run(["git", "add", "-A"], cwd=wt, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "init"], cwd=wt, check=True, capture_output=True)
    (wt / "grande.ts").write_text("export const x = 1\n" * 3000)  # diff >> 20.000 chars
    return tmp_path


def sub_tarea() -> dict:
    return {"task_id": "sub-1", "departamento": "software", "objetivo": "x",
            "contexto": {}, "criterios_aceptacion": ["build verde"],
            "limites": {"intentos_max": 1}}


def correr(espera: EsperaFake, workspace_root: Path) -> dict:
    async def escenario():
        http = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app_que_encola()), base_url=URL, timeout=30)
        cliente = EjecutorCliente(base_url=URL, http_client=http, espera=espera,
                                  workspace_root=workspace_root)
        try:
            return await cliente.ejecutar(sub_tarea())
        finally:
            await http.aclose()

    return asyncio.run(escenario())


def test_el_enjambre_encola_espera_su_turno_y_recoge_el_veredicto(workspace):
    espera = EsperaFake({"task_id": "sub-1", "estado": "aprobada",
                         "resultado": {"task_id": "sub-1", "notas": "hecho"},
                         "veredicto": VEREDICTO_APROBADO, "intentos": 1, "intentos_max": 1})

    salida = correr(espera, workspace)

    assert espera.esperadas == ["sub-1"]  # espera su turno: NO se salta la cola
    assert salida["veredicto"]["veredicto"] == "aprobado"
    assert salida["resultado"]["worktree"] == "worktree/sub-1"
    assert salida["resultado"]["archivos"] == ["grande.ts"]


def test_el_diff_sale_de_GIT_no_de_la_fila_truncada(workspace):
    """La fila trae el diff RECORTADO (jsonb, 20k). Integrar eso seria hacer `git apply` de
    un parche partido por la mitad: corromper el trabajo en silencio."""
    truncado = "diff --git a/grande.ts b/grande.ts\n" + "+export const x = 1\n" * 10  # a medias
    espera = EsperaFake({"task_id": "sub-1", "estado": "aprobada",
                         "resultado": {"task_id": "sub-1", "diff": truncado,
                                       "archivos": ["grande.ts"]},
                         "veredicto": VEREDICTO_APROBADO, "intentos": 1, "intentos_max": 1})

    diff = correr(espera, workspace)["resultado"]["diff"]

    assert diff != truncado
    assert len(diff) > 20_000  # el de verdad: mas grande que el limite del jsonb
    assert diff.count("export const x = 1") == 3000  # entero, aplicable con `git apply`


def test_una_sub_tarea_escalada_no_se_da_por_buena(workspace):
    espera = EsperaFake({"task_id": "sub-1", "estado": "escalada", "resultado": None,
                         "veredicto": None, "intentos": 3, "intentos_max": 3})

    with pytest.raises(EjecutorError, match="acabo en 'escalada'"):
        correr(espera, workspace)
