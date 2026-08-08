"""leads.py — EL escritor de la tabla `leads` para origen a2a (Fase 9).

Mismo patron PostgREST que ejecutor-a2a/estado.py (un escritor por fila,
cliente inyectable) pero con la semantica de fallo INVERTIDA a proposito:
`estado.py` es best-effort porque el flujo A2A no depende de la BD; aqui el
lead ES el producto — perderlo en silencio es peor que un task fallido, asi
que con Supabase configurado un INSERT fallido lanza LeadsError (task failed,
el tercero puede reintentar). Sin env (dev/tests) no persiste y lo DICE
(`persistido: false` en el artifact), nunca finge.
"""
from __future__ import annotations

import os

import httpx

TIMEOUT_S = 10.0


class LeadsError(RuntimeError):
    """Supabase esta configurado pero el lead NO quedo guardado."""


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

    async def insertar(self, fila: dict) -> bool:
        """Guarda el lead (UPSERT por lead_id). True = persistido; False = sin
        Supabase configurado.

        Idempotente (RUNBOOK P3): el mismo lead_id actualiza la fila existente
        en vez de fallar por unique — el conflicto es exito, no error.
        LeadsError si Supabase esta configurado y la escritura no quedo (fallo
        visible: el task A2A sale failed y el tercero puede reintentar).
        """
        if not self.activo:
            return False
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
            raise LeadsError(f"no se pudo guardar el lead: {type(exc).__name__}") from exc
        if r.status_code not in (200, 201, 204):
            raise LeadsError(f"no se pudo guardar el lead (HTTP {r.status_code})")
        return True
