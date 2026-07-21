"""canales.py — envío saliente por Telegram y WhatsApp (Cloud API de Meta).

Tokens SIEMPRE por env, jamás en la BD ni en logs:
  CRM_TELEGRAM_TOKEN__<TENANT>  (bot de Telegram del tenant; '-' del slug → '_')
  CRM_WHATSAPP_TOKEN__<TENANT>  (token Cloud API del tenant)
Sin token el envío devuelve False y LO DICE en el log (best-effort que imprime):
el mensaje queda en crm_mensajes con enviado=false — trazable, nunca invisible.
"""
from __future__ import annotations

import logging
import os

import httpx

TIMEOUT_S = 15.0
log = logging.getLogger("crm.canales")


def _token(prefijo: str, tenant_id: str) -> str:
    return os.environ.get(f"{prefijo}__{tenant_id.upper().replace('-', '_')}", "")


class Canales:
    def __init__(self, http_client: httpx.AsyncClient | None = None) -> None:
        self._http = http_client

    async def _post(self, url: str, json_body: dict, headers: dict | None = None) -> httpx.Response | None:
        try:
            if self._http is not None:
                return await self._http.post(url, json=json_body, headers=headers)
            async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
                return await client.post(url, json=json_body, headers=headers)
        except httpx.HTTPError as exc:
            log.error("envío falló: %s", type(exc).__name__)
            return None

    async def telegram(self, tenant_id: str, chat_id: str, texto: str) -> bool:
        token = _token("CRM_TELEGRAM_TOKEN", tenant_id)
        if not token:
            log.warning("telegram SIN token para tenant=%s: mensaje no enviado (queda en bitácora)", tenant_id)
            return False
        r = await self._post(f"https://api.telegram.org/bot{token}/sendMessage", {"chat_id": chat_id, "text": texto})
        ok = r is not None and r.status_code == 200
        if not ok:
            log.error("telegram sendMessage falló (tenant=%s): HTTP %s", tenant_id, r.status_code if r else "—")
        return ok

    async def whatsapp(self, tenant_id: str, phone_id: str, wa_id: str, texto: str) -> bool:
        token = _token("CRM_WHATSAPP_TOKEN", tenant_id)
        if not token:
            log.warning("whatsapp SIN token para tenant=%s: mensaje no enviado (queda en bitácora)", tenant_id)
            return False
        r = await self._post(
            f"https://graph.facebook.com/v21.0/{phone_id}/messages",
            {"messaging_product": "whatsapp", "to": wa_id, "type": "text", "text": {"body": texto}},
            headers={"Authorization": f"Bearer {token}"},
        )
        ok = r is not None and r.status_code == 200
        if not ok:
            log.error("whatsapp send falló (tenant=%s): HTTP %s", tenant_id, r.status_code if r else "—")
        return ok
