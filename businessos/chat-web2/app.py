"""app.py — daemon del chat de venta de la landing web2 (Opción A, Fase 11).

Starlette PURO (sin FastAPI, igual que ventas-a2a): sin /docs ni /openapi.json.
Rutas:
  - POST /chat/stream : el turno del chat. Autenticado con Bearer
    OPENCLAW_GATEWAY_TOKEN (el mismo token que pone Vercel). Responde SSE con
    eventos {"type":"text_delta","text":...} y cierra con [DONE] — el contrato
    exacto que ya parsea ChatWidget.tsx.
  - GET /health : liveness para el healthcheck del contenedor.

Seguridad: falla CERRADO. Sin token configurado en el daemon → 503 (no dejamos
un chat abierto sin auth). Nunca expone al agente Hermes privado: el motor es un
LLM de OpenRouter acotado por prompt.py.
"""
from __future__ import annotations

import asyncio
import hmac
import json
import logging
import os
import re
from typing import AsyncIterator

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, Response, StreamingResponse
from starlette.routing import Route

from leads import LeadsStore
from motor import MotorError, MotorOpenRouter
from prompt import construir_mensajes

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
log = logging.getLogger("chat-web2")

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
MAX_MENSAJE = 2000
MAX_HISTORIAL = 16  # turnos previos que aceptamos (defensivo)
DEGRADE_ES = (
    "Estamos teniendo un problema para responder en este momento. Escríbenos por "
    'el formulario de "Agendar llamada" y te contactamos. 💬'
)

# Referencias fuertes a las tareas de captura en segundo plano (evita que el GC
# las cancele antes de terminar).
_bg: set[asyncio.Task] = set()


def _sse(payload: dict | str) -> bytes:
    dato = payload if isinstance(payload, str) else json.dumps(payload, ensure_ascii=False)
    return f"data: {dato}\n\n".encode()


def _texto_usuario(historial: list[dict], mensaje: str) -> str:
    """Solo lo que ESCRIBIÓ el visitante (para buscar email; ignora al agente)."""
    partes = [t.get("text", "") for t in historial if t.get("role") == "user"]
    partes.append(mensaje)
    return "\n".join(p for p in partes if p)


def _conversacion(historial: list[dict], mensaje: str) -> str:
    lineas = []
    for t in historial:
        quien = "Visitante" if t.get("role") == "user" else "Asistente"
        if t.get("text"):
            lineas.append(f"{quien}: {t['text']}")
    lineas.append(f"Visitante: {mensaje}")
    return "\n".join(lineas)


def _validar(raw: object) -> tuple[str, list[dict]] | None:
    """Valida el cuerpo. Devuelve (mensaje, historial) o None si es inválido."""
    if not isinstance(raw, dict):
        return None
    mensaje = raw.get("message")
    if not isinstance(mensaje, str) or not mensaje.strip():
        return None
    mensaje = mensaje.strip()[:MAX_MENSAJE]
    historial_in = raw.get("history") or []
    if not isinstance(historial_in, list):
        historial_in = []
    historial: list[dict] = []
    for t in historial_in[-MAX_HISTORIAL:]:
        if isinstance(t, dict) and isinstance(t.get("text"), str):
            rol = "agent" if t.get("role") == "agent" else "user"
            historial.append({"role": rol, "text": t["text"].strip()[:MAX_MENSAJE]})
    return mensaje, historial


def build_app(
    motor: MotorOpenRouter | None = None,
    leads: LeadsStore | None = None,
    token: str | None = None,
) -> Starlette:
    """Construye la app. Dependencias inyectables para tests (env por defecto)."""
    motor = motor or MotorOpenRouter()
    leads = leads or LeadsStore()
    token = token if token is not None else os.environ.get("OPENCLAW_GATEWAY_TOKEN", "")

    async def health(_: Request) -> JSONResponse:
        return JSONResponse({"status": "ok"})

    def _autorizado(request: Request) -> bool:
        if not token:
            return False  # falla cerrado: sin token configurado, nadie pasa
        auth = request.headers.get("authorization", "")
        prefijo = "Bearer "
        if not auth.startswith(prefijo):
            return False
        return hmac.compare_digest(auth[len(prefijo):], token)

    async def _capturar(conversacion: str) -> None:
        """Extrae y guarda el lead (best-effort, SIEMPRE loguea el resultado)."""
        try:
            lead = await motor.extraer_lead(conversacion)
            if lead:
                await leads.upsert(lead)
        except MotorError as exc:
            log.error("captura de lead falló en extracción: %s", exc)
        except Exception as exc:  # noqa: BLE001 — nunca debe tumbar nada
            log.error("captura de lead: error inesperado: %s", type(exc).__name__)

    async def chat_stream(request: Request) -> Response:
        if not _autorizado(request):
            estado = 503 if not token else 401
            return JSONResponse({"error": "no autorizado"}, status_code=estado)
        try:
            raw = await request.json()
        except (json.JSONDecodeError, ValueError):
            return JSONResponse({"error": "JSON inválido"}, status_code=400)
        validado = _validar(raw)
        if validado is None:
            return JSONResponse({"error": "cuerpo inválido"}, status_code=400)
        mensaje, historial = validado

        async def generar() -> AsyncIterator[bytes]:
            mensajes = construir_mensajes(historial, mensaje)
            emitio = False
            try:
                async for delta in motor.stream(mensajes):
                    emitio = True
                    yield _sse({"type": "text_delta", "text": delta})
            except MotorError as exc:
                log.error("motor falló: %s", exc)
                if not emitio:
                    yield _sse({"type": "text_delta", "text": DEGRADE_ES})
            yield _sse("[DONE]")

            # Captura de lead SOLO si el visitante escribió un email (gate barato).
            if EMAIL_RE.search(_texto_usuario(historial, mensaje)):
                tarea = asyncio.create_task(_capturar(_conversacion(historial, mensaje)))
                _bg.add(tarea)
                tarea.add_done_callback(_bg.discard)

        return StreamingResponse(
            generar(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    return Starlette(
        routes=[
            Route("/chat/stream", chat_stream, methods=["POST"]),
            Route("/health", health, methods=["GET"]),
        ]
    )


app = build_app()
