"""app.py — servicio A2A del buzon (SPEC-buzon-a2a §0.2).

Starlette PURO a proposito (no FastAPI): la superficie es exactamente
{card, rpc, /health} — patron grafo-a2a. Sin /docs ni /openapi.json.
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
from executor import BuzonExecutor


async def health(_: Request) -> JSONResponse:
    """Liveness del puente A2A (no reporta nada del buzon: opacidad)."""
    return JSONResponse({"status": "ok"})


def build_app(executor: BuzonExecutor | None = None) -> Starlette:
    """Construye la app (executor inyectable para tests)."""
    agent_card = build_card()
    handler = DefaultRequestHandler(
        agent_executor=executor or BuzonExecutor(),
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
