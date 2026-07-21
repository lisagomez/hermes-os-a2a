"""app.py — sup-crm: el supervisor del CRM (CRM-1, plan D-40 nivel A1).

Servicio INTERNO (hermes-net, sin ruta pública): crm-canales le manda cada
saliente ANTES de enviarlo. Stateless: juzga lo que le dan, no escribe estado
del CRM (un escritor por tabla: la auditoría crm_supervision la escribe ÉL,
nada más). Orden: gates deterministas (gratis) → juez LLM (solo si pasan).

POST /validar {tenant_id, marca, conversacion, respuesta, conversacion_id?, nivel?}
  → {aprobado, gates, motivo, nivel, juez_ejecutado}
GET /health

Niveles (plan D-40): A1 = juez en CADA saliente; A2 = gates siempre + juez
sobre muestra (20%→5% con evidencia; 100% de lo sensible; degradación
automática a validación completa si el rechazo sube — ver muestreo.py).
"""
from __future__ import annotations

import json
import logging
import os
import random

import httpx
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from gates import correr_gates, gates_ok
from juez import JuezError, JuezLLM
from muestreo import es_sensible, tasa_muestreo

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
log = logging.getLogger("sup-crm")

TIMEOUT_S = 10.0


class Auditoria:
    """Escritor ÚNICO de crm_supervision (best-effort que imprime)."""

    def __init__(self, url: str | None = None, key: str | None = None, http_client: httpx.AsyncClient | None = None) -> None:
        self._url = (url or os.environ.get("SUPABASE_URL") or "").rstrip("/")
        self._key = key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
        self._http = http_client

    def _headers(self) -> dict:
        return {"apikey": self._key, "Authorization": f"Bearer {self._key}", "Content-Type": "application/json"}

    async def registrar(self, fila: dict) -> None:
        if not (self._url and self._key):
            log.warning("supervisión NO auditada: Supabase no configurado")
            return
        try:
            if self._http is not None:
                r = await self._http.post(f"{self._url}/rest/v1/crm_supervision", headers=self._headers(), json=fila)
            else:
                async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
                    r = await client.post(f"{self._url}/rest/v1/crm_supervision", headers=self._headers(), json=fila)
            if r.status_code not in (200, 201):
                log.error("auditoría NO escrita: HTTP %s", r.status_code)
        except httpx.HTTPError as exc:
            log.error("auditoría NO escrita: %s", type(exc).__name__)

    async def evidencia(self, tenant_id: str, limite: int = 100) -> tuple[int, int]:
        """(rechazos_del_juez, total_veredictos_de_juez) recientes del tenant.

        Sin datos o sin Supabase devuelve (0, 0) → tasa de arranque (conservador)."""
        if not (self._url and self._key):
            return (0, 0)
        url = (
            f"{self._url}/rest/v1/crm_supervision"
            f"?tenant_id=eq.{tenant_id}&juez_ejecutado=is.true"
            f"&select=aprobado&order=created_at.desc&limit={limite}"
        )
        try:
            if self._http is not None:
                r = await self._http.get(url, headers=self._headers())
            else:
                async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
                    r = await client.get(url, headers=self._headers())
        except httpx.HTTPError as exc:
            log.error("evidencia NO leída: %s (tasa de arranque)", type(exc).__name__)
            return (0, 0)
        if r.status_code != 200:
            log.error("evidencia NO leída: HTTP %s (tasa de arranque)", r.status_code)
            return (0, 0)
        filas = r.json()
        rechazos = sum(1 for f in filas if not f.get("aprobado"))
        return (rechazos, len(filas))


def build_app(juez: JuezLLM | None = None, auditoria: Auditoria | None = None, rng=None) -> Starlette:
    juez = juez or JuezLLM()
    auditoria = auditoria or Auditoria()
    rng = rng or random.random  # inyectable en tests (determinismo)

    async def health(_: Request) -> JSONResponse:
        return JSONResponse({"status": "ok", "servicio": "sup-crm"})

    async def validar(request: Request) -> JSONResponse:
        try:
            raw = await request.json()
        except (json.JSONDecodeError, ValueError):
            return JSONResponse({"error": "JSON inválido"}, status_code=400)
        if not isinstance(raw, dict) or not isinstance(raw.get("respuesta"), str):
            return JSONResponse({"error": "cuerpo inválido"}, status_code=400)
        tenant_id = str(raw.get("tenant_id") or "")
        marca = str(raw.get("marca") or tenant_id or "la marca")
        respuesta = raw["respuesta"]
        nivel = raw.get("nivel") if raw.get("nivel") in ("A1", "A2") else "A1"

        gates = correr_gates(respuesta)
        juez_ejecutado = False
        if not gates_ok(gates):
            motivo = "; ".join(v for v in gates.values() if v != "ok")
            veredicto = {"aprobado": False, "gates": gates, "motivo": motivo}
        else:
            # Muestreo A2: gates ya pasaron; el juez corre siempre en A1, y en A2
            # solo sobre la muestra + el 100% de lo sensible (dinero/promesas).
            correr_juez, tasa = True, 1.0
            if nivel == "A2" and not es_sensible(respuesta):
                rechazos, total = await auditoria.evidencia(tenant_id)
                tasa = tasa_muestreo(rechazos, total)
                if tasa >= 1.0:
                    log.warning(
                        "DEGRADACIÓN OPERATIVA tenant=%s: rechazo %s/%s → validación completa",
                        tenant_id, rechazos, total,
                    )
                correr_juez = rng() < tasa
            if correr_juez:
                juez_ejecutado = True
                try:
                    j = await juez.veredicto(marca, str(raw.get("conversacion") or ""), respuesta)
                    gates["g_juez"] = "ok" if j["aprobado"] else f"fallo: {j['motivo']}"
                    veredicto = {"aprobado": j["aprobado"], "gates": gates, "motivo": j["motivo"]}
                except JuezError as exc:
                    # Fail-safe: sin juez NO hay aprobación (proteger primero) — y se dice.
                    log.error("juez no disponible: %s", exc)
                    gates["g_juez"] = "no_ejecutable"
                    veredicto = {"aprobado": False, "gates": gates, "motivo": "juez no disponible (fail-safe)"}
            else:
                gates["g_juez"] = f"muestreo A2: omitido (tasa {tasa:.2f})"
                veredicto = {"aprobado": True, "gates": gates, "motivo": f"gates ok; juez muestreado (tasa {tasa:.2f})"}

        veredicto["nivel"] = nivel
        veredicto["juez_ejecutado"] = juez_ejecutado
        await auditoria.registrar(
            {
                "tenant_id": tenant_id,
                "conversacion_id": raw.get("conversacion_id"),
                "aprobado": veredicto["aprobado"],
                "gates": veredicto["gates"],
                "motivo": veredicto["motivo"],
                "nivel": nivel,
                "juez_ejecutado": juez_ejecutado,
            }
        )
        return JSONResponse(veredicto)

    return Starlette(routes=[Route("/health", health, methods=["GET"]), Route("/validar", validar, methods=["POST"])])


app = build_app()
