"""leads.py — escritor de la tabla `leads` para leads capturados en el CHAT (origen web2).

Mismo patrón PostgREST que ventas-a2a/leads.py, con dos diferencias:
  - origen 'web2' (invariante un-escritor-por-origen: el chat es superficie web2,
    igual que la route /api/leads del frontend; NO reusa 'a2a' ni 'manual').
  - UPSERT idempotente por `lead_id` determinista (sha1 del email): el daemon es
    stateless y ve toda la conversación en cada turno; si el mismo email vuelve a
    aparecer, el upsert actualiza la misma fila en vez de crear duplicados.

Semántica de fallo: el chat ya respondió (el texto salió por SSE), así que un
fallo al guardar NO tumba la conversación — pero SÍ se loguea fuerte (doctrina
"todo best-effort imprime"; un lead perdido en silencio es lo peor).
"""
from __future__ import annotations

import hashlib
import logging
import os

import httpx

TIMEOUT_S = 10.0
log = logging.getLogger("chat-web2.leads")


def lead_id_de_email(email: str) -> str:
    """ID determinista por email → upsert idempotente. Namespace propio del chat."""
    h = hashlib.sha1(email.strip().lower().encode()).hexdigest()[:16]
    return f"web2chat-{h}"


class LeadsStore:
    def __init__(
        self,
        url: str | None = None,
        key: str | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._url = (url or os.environ.get("SUPABASE_URL") or "").rstrip("/")
        self._key = key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
        self._http = http_client

    @property
    def activo(self) -> bool:
        return bool(self._url and self._key)

    async def upsert(self, lead: dict) -> bool:
        """Guarda/actualiza el lead. True si persistió; False si no hay Supabase.

        `lead` = {nombre, email, empresa, interes} (email obligatorio). No lanza:
        loguea el fallo y devuelve False (el chat no debe romperse por esto).
        """
        if not self.activo:
            log.warning("lead NO persistido: Supabase no configurado (email=%s)", _mask(lead.get("email")))
            return False
        email = lead["email"]
        nombre = lead.get("nombre")
        fila = {
            "lead_id": lead_id_de_email(email),
            "origen": "web2",
            "empresa": lead.get("empresa") or "",
            "contacto": f"{nombre} <{email}>" if nombre else email,
            "mensaje": lead.get("interes") or "",
            "etapa": "nuevo",
            "datos": {
                "source": "web2-chat",
                "nombre": nombre,
                "email": email,
                "empresa": lead.get("empresa"),
                "interes": lead.get("interes"),
            },
        }
        headers = {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
            "Content-Type": "application/json",
            # Upsert: si el lead_id ya existe, fusiona en vez de fallar por unique.
            "Prefer": "resolution=merge-duplicates,return=minimal",
        }
        url = f"{self._url}/rest/v1/leads?on_conflict=lead_id"
        try:
            if self._http is not None:
                r = await self._http.post(url, headers=headers, json=fila)
            else:
                async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
                    r = await client.post(url, headers=headers, json=fila)
        except httpx.HTTPError as exc:
            log.error("lead NO guardado (email=%s): %s", _mask(email), type(exc).__name__)
            return False
        if r.status_code not in (200, 201, 204):
            log.error("lead NO guardado (email=%s): HTTP %s", _mask(email), r.status_code)
            return False
        log.info("lead capturado en chat (email=%s)", _mask(email))
        return True


def _mask(email: str | None) -> str:
    """Enmascara el email en logs (no filtramos PII completa a los logs)."""
    if not email or "@" not in email:
        return "?"
    usuario, dominio = email.split("@", 1)
    return f"{usuario[:2]}***@{dominio}"
