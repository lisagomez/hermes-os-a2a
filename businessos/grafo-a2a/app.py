"""app.py — servicio A2A del grafo (Fase 5, PRP-005).

Starlette PURO a proposito (no FastAPI): la superficie A2A no publica /docs ni
/openapi.json — la unica promesa es la Agent Card. Rutas: card en
/.well-known/agent-card.json, JSON-RPC A2A en '/', y /health para el
healthcheck del contenedor (liveness propia, sin datos del grafo).
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
from executor import GrafoExecutor


async def health(_: Request) -> JSONResponse:
    """Liveness del puente A2A (no reporta nada del grafo: opacidad)."""
    return JSONResponse({"status": "ok"})


def build_app() -> Starlette:
    """Construye la app (env leida aqui: testeable con monkeypatch)."""
    agent_card = build_card()
    handler = DefaultRequestHandler(
        agent_executor=GrafoExecutor(),
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
