"""grafo-gate — puerta PUBLICA del grafo regulatorio (puente Vercel→grafo).

Publica EXCLUSIVAMENTE `POST /evaluaciones` del grafo (mínimo privilegio) detrás
de un token Bearer. Fail-closed por diseño: sin `GRAFO_GATE_TOKEN` (≥32 chars)
el servicio NO arranca — un gate sin candado es config inválida, no un default.

Los consumidores internos de hermes-net (Hermes, flujos-a2a, host-jobs) siguen
hablando con `grafo:3000` directo y sin token; este gate existe solo para el
camino público que entra por el edge (Caddy). La comparación del token es de
tiempo constante (hmac.compare_digest).
"""
from __future__ import annotations

import hmac
import os

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse

MAX_BODY = 64 * 1024  # espejo del request_body del edge: nadie legítimo manda más
TIMEOUT_S = 15.0
TOKEN_MIN = 32


def crear_app(
    token: str | None = None,
    upstream: str | None = None,
    transport: httpx.AsyncBaseTransport | None = None,  # solo tests
) -> FastAPI:
    token_final = token if token is not None else os.environ.get("GRAFO_GATE_TOKEN", "")
    upstream_final = (upstream or os.environ.get("GRAFO_UPSTREAM", "http://grafo:3000")).rstrip("/")
    if len(token_final) < TOKEN_MIN:
        raise RuntimeError(
            f"GRAFO_GATE_TOKEN ausente o menor a {TOKEN_MIN} caracteres: "
            "el gate NO arranca sin candado (fail-closed)."
        )

    app = FastAPI(openapi_url=None, docs_url=None, redoc_url=None)
    cliente = httpx.AsyncClient(timeout=TIMEOUT_S, transport=transport)
    esperado = f"Bearer {token_final}"

    def autorizado(req: Request) -> bool:
        return hmac.compare_digest(req.headers.get("authorization", ""), esperado)

    @app.get("/health")
    async def health() -> dict:
        # Salud del GATE, no del grafo: no se convierte en oráculo del upstream.
        return {"ok": True, "servicio": "grafo-gate"}

    @app.post("/evaluaciones")
    async def evaluaciones(req: Request) -> Response:
        if not autorizado(req):
            return JSONResponse({"error": "no autorizado"}, status_code=401)
        cuerpo = await req.body()
        if len(cuerpo) > MAX_BODY:
            return JSONResponse({"error": "cuerpo demasiado grande"}, status_code=413)
        try:
            r = await cliente.post(
                f"{upstream_final}/evaluaciones",
                content=cuerpo,
                headers={"content-type": req.headers.get("content-type", "application/json")},
            )
        except httpx.HTTPError as exc:  # timeout, conexión, etc.
            # Regla 2026-07-13: ningún camino degradado silencioso.
            print(f"[grafo-gate] upstream inalcanzable: {type(exc).__name__}: {exc}", flush=True)
            return JSONResponse({"error": "el grafo no respondió"}, status_code=502)
        return Response(
            content=r.content,
            status_code=r.status_code,
            media_type=r.headers.get("content-type", "application/json"),
        )

    return app
