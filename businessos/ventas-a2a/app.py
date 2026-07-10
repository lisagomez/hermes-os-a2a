"""app.py — servicio A2A de ventas (Fase 9, departamento adquisicion).

Starlette PURO a proposito (no FastAPI): la superficie A2A no publica /docs ni
/openapi.json — la unica promesa es la Agent Card. Rutas: card en
/.well-known/agent-card.json, JSON-RPC A2A en '/', y /health para el
healthcheck del contenedor (liveness propia, sin datos de leads).
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
from executor import VentasExecutor


async def health(_: Request) -> JSONResponse:
    """Liveness del servicio (no reporta leads ni configuracion: opacidad)."""
    return JSONResponse({"status": "ok"})


def build_app(executor: VentasExecutor | None = None) -> Starlette:
    """Construye la app (env leida aqui; executor inyectable para tests)."""
    agent_card = build_card()
    handler = DefaultRequestHandler(
        agent_executor=executor or VentasExecutor(),
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
