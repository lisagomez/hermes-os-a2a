"""transcripciones.py — EL escritor de la tabla `transcripciones` (EG.CRM Hito 3).

Mismo patron y semantica que ventas-a2a/leads.py: la transcripcion ES el
producto — perderla en silencio es peor que un task fallido. Con Supabase
configurado, un INSERT fallido lanza TranscripcionesError (task failed,
reintentable). Sin env (dev/tests) no persiste y lo DICE (`persistido: false`
en el artifact), nunca finge.
"""
from __future__ import annotations

import os

import httpx

TIMEOUT_S = 15.0


class TranscripcionesError(RuntimeError):
    """Supabase esta configurado pero la transcripcion NO quedo guardada."""


class TranscripcionesStore:
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

    async def insertar(self, fila: dict) -> bool:
        """Guarda la transcripcion. True = persistida; False = sin Supabase.

        TranscripcionesError si Supabase esta configurado y el INSERT no quedo.
        """
        if not self.activo:
            return False
        headers = {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }
        url = f"{self._url}/rest/v1/transcripciones"
        try:
            if self._http is not None:
                r = await self._http.post(url, headers=headers, json=fila)
            else:
                async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
                    r = await client.post(url, headers=headers, json=fila)
        except httpx.HTTPError as exc:
            raise TranscripcionesError(
                f"no se pudo guardar la transcripcion: {type(exc).__name__}"
            ) from exc
        if r.status_code not in (200, 201):
            raise TranscripcionesError(
                f"no se pudo guardar la transcripcion (HTTP {r.status_code})"
            )
        return True
