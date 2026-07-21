"""sup.py — cliente del supervisor sup-crm (CRM-1, nivel A1 del plan D-40).

Cada respuesta GENERADA por el modelo pasa por sup-crm ANTES de enviarse.
Fail-closed: si el supervisor no responde o rechaza, el saliente NO sale tal
cual — crm-canales lo sustituye por el traspaso a humano (proteger primero).
Las plantillas fijas de la casa (escalado/degradación) no pasan por sup: no
las generó un modelo.
"""
from __future__ import annotations

import logging
import os

import httpx

TIMEOUT_S = 25.0
log = logging.getLogger("crm.sup")


class SupervisorClient:
    def __init__(self, url: str | None = None, http_client: httpx.AsyncClient | None = None) -> None:
        self._url = (url if url is not None else os.environ.get("CRM_SUP_URL", "http://sup-crm:4700")).rstrip("/")
        self._http = http_client

    async def validar(
        self, tenant_id: str, marca: str, conversacion: str, respuesta: str, conversacion_id: int | None = None
    ) -> dict | None:
        """Veredicto {aprobado, gates, motivo} o None si sup no está disponible."""
        body = {
            "tenant_id": tenant_id,
            "marca": marca,
            "conversacion": conversacion,
            "respuesta": respuesta,
            "conversacion_id": conversacion_id,
        }
        try:
            if self._http is not None:
                r = await self._http.post(f"{self._url}/validar", json=body)
            else:
                async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
                    r = await client.post(f"{self._url}/validar", json=body)
        except httpx.HTTPError as exc:
            log.error("sup-crm no disponible: %s (fail-closed)", type(exc).__name__)
            return None
        if r.status_code != 200:
            log.error("sup-crm HTTP %s (fail-closed)", r.status_code)
            return None
        return r.json()
