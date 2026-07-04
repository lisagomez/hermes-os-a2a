"""app.py — servicio A2A del Coordinador del enjambre (Fase 7, PRP-007).

Starlette puro (patron grafo-a2a/ejecutor-a2a): la superficie es EXACTAMENTE
{card, JSON-RPC '/', /health}. Sin /docs ni /openapi.json.
"""
from __future__ import annotations

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.routes import create_agent_card_routes, create_jsonrpc_routes
from a2a.server.tasks import InMemoryTaskStore
from a2a.utils import DEFAULT_RPC_URL

from card import build_card
from executor import CoordinadorA2A


async def health(_: Request) -> JSONResponse:
    """Liveness del servicio (no reporta nada del plan ni de las sub-tareas)."""
    return JSONResponse({"status": "ok"})


def build_app(executor: CoordinadorA2A | None = None) -> Starlette:
    """Construye la app (env leida aqui; executor inyectable para tests)."""
    agent_card = build_card()
    handler = DefaultRequestHandler(
        agent_executor=executor or CoordinadorA2A(),
        task_store=InMemoryTaskStore(),
        agent_card=agent_card,
    )
    return Starlette(
        routes=[
            *create_agent_card_routes(agent_card),
            *create_jsonrpc_routes(handler, DEFAULT_RPC_URL),
            Route("/health", health, methods=["GET"]),
        ]
    )


app = build_app()
