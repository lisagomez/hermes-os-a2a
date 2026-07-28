"""app.py — conector de canales del CRM marca blanca (CRM-0).

Webhooks entrantes de Telegram y WhatsApp Cloud API, multi-tenant por path:
  POST /webhook/telegram/{tenant}   (protegido por X-Telegram-Bot-Api-Secret-Token)
  GET  /webhook/whatsapp/{tenant}   (verificación de Meta: hub.challenge)
  POST /webhook/whatsapp/{tenant}   (firma X-Hub-Signature-256 obligatoria,
                                     fail-closed: sin app secret configurado → 503)
  GET  /health

Flujo por mensaje: tenant activo + canal habilitado → contacto (upsert) →
conversación abierta → guardar entrante → techo estructural (escalado a humano
ANTES del modelo) o respuesta LLM con la marca/tono del tenant → enviar por el
canal → guardar saliente con enviado=true/false. La bitácora es completa aunque
el canal no tenga token todavía (enviado=false, visible, jamás silencioso).
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, PlainTextResponse, Response
from starlette.routing import Route

from canales import Canales, _token
from leads import LeadsCrm
from motor import MotorError, MotorOpenRouter
from prompt import requiere_humano, system_prompt
from store import Store
from sup import SupervisorClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
log = logging.getLogger("crm")

MAX_TEXTO = 4000
RESPUESTA_ESCALADO = (
    "Entendido: una persona del equipo de {marca} te atenderá directamente. "
    "Ya tienen tu mensaje y el contexto de esta conversación."
)
RESPUESTA_DEGRADADA = (
    "En este momento no puedo responderte; una persona del equipo de {marca} "
    "dará seguimiento a tu mensaje."
)
RESPUESTA_SUPERVISADA = (
    "Prefiero que una persona del equipo de {marca} te confirme esto para no "
    "darte información imprecisa. Ya tienen tu mensaje y el contexto."
)


def build_app(
    motor: MotorOpenRouter | None = None,
    store: Store | None = None,
    canales: Canales | None = None,
    sup: SupervisorClient | None = None,
    leads: LeadsCrm | None = None,
    tg_secret: str | None = None,
    wa_verify: str | None = None,
    wa_app_secret: str | None = None,
) -> Starlette:
    """Dependencias inyectables para tests (env por defecto)."""
    motor = motor or MotorOpenRouter()
    store = store or Store()
    canales = canales or Canales()
    sup = sup or SupervisorClient()
    leads = leads or LeadsCrm()
    tg_secret = tg_secret if tg_secret is not None else os.environ.get("CRM_TELEGRAM_WEBHOOK_SECRET", "")
    wa_verify = wa_verify if wa_verify is not None else os.environ.get("CRM_WHATSAPP_VERIFY_TOKEN", "")
    wa_app_secret = wa_app_secret if wa_app_secret is not None else os.environ.get("CRM_WHATSAPP_APP_SECRET", "")

    async def health(_: Request) -> JSONResponse:
        return JSONResponse({"status": "ok", "servicio": "crm-canales"})

    async def atender(tenant_id: str, canal: str, canal_uid: str, nombre: str | None, texto: str) -> None:
        """El corazón del CRM: un mensaje entrante → una atención trazada."""
        tenant = await store.tenant(tenant_id)
        if tenant is None:
            log.warning("mensaje para tenant inexistente/inactivo: %s", tenant_id)
            return
        cfg_canal = (tenant.get("canales") or {}).get(canal) or {}
        if not cfg_canal.get("habilitado"):
            log.warning("canal %s deshabilitado para tenant=%s", canal, tenant_id)
            return
        contacto = await store.contacto(tenant_id, canal, canal_uid, nombre)
        if contacto is None:
            return
        conv = await store.conversacion(tenant_id, contacto["id"])
        if conv is None:
            return
        texto = texto.strip()[:MAX_TEXTO]
        await store.mensaje(tenant_id, conv["id"], "entrante", canal, texto, "cliente")
        # Puente al pipeline de adquisición: primer mensaje → lead (origen 'crm').
        # Idempotente (ignore-duplicates): los mensajes siguientes no lo tocan.
        await leads.capturar(tenant_id, canal, canal_uid, nombre, texto)

        if requiere_humano(texto):
            await store.escalar(conv["id"])
            respuesta = RESPUESTA_ESCALADO.format(marca=tenant["marca"])
        else:
            historial = await store.historial(conv["id"])
            try:
                respuesta = await motor.responder(system_prompt(tenant, canal), historial, texto)
                # Plan D-40: sup-crm valida el saliente según el nivel del tenant
                # (A1 = juez siempre; A2 = gates siempre + juez muestreado, y el
                # 100% de lo sensible). Fail-closed: rechazo o sup caído →
                # traspaso a humano, nunca sale respuesta de modelo sin veredicto.
                charla = "\n".join(f"{m['role']}: {m['content']}" for m in historial) + f"\nuser: {texto}"
                veredicto = await sup.validar(
                    tenant_id, tenant["marca"], charla, respuesta, conv["id"],
                    nivel=tenant.get("nivel") or "A1",
                )
                if veredicto is None or not veredicto.get("aprobado"):
                    motivo = "sup no disponible" if veredicto is None else veredicto.get("motivo", "")
                    log.warning("saliente NO aprobado (tenant=%s conv=%s): %s", tenant_id, conv["id"], motivo)
                    await store.escalar(conv["id"])
                    respuesta = RESPUESTA_SUPERVISADA.format(marca=tenant["marca"])
            except MotorError as exc:
                log.error("motor falló (tenant=%s): %s", tenant_id, exc)
                respuesta = RESPUESTA_DEGRADADA.format(marca=tenant["marca"])

        if canal == "telegram":
            enviado = await canales.telegram(tenant_id, canal_uid, respuesta)
        else:
            enviado = await canales.whatsapp(tenant_id, cfg_canal.get("phone_id", ""), canal_uid, respuesta)
        await store.mensaje(tenant_id, conv["id"], "saliente", canal, respuesta, "agente", enviado)

    async def webhook_telegram(request: Request) -> Response:
        # Telegram manda el secreto configurado en setWebhook; sin match, 403.
        if not tg_secret or not hmac.compare_digest(
            request.headers.get("x-telegram-bot-api-secret-token", ""), tg_secret
        ):
            return JSONResponse({"error": "no autorizado"}, status_code=403)
        tenant_id = request.path_params["tenant"]
        try:
            update = await request.json()
        except (json.JSONDecodeError, ValueError):
            return JSONResponse({"error": "JSON inválido"}, status_code=400)
        msg = update.get("message") or {}
        texto = msg.get("text")
        chat = msg.get("chat") or {}
        if texto and chat.get("id") is not None:
            desde = msg.get("from") or {}
            nombre = " ".join(p for p in (desde.get("first_name"), desde.get("last_name")) if p) or None
            await atender(tenant_id, "telegram", str(chat["id"]), nombre, texto)
        # Siempre 200: Telegram reintenta los no-200 y duplicaría mensajes.
        return JSONResponse({"ok": True})

    async def webhook_whatsapp_verify(request: Request) -> Response:
        # Handshake de Meta al registrar el webhook (GET hub.*).
        q = request.query_params
        if q.get("hub.mode") == "subscribe" and wa_verify and hmac.compare_digest(q.get("hub.verify_token", ""), wa_verify):
            return PlainTextResponse(q.get("hub.challenge", ""))
        return JSONResponse({"error": "no autorizado"}, status_code=403)

    async def webhook_whatsapp(request: Request) -> Response:
        tenant_id = request.path_params["tenant"]
        # Firma HMAC de Meta sobre el cuerpo CRUDO (misma práctica que el
        # gateway de la guía Hermes): app secret por tenant con fallback
        # global. Fail-closed: sin secret NO se aceptan entrantes (503) —
        # un webhook público sin firma es texto adversarial sin remitente.
        secreto = _token("CRM_WHATSAPP_APP_SECRET", tenant_id) or wa_app_secret
        if not secreto:
            log.warning("whatsapp SIN app secret (tenant=%s): entrante rechazado 503", tenant_id)
            return JSONResponse({"error": "app secret no configurado"}, status_code=503)
        cuerpo = await request.body()
        esperada = "sha256=" + hmac.new(secreto.encode(), cuerpo, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(request.headers.get("x-hub-signature-256", ""), esperada):
            log.warning("whatsapp firma inválida/ausente (tenant=%s): 403", tenant_id)
            return JSONResponse({"error": "firma inválida"}, status_code=403)
        try:
            payload = json.loads(cuerpo)
        except (json.JSONDecodeError, ValueError):
            return JSONResponse({"error": "JSON inválido"}, status_code=400)
        # Estructura Cloud API: entry[].changes[].value.messages[] (+ contacts[]).
        for entry in payload.get("entry") or []:
            for change in entry.get("changes") or []:
                valor = change.get("value") or {}
                nombres = {
                    c.get("wa_id"): (c.get("profile") or {}).get("name")
                    for c in valor.get("contacts") or []
                }
                for m in valor.get("messages") or []:
                    if m.get("type") == "text" and m.get("from"):
                        texto = (m.get("text") or {}).get("body", "")
                        if texto:
                            await atender(tenant_id, "whatsapp", m["from"], nombres.get(m["from"]), texto)
        return JSONResponse({"ok": True})

    return Starlette(
        routes=[
            Route("/health", health, methods=["GET"]),
            Route("/webhook/telegram/{tenant}", webhook_telegram, methods=["POST"]),
            Route("/webhook/whatsapp/{tenant}", webhook_whatsapp_verify, methods=["GET"]),
            Route("/webhook/whatsapp/{tenant}", webhook_whatsapp, methods=["POST"]),
        ]
    )


app = build_app()
