"""leads.py — escritor de la tabla `leads` para leads capturados en el CHAT (origen web2).

Mismo patrón PostgREST que ventas-a2a/leads.py, con dos diferencias:
  - origen 'web2' (invariante un-escritor-por-origen: el chat es superficie web2,
    igual que la route /api/leads del frontend; NO reusa 'a2a' ni 'manual').
  - UPSERT idempotente por `lead_id` determinista (sha1 del email o, si el
    visitante solo dejó teléfono, de sus dígitos): el daemon es stateless y ve
    toda la conversación en cada turno; si el mismo contacto vuelve a aparecer,
    el upsert actualiza la misma fila en vez de crear duplicados.

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


def lead_id_de_telefono(telefono: str) -> str:
    """ID determinista por teléfono (solo dígitos: mismo número con o sin
    espacios/guiones/paréntesis → mismo id)."""
    digitos = "".join(c for c in telefono if c.isdigit())
    h = hashlib.sha1(digitos.encode()).hexdigest()[:16]
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

        `lead` = {nombre, email, telefono, empresa, interes, horario}; email o
        teléfono obligatorio (al menos uno). No lanza: loguea el fallo y
        devuelve False (el chat no debe romperse por esto).
        """
        email = lead.get("email")
        telefono = lead.get("telefono")
        if not email and not telefono:
            log.warning("lead NO persistido: sin email ni teléfono")
            return False
        if not self.activo:
            log.warning("lead NO persistido: Supabase no configurado (contacto=%s)", _mask(email) if email else _mask_tel(telefono))
            return False
        nombre = lead.get("nombre")
        fila = {
            "lead_id": lead_id_de_email(email) if email else lead_id_de_telefono(telefono),
            "origen": "web2",
            "empresa": lead.get("empresa") or "",
            "contacto": _contacto(nombre, email, telefono),
            "mensaje": lead.get("interes") or "",
            "etapa": "nuevo",
            "datos": {
                "source": "web2-chat",
                "nombre": nombre,
                "email": email,
                "telefono": telefono,
                "empresa": lead.get("empresa"),
                "interes": lead.get("interes"),
                "horario": lead.get("horario"),
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
            log.error("lead NO guardado (contacto=%s): %s", _mask_lead(email, telefono), type(exc).__name__)
            return False
        if r.status_code not in (200, 201, 204):
            log.error("lead NO guardado (contacto=%s): HTTP %s", _mask_lead(email, telefono), r.status_code)
            return False
        log.info("lead capturado en chat (contacto=%s)", _mask_lead(email, telefono))
        return True


def _contacto(nombre: str | None, email: str | None, telefono: str | None) -> str:
    """Campo `contacto` legible: "Ana <ana@x.com> · tel +52..." según lo que haya."""
    partes = []
    if email:
        partes.append(f"{nombre} <{email}>" if nombre else email)
    elif nombre:
        partes.append(nombre)
    if telefono:
        partes.append(f"tel {telefono}")
    return " · ".join(partes)


def _mask(email: str | None) -> str:
    """Enmascara el email en logs (no filtramos PII completa a los logs)."""
    if not email or "@" not in email:
        return "?"
    usuario, dominio = email.split("@", 1)
    return f"{usuario[:2]}***@{dominio}"


def _mask_tel(telefono: str | None) -> str:
    """Enmascara el teléfono en logs: solo los últimos 3 dígitos visibles."""
    if not telefono:
        return "?"
    digitos = "".join(c for c in telefono if c.isdigit())
    return f"***{digitos[-3:]}" if len(digitos) >= 3 else "?"


def _mask_lead(email: str | None, telefono: str | None) -> str:
    return _mask(email) if email else _mask_tel(telefono)
