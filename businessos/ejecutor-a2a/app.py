"""app.py — servicio A2A del Ejecutor (Fase 6, PRP-006 → la cola, PRP-010).

Starlette puro (patron grafo-a2a): la superficie es EXACTAMENTE
{card, JSON-RPC '/', /health}. Sin /docs ni /openapi.json. **La cola NO añade superficie
HTTP** (`/cola` o `/status` romperian la opacidad): quien quiera ver la cola lee el
snapshot `tareas.json`, que ya existe.

El WORKER (unico, serial) arranca aqui, en el lifespan: vive DENTRO de este proceso — mismo
mount de `/repo` y `/workspace`, y el mismo escritor de `tareas`.
"""
from __future__ import annotations

import asyncio
import contextlib
import os
from collections.abc import AsyncIterator

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.routes import create_agent_card_routes, create_jsonrpc_routes
from a2a.server.tasks import InMemoryTaskStore
from a2a.utils import DEFAULT_RPC_URL

from card import build_card
from executor import EjecutorA2A
from worker import Worker


async def health(_: Request) -> JSONResponse:
    """Liveness del servicio (no reporta nada del workspace ni de tareas)."""
    return JSONResponse({"status": "ok"})


def build_app(executor: EjecutorA2A | None = None, worker: Worker | None = None) -> Starlette:
    """Construye la app (env leida aqui; executor/worker inyectables para tests)."""
    agent_card = build_card()
    handler = DefaultRequestHandler(
        agent_executor=executor or EjecutorA2A(),
        task_store=InMemoryTaskStore(),
        agent_card=agent_card,
    )

    @contextlib.asynccontextmanager
    async def lifespan(_: Starlette) -> AsyncIterator[None]:
        # EJECUTOR_WORKER=0 para levantar el servicio SIN drenar la cola (util para tests de
        # interop y para un rebuild que no quiera tocar trabajo en vuelo).
        activo = os.environ.get("EJECUTOR_WORKER", "1") != "0"
        w = worker or (Worker() if activo else None)
        tarea = asyncio.create_task(w.arrancar()) if w else None
        try:
            yield
        finally:
            if w and tarea:
                w.parar()
                tarea.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await tarea

    return Starlette(
        routes=[
            *create_agent_card_routes(agent_card),
            *create_jsonrpc_routes(handler, DEFAULT_RPC_URL),
            Route("/health", health, methods=["GET"]),
        ],
        lifespan=lifespan,
    )


app = build_app()
