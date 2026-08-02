"""almacen.py — EL escritor de las tablas de enriquecimiento (App A).

Mismo patron PostgREST que ventas-a2a/leads.py (cliente inyectable) con la
misma semantica de fallo: con Supabase configurado, un intento que no quedo
en el ledger = AlmacenError = task failed VISIBLE (el ledger es la fuente de
verdad del costeo; perder una fila en silencio es mentir el rendimiento de la
cascada). Sin env (dev/tests) no persiste y lo DICE (persistido: false).

Frontera dura: este modulo LEE public.leads pero JAMAS la escribe — no expone
ningun metodo de escritura sobre leads (invariante un-escritor-por-origen;
test_almacen.py lo vigila).

El refuerzo de dominio_patron va por RPC dominio_patron_reforzar (UPSERT
atomico en UNA sentencia SQL): jamas GET+PATCH, que pierde incrementos bajo
concurrencia. Su fallo no tumba la tarea (es un activo, no el producto) pero
SIEMPRE se imprime (regla 2026-07-13: ningun best-effort silencioso).
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone

import httpx

TIMEOUT_S = 10.0


class AlmacenError(RuntimeError):
    """Supabase esta configurado pero la escritura NO quedo (fallo visible)."""


class Almacen:
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

    def _headers(self, prefer: str | None = None) -> dict:
        h = {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
            "Content-Type": "application/json",
        }
        if prefer:
            h["Prefer"] = prefer
        return h

    async def _request(self, metodo: str, ruta: str, *, json=None, prefer=None) -> httpx.Response:
        url = f"{self._url}/rest/v1/{ruta}"
        try:
            if self._http is not None:
                return await self._http.request(metodo, url, headers=self._headers(prefer), json=json)
            async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
                return await client.request(metodo, url, headers=self._headers(prefer), json=json)
        except httpx.HTTPError as exc:
            raise AlmacenError(f"Supabase inalcanzable en {ruta}: {type(exc).__name__}") from exc

    # ---- lecturas -----------------------------------------------------------

    async def leer_lead(self, lead_id: str) -> dict | None:
        r = await self._request("GET", f"leads?lead_id=eq.{lead_id}&select=lead_id,empresa,contacto,telefono,datos")
        if r.status_code != 200:
            raise AlmacenError(f"no se pudo leer el lead (HTTP {r.status_code})")
        filas = r.json()
        return filas[0] if filas else None

    async def leer_consolidado(self, lead_id: str) -> dict:
        """{campo: fila} de lead_enriquecimiento para saltar lookups ya resueltos."""
        r = await self._request("GET", f"lead_enriquecimiento?lead_id=eq.{lead_id}")
        if r.status_code != 200:
            raise AlmacenError(f"no se pudo leer el consolidado (HTTP {r.status_code})")
        return {fila["campo"]: fila for fila in r.json()}

    async def leer_69b(self, rfc: str) -> dict | None:
        r = await self._request("GET", f"contraparte_69b?rfc=eq.{rfc}")
        if r.status_code != 200:
            raise AlmacenError(f"no se pudo leer contraparte_69b (HTTP {r.status_code})")
        filas = r.json()
        return filas[0] if filas else None

    async def override_activo(self, rfc: str) -> dict | None:
        """Override vivo: not invalidado y vence_en en el futuro (evaluado aqui)."""
        ahora = datetime.now(timezone.utc).isoformat()
        r = await self._request(
            "GET", f"override_69b?rfc=eq.{rfc}&invalidado=eq.false&vence_en=gt.{ahora}"
        )
        if r.status_code != 200:
            raise AlmacenError(f"no se pudo leer override_69b (HTTP {r.status_code})")
        filas = r.json()
        return filas[0] if filas else None

    async def leer_patron(self, dominio: str) -> dict | None:
        r = await self._request("GET", f"dominio_patron?dominio=eq.{dominio.lower()}")
        if r.status_code != 200:
            raise AlmacenError(f"no se pudo leer dominio_patron (HTTP {r.status_code})")
        filas = r.json()
        return filas[0] if filas else None

    # ---- escrituras (nunca sobre leads) ------------------------------------

    async def registrar_intento(self, fila: dict) -> int | None:
        """Append al ledger. Devuelve el id (procedencia) o None sin Supabase."""
        if not self.activo:
            return None
        r = await self._request("POST", "enriquecimiento_intento",
                                json=fila, prefer="return=representation")
        if r.status_code not in (200, 201):
            raise AlmacenError(f"el intento NO quedo en el ledger (HTTP {r.status_code})")
        return r.json()[0]["id"]

    async def consolidar(self, lead_id: str, campo: str, valor: str,
                         veredicto: str, fuente: str, intento_id: int | None) -> None:
        """Upsert del mejor valor conocido, con procedencia al ledger."""
        if not self.activo or intento_id is None:
            return
        fila = {"lead_id": lead_id, "campo": campo, "valor": valor,
                "veredicto": veredicto, "fuente": fuente, "intento_id": intento_id,
                "actualizado_en": datetime.now(timezone.utc).isoformat()}
        r = await self._request(
            "POST", "lead_enriquecimiento?on_conflict=lead_id,campo",
            json=fila, prefer="resolution=merge-duplicates,return=minimal",
        )
        if r.status_code not in (200, 201, 204):
            raise AlmacenError(f"el consolidado NO quedo (HTTP {r.status_code})")

    async def reforzar_patron(self, dominio: str, patron: str) -> None:
        """RPC atomica (soporte = soporte + 1). Fallo NO fatal pero JAMAS mudo."""
        if not self.activo:
            return
        try:
            r = await self._request("POST", "rpc/dominio_patron_reforzar",
                                    json={"p_dominio": dominio.lower(), "p_patron": patron})
            if r.status_code not in (200, 204):
                print(f"[enriquecimiento-a2a] refuerzo de patron {dominio} fallo "
                      f"(HTTP {r.status_code}) — se continua sin reforzar", file=sys.stderr)
        except AlmacenError as exc:
            print(f"[enriquecimiento-a2a] refuerzo de patron {dominio} fallo ({exc}) "
                  f"— se continua sin reforzar", file=sys.stderr)
