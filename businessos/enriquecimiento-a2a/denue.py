"""denue.py — escalon DENUE (INEGI): fuente publica oficial, costo 0 (App A).

Gateado por el grafo bajo el concepto "consulta a fuente publica oficial"
(LFPDPPP 2025 Art. 9-II: fuente de acceso publico). API publica del INEGI
(token gratuito via DENUE_TOKEN); busca el establecimiento por razon social
y aporta telefono, correo y razon social oficial.

Determinismo del match: solo un match EXACTO tras normalizar (mayusculas,
sin acentos, sin sufijos societarios SA DE CV / S DE RL / etc.) cuenta como
hit — un parecido no es un dato. Sin match exacto = miss con el numero de
candidatos en detalle (el humano decide, el servicio no adivina).

Sin token o con la API caida -> DenueError: el caller registra el intento
como resultado='error' VISIBLE en el ledger y la cascada sigue (DENUE es una
fuente de datos, no un gate de compliance: degradar si, ocultar no).
"""
from __future__ import annotations

import os
import re
import unicodedata
from urllib.parse import quote

import httpx

TIMEOUT_S = 15.0
DEFAULT_BASE = "https://www.inegi.org.mx/app/api/denue/v1/consulta"

# sufijos societarios que no aportan identidad para el match
_SUFIJOS = re.compile(
    r"\b(S\.?A\.?P\.?I\.?|S\.?A\.?B?\.?|DE|C\.?V\.?|S\.?|R\.?L\.?|S\.?C\.?|A\.?C\.?)\b\.?"
)


class DenueError(RuntimeError):
    """DENUE no consultable (sin token / API caida): intento 'error' visible."""


def normalizar_nombre(nombre: str) -> str:
    """Mayusculas, sin acentos, sin sufijos societarios ni puntuacion."""
    sin_acentos = unicodedata.normalize("NFKD", nombre or "")
    sin_acentos = "".join(c for c in sin_acentos if not unicodedata.combining(c))
    limpio = _SUFIJOS.sub(" ", sin_acentos.upper())
    limpio = re.sub(r"[^A-ZÑ&0-9 ]", " ", limpio)
    return re.sub(r"\s+", " ", limpio).strip()


class Denue:
    """Cliente minimo de BuscarEntidad (00 = nacional); inyectable para tests."""

    def __init__(self, token: str | None = None, base: str | None = None,
                 http_client: httpx.AsyncClient | None = None) -> None:
        self._token = token if token is not None else os.environ.get("DENUE_TOKEN", "")
        self._base = (base or os.environ.get("DENUE_BASE") or DEFAULT_BASE).rstrip("/")
        self._http = http_client

    async def buscar(self, razon_social: str) -> dict:
        """-> {encontrado, telefono, correo, razon_social, detalle} | DenueError."""
        if not self._token:
            raise DenueError("DENUE_TOKEN no configurado")
        objetivo = normalizar_nombre(razon_social)
        if not objetivo:
            return {"encontrado": False, "telefono": "", "correo": "",
                    "razon_social": "", "detalle": {"razon": "nombre vacio tras normalizar"}}
        url = f"{self._base}/BuscarEntidad/{quote(razon_social, safe='')}/00/1/10/{self._token}"
        try:
            if self._http is not None:
                r = await self._http.get(url)
            else:
                async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
                    r = await client.get(url)
        except httpx.HTTPError as exc:
            raise DenueError(f"DENUE inalcanzable: {type(exc).__name__}") from exc
        if r.status_code == 404:
            # la API del DENUE responde 404 cuando la busqueda no arroja registros
            return {"encontrado": False, "telefono": "", "correo": "",
                    "razon_social": "", "detalle": {"candidatos": 0}}
        if r.status_code != 200:
            raise DenueError(f"DENUE respondio HTTP {r.status_code}")
        try:
            candidatos = r.json()
        except ValueError as exc:
            raise DenueError("DENUE devolvio una respuesta no-JSON") from exc
        if not isinstance(candidatos, list):
            raise DenueError("DENUE devolvio un cuerpo inesperado (no lista)")

        for c in candidatos:
            for llave in ("Razon_social", "Nombre"):
                if normalizar_nombre(c.get(llave, "")) == objetivo:
                    return {
                        "encontrado": True,
                        "telefono": (c.get("Telefono") or "").strip(),
                        "correo": (c.get("Correo_e") or "").strip().lower(),
                        "razon_social": (c.get("Razon_social") or "").strip(),
                        "detalle": {"denue_id": c.get("Id"), "clee": c.get("CLEE"),
                                    "match": llave, "candidatos": len(candidatos)},
                    }
        return {"encontrado": False, "telefono": "", "correo": "", "razon_social": "",
                "detalle": {"candidatos": len(candidatos),
                            "razon": "sin match exacto tras normalizar"}}
