"""store.py — persistencia del CRM vía PostgREST (service_role; RLS cerrado).

Un escritor por origen: este servicio es el ÚNICO que escribe crm_*. Todo fallo
de escritura se loguea (doctrina "todo best-effort imprime") y la conversación
sigue: perder un log de mensaje no debe tumbar la atención al cliente.
"""
from __future__ import annotations

import logging
import os

import httpx

TIMEOUT_S = 10.0
log = logging.getLogger("crm.store")


class Store:
    def __init__(self, url: str | None = None, key: str | None = None, http_client: httpx.AsyncClient | None = None) -> None:
        self._url = (url or os.environ.get("SUPABASE_URL") or "").rstrip("/")
        self._key = key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
        self._http = http_client

    @property
    def activo(self) -> bool:
        return bool(self._url and self._key)

    def _headers(self, prefer: str | None = None) -> dict:
        h = {"apikey": self._key, "Authorization": f"Bearer {self._key}", "Content-Type": "application/json"}
        if prefer:
            h["Prefer"] = prefer
        return h

    async def _req(self, metodo: str, path: str, *, json_body=None, prefer: str | None = None) -> httpx.Response | None:
        url = f"{self._url}/rest/v1/{path}"
        try:
            if self._http is not None:
                return await self._http.request(metodo, url, headers=self._headers(prefer), json=json_body)
            async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
                return await client.request(metodo, url, headers=self._headers(prefer), json=json_body)
        except httpx.HTTPError as exc:
            log.error("PostgREST %s %s falló: %s", metodo, path, type(exc).__name__)
            return None

    async def tenant(self, tenant_id: str) -> dict | None:
        r = await self._req("GET", f"crm_tenants?tenant_id=eq.{tenant_id}&activo=is.true&limit=1")
        if r is None or r.status_code != 200 or not r.json():
            return None
        return r.json()[0]

    async def contacto(self, tenant_id: str, canal: str, canal_uid: str, nombre: str | None) -> dict | None:
        fila = {"tenant_id": tenant_id, "canal": canal, "canal_uid": canal_uid, "nombre": nombre}
        r = await self._req(
            "POST",
            "crm_contactos?on_conflict=tenant_id,canal,canal_uid",
            json_body=fila,
            prefer="resolution=merge-duplicates,return=representation",
        )
        if r is None or r.status_code not in (200, 201):
            log.error("contacto NO persistido (tenant=%s canal=%s): HTTP %s", tenant_id, canal, r.status_code if r else "—")
            return None
        return r.json()[0]

    async def conversacion(self, tenant_id: str, contacto_id: int) -> dict | None:
        r = await self._req(
            "GET",
            f"crm_conversaciones?tenant_id=eq.{tenant_id}&contacto_id=eq.{contacto_id}&estado=eq.abierta&order=created_at.desc&limit=1",
        )
        if r is not None and r.status_code == 200 and r.json():
            return r.json()[0]
        r = await self._req(
            "POST",
            "crm_conversaciones",
            json_body={"tenant_id": tenant_id, "contacto_id": contacto_id},
            prefer="return=representation",
        )
        if r is None or r.status_code not in (200, 201):
            log.error("conversación NO creada (tenant=%s contacto=%s)", tenant_id, contacto_id)
            return None
        return r.json()[0]

    async def escalar(self, conversacion_id: int) -> None:
        r = await self._req("PATCH", f"crm_conversaciones?id=eq.{conversacion_id}", json_body={"estado": "escalada"})
        if r is None or r.status_code not in (200, 204):
            log.error("escalado NO persistido (conv=%s)", conversacion_id)

    async def mensaje(self, tenant_id: str, conversacion_id: int, direccion: str, canal: str, texto: str, emisor: str, enviado: bool | None = None) -> None:
        fila = {
            "tenant_id": tenant_id,
            "conversacion_id": conversacion_id,
            "direccion": direccion,
            "canal": canal,
            "texto": texto,
            "emisor": emisor,
            "enviado": enviado,
        }
        r = await self._req("POST", "crm_mensajes", json_body=fila)
        if r is None or r.status_code not in (200, 201):
            log.error("mensaje NO persistido (conv=%s dir=%s)", conversacion_id, direccion)

    async def historial(self, conversacion_id: int, limite: int = 12) -> list[dict]:
        """Últimos mensajes en formato chat [{'role','content'}] (viejo → nuevo)."""
        r = await self._req(
            "GET",
            f"crm_mensajes?conversacion_id=eq.{conversacion_id}&order=created_at.desc&limit={limite}",
        )
        if r is None or r.status_code != 200:
            return []
        filas = list(reversed(r.json()))
        return [
            {"role": "user" if f["direccion"] == "entrante" else "assistant", "content": f["texto"]}
            for f in filas
        ]
