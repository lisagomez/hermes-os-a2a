"""correos.py — acceso a datos del buzon (PostgREST, cliente inyectable).

buzon-a2a LEE correos_entrantes/buzones/buzon_control y ESCRIBE
correos_salientes (solo estados borrador/rechazado_gates/pendiente_aprobacion)
y buzon_bitacora (append-only). JAMAS toca credenciales de correo ni envia:
la unica salida es enviar-salientes.py (A4, host).

Semantica de fallo tipo ventas-a2a/leads.py: el borrador ES el producto — con
Supabase configurado, un INSERT fallido lanza BuzonError (task failed visible,
reintentable); sin env (dev/tests) no persiste y lo DICE, nunca finge.
"""
from __future__ import annotations

import hashlib
import json
import os
import urllib.parse

import httpx

TIMEOUT_S = 10.0


class BuzonError(RuntimeError):
    """Supabase esta configurado pero la operacion NO quedo hecha."""


class BuzonStore:
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

    def _headers(self, extra: dict | None = None) -> dict:
        return {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
            "Content-Type": "application/json",
            **(extra or {}),
        }

    async def _req(self, metodo: str, ruta: str, cuerpo: dict | None = None,
                   prefer: str | None = None) -> httpx.Response:
        if not self.activo:
            # Sin env, la URL quedaria vacia y httpx moriria con
            # "UnsupportedProtocol", que no le dice nada a quien lee el fallo.
            # Un error tiene que nombrar su causa (visto en el 1er arranque real).
            raise BuzonError(
                "Supabase no configurado (faltan SUPABASE_URL / "
                "SUPABASE_SERVICE_ROLE_KEY): el buzon no puede leer ni escribir")
        headers = self._headers({"Prefer": prefer} if prefer else None)
        url = f"{self._url}/rest/v1/{ruta}"
        try:
            if self._http is not None:
                return await self._http.request(metodo, url, headers=headers,
                                                json=cuerpo)
            async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
                return await client.request(metodo, url, headers=headers, json=cuerpo)
        except httpx.HTTPError as exc:
            raise BuzonError(f"Supabase inalcanzable: {type(exc).__name__}") from exc

    async def _get_json(self, ruta: str) -> list:
        r = await self._req("GET", ruta)
        if r.status_code != 200:
            raise BuzonError(f"lectura {ruta.split('?')[0]} fallo (HTTP {r.status_code})")
        return r.json()

    # ------------------------------------------------------------------ lecturas
    async def entrante(self, correo_id: str) -> dict | None:
        filas = await self._get_json(f"correos_entrantes?id=eq.{correo_id}&select=*")
        return filas[0] if filas else None

    async def hilo(self, hilo_id: str) -> list[dict]:
        return await self._get_json(
            f"correos_entrantes?hilo_id=eq.{hilo_id}&select=*&order=ingerido_en.asc")

    async def buzon(self, buzon_id: str) -> dict | None:
        filas = await self._get_json(f"buzones?id=eq.{buzon_id}&select=*")
        return filas[0] if filas else None

    async def pausa_global(self) -> bool:
        filas = await self._get_json("buzon_control?id=eq.1&select=pausa_global")
        return bool(filas and filas[0].get("pausa_global"))

    async def enviados_ultima_hora(self, buzon_id: str) -> int:
        # El corte se calcula AQUI y viaja como ISO: PostgREST no evalua SQL en
        # el valor de un filtro, asi que "now()-interval'1hour'" daba HTTP 400
        # (lo destapo la 1a corrida real, no los tests con transporte mockeado).
        from datetime import datetime, timedelta, timezone
        corte = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        filas = await self._get_json(
            f"correos_salientes?buzon_id=eq.{buzon_id}&estado=eq.enviado"
            f"&enviado_en=gte.{urllib.parse.quote(corte)}&select=id")
        return len(filas)

    async def enviados_en_hilo(self, hilo_id: str) -> int:
        filas = await self._get_json(
            f"correos_salientes?hilo_id=eq.{hilo_id}&estado=eq.enviado&select=id")
        return len(filas)

    # ----------------------------------------------------------------- escrituras
    async def insertar_saliente(self, fila: dict) -> str | None:
        """Guarda el borrador. Devuelve el id (o None sin Supabase configurado)."""
        if not self.activo:
            return None
        r = await self._req("POST", "correos_salientes", cuerpo=fila,
                            prefer="return=representation")
        if r.status_code not in (200, 201):
            raise BuzonError(f"borrador NO guardado (HTTP {r.status_code})")
        filas = r.json()
        return filas[0]["id"] if filas else None

    async def bitacora(self, evento: str, detalle: dict, buzon_id: str | None = None,
                       hilo_id: str | None = None, correo_id: str | None = None) -> None:
        """Append-only con hash encadenado. Fallo IMPRESO, no fatal (la bitacora
        no debe tumbar la tarea, pero jamas falla en silencio)."""
        if not self.activo:
            return
        try:
            prev = await self._get_json("buzon_bitacora?select=hash_fila&order=id.desc&limit=1")
            hash_prev = prev[0]["hash_fila"] if prev else ""
            cuerpo = json.dumps(detalle, sort_keys=True, ensure_ascii=False)
            hash_fila = hashlib.sha256(
                f"{hash_prev}|buzon-a2a|{evento}|{cuerpo}".encode()).hexdigest()
            r = await self._req("POST", "buzon_bitacora", cuerpo={
                "actor": "buzon-a2a", "evento": evento, "detalle": detalle,
                "buzon_id": buzon_id, "hilo_id": hilo_id, "correo_id": correo_id,
                "hash_prev": hash_prev, "hash_fila": hash_fila,
            }, prefer="return=minimal")
            if r.status_code not in (200, 201, 204):
                print(f"[buzon-a2a] FALLO bitacora {evento}: HTTP {r.status_code}", flush=True)
        except BuzonError as exc:
            print(f"[buzon-a2a] FALLO bitacora {evento}: {exc}", flush=True)
