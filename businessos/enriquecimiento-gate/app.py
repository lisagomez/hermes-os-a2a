"""enriquecimiento-gate — puerta PUBLICA del waterfall de enriquecimiento.

Gemelo de `grafo-gate` (mismo patron, misma disciplina de token) para el puente
Vercel→enriquecimiento-a2a. Publica EXCLUSIVAMENTE el JSON-RPC del servicio A2A
(`POST /`) detras de un token Bearer. Fail-closed por diseno: sin
`ENRIQUECIMIENTO_GATE_TOKEN` (>=32 chars) el servicio NO arranca — un gate sin
candado es config invalida, no un default.

Por que un gate y no exponer el servicio: enriquecimiento-a2a habla con Supabase
con service_role y consulta el grafo; nada de eso debe quedar a un salto de
internet. Los consumidores internos de hermes-net siguen hablandole directo y
sin token.

Ademas del token, el gate acota el metodo: solo `SendMessage` pasa. Un gate que
reenvia cualquier metodo del protocolo no es minimo privilegio, es un tunel.
"""
from __future__ import annotations

import hmac
import json
import os

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse

MAX_BODY = 64 * 1024
TIMEOUT_S = 60.0  # la cascada consulta DENUE y el grafo: mas lenta que el grafo solo
TOKEN_MIN = 32
METODOS_PERMITIDOS = {"SendMessage"}


def crear_app(
    token: str | None = None,
    upstream: str | None = None,
    transport: httpx.AsyncBaseTransport | None = None,  # solo tests
) -> FastAPI:
    token_final = token if token is not None else os.environ.get("ENRIQUECIMIENTO_GATE_TOKEN", "")
    upstream_final = (
        upstream or os.environ.get("ENRIQUECIMIENTO_UPSTREAM", "http://enriquecimiento-a2a:5000")
    ).rstrip("/")
    if len(token_final) < TOKEN_MIN:
        raise RuntimeError(
            f"ENRIQUECIMIENTO_GATE_TOKEN ausente o menor a {TOKEN_MIN} caracteres: "
            "el gate NO arranca sin candado (fail-closed)."
        )

    app = FastAPI(openapi_url=None, docs_url=None, redoc_url=None)
    cliente = httpx.AsyncClient(timeout=TIMEOUT_S, transport=transport)
    esperado = f"Bearer {token_final}"

    def autorizado(req: Request) -> bool:
        return hmac.compare_digest(req.headers.get("authorization", ""), esperado)

    @app.get("/health")
    async def health() -> dict:
        # Salud del GATE, no del upstream: no se convierte en oraculo del servicio.
        return {"ok": True, "servicio": "enriquecimiento-gate"}

    @app.post("/rpc")
    async def rpc(req: Request) -> Response:
        if not autorizado(req):
            return JSONResponse({"error": "no autorizado"}, status_code=401)
        cuerpo = await req.body()
        if len(cuerpo) > MAX_BODY:
            return JSONResponse({"error": "cuerpo demasiado grande"}, status_code=413)
        try:
            metodo = json.loads(cuerpo).get("method")
        except (ValueError, AttributeError):
            return JSONResponse({"error": "cuerpo JSON-RPC invalido"}, status_code=400)
        if metodo not in METODOS_PERMITIDOS:
            return JSONResponse(
                {"error": f"metodo no permitido por el gate: {metodo!r}"}, status_code=403
            )
        try:
            r = await cliente.post(
                f"{upstream_final}/",
                content=cuerpo,
                headers={
                    "content-type": req.headers.get("content-type", "application/json"),
                    # El wire v1 lo exige; sin el, el upstream responde -32009.
                    "A2A-Version": "1.0",
                },
            )
        except httpx.HTTPError as exc:
            # Regla 2026-07-13: ningun camino degradado silencioso.
            print(f"[enriquecimiento-gate] upstream inalcanzable: {type(exc).__name__}: {exc}", flush=True)
            return JSONResponse({"error": "el enriquecimiento no respondio"}, status_code=502)
        return Response(
            content=r.content,
            status_code=r.status_code,
            media_type=r.headers.get("content-type", "application/json"),
        )

    return app
