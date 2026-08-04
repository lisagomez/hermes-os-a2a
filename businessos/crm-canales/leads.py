"""leads.py — puente CRM → pipeline de adquisición (tabla public.leads, origen 'crm').

Invariante un-escritor-por-origen (Fase 9): crm-canales es el ÚNICO escritor del
origen 'crm'. El lead nace del PRIMER mensaje entrante de un contacto y NO se
vuelve a tocar: el insert usa resolution=ignore-duplicates sobre un lead_id
determinista, así los mensajes siguientes jamás re-escriben la etapa que el
funnel ya movió (un merge-duplicates devolvería el lead a 'nuevo' en cada
mensaje: pisaría el trabajo humano del embudo).

Multi-tenant: el lead viaja con el tenant en el lead_id y en datos.tenant_id;
Mission Control lo distingue por origen='crm' y canal. Una vista por-tenant es
trabajo futuro (P2), no de este módulo.

Semántica de fallo (doctrina "todo best-effort imprime"): la atención al
cliente JAMÁS se cae por esto, pero todo fallo se loguea fuerte — un lead
perdido en silencio es lo peor que le puede pasar al funnel.
"""
from __future__ import annotations

import datetime
import logging
import os

import httpx

TIMEOUT_S = 10.0
log = logging.getLogger("crm.leads")


def lead_id_de_contacto(tenant_id: str, canal: str, canal_uid: str) -> str:
    """ID determinista por contacto del tenant → idempotente entre mensajes."""
    return f"crm-{tenant_id}-{canal}-{canal_uid}"


class LeadsCrm:
    def __init__(self, url: str | None = None, key: str | None = None, http_client: httpx.AsyncClient | None = None) -> None:
        self._url = (url or os.environ.get("SUPABASE_URL") or "").rstrip("/")
        self._key = key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
        self._http = http_client

    @property
    def activo(self) -> bool:
        return bool(self._url and self._key)

    async def capturar(
        self,
        tenant_id: str,
        canal: str,
        canal_uid: str,
        nombre: str | None,
        texto: str,
        referral: dict | None = None,
    ) -> bool:
        """Registra el contacto como lead si aún no existe. True SOLO si el lead
        se insertó AHORA (primer contacto) — dispara la calificación; False si ya
        existía, no hay Supabase o el insert falló (todo logueado).

        `referral` = bloque referral de Meta (clic-a-WhatsApp): se extrae LA
        CAPTURA de atribución (campana_id + utm), no el módulo de Marketing API.
        First-touch por construcción: ignore-duplicates jamás re-atribuye."""
        if not self.activo:
            log.warning("lead NO persistido: Supabase no configurado (tenant=%s canal=%s)", tenant_id, canal)
            return False
        # El wa_id de WhatsApp ES el teléfono (E.164 sin '+'); el chat_id de
        # Telegram NO es un teléfono y no debe contaminar la columna.
        telefono = "".join(c for c in canal_uid if c.isdigit()) if canal == "whatsapp" else ""
        fila = {
            "lead_id": lead_id_de_contacto(tenant_id, canal, canal_uid),
            "origen": "crm",
            "empresa": "",
            "contacto": " · ".join(p for p in (nombre, f"tel {telefono}" if telefono else "") if p),
            "mensaje": texto,
            "etapa": "nuevo",
            "canal": canal,
            "telefono": telefono,
            "datos": {"source": "crm-canales", "tenant_id": tenant_id, "canal_uid": canal_uid, "nombre": nombre},
        }
        if referral:
            fila["campana_id"] = str(referral.get("source_id") or "") or None
            fila["utm"] = referral
        headers = {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
            "Content-Type": "application/json",
            # ignore-duplicates: si el lead ya existe NO se toca (ver docstring).
            # return=representation: cuerpo [fila] si insertó, [] si ya existía —
            # es como distinguimos el PRIMER contacto (dispara la calificación).
            "Prefer": "resolution=ignore-duplicates,return=representation",
        }
        url = f"{self._url}/rest/v1/leads?on_conflict=lead_id&select=lead_id"
        try:
            if self._http is not None:
                r = await self._http.post(url, headers=headers, json=fila)
            else:
                async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
                    r = await client.post(url, headers=headers, json=fila)
        except httpx.HTTPError as exc:
            log.error("lead NO guardado (tenant=%s canal=%s): %s", tenant_id, canal, type(exc).__name__)
            return False
        if r.status_code not in (200, 201, 204):
            log.error("lead NO guardado (tenant=%s canal=%s): HTTP %s", tenant_id, canal, r.status_code)
            return False
        try:
            insertado = bool(r.json())
        except ValueError:
            insertado = False
        return insertado

    async def calificar(self, tenant_id: str, canal: str, canal_uid: str, resultado: dict) -> bool:
        """Escribe la señal del calificador en el lead. SOLO las columnas de
        calificación — jamás `etapa` (regla dura §4: el escritor de la etapa es
        el funnel; esto es una señal paralela). Best-effort ruidoso."""
        if not self.activo:
            log.warning("calificación NO persistida: Supabase no configurado (tenant=%s)", tenant_id)
            return False
        lead_id = lead_id_de_contacto(tenant_id, canal, canal_uid)
        parche = {
            "calificacion": resultado["decision"],
            "calificado_en": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "calificacion_senales": {
                "senales": resultado.get("senales") or [],
                "confianza": resultado.get("confianza", 0.0),
            },
        }
        headers = {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }
        url = f"{self._url}/rest/v1/leads?lead_id=eq.{lead_id}"
        try:
            if self._http is not None:
                r = await self._http.patch(url, headers=headers, json=parche)
            else:
                async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
                    r = await client.patch(url, headers=headers, json=parche)
        except httpx.HTTPError as exc:
            log.error("calificación NO guardada (lead=%s): %s", lead_id, type(exc).__name__)
            return False
        if r.status_code not in (200, 204):
            log.error("calificación NO guardada (lead=%s): HTTP %s", lead_id, r.status_code)
            return False
        return True
