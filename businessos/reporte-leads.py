#!/usr/bin/env python3
"""reporte-leads.py — reconciliación diaria del pipeline comercial (RUNBOOK P5).

Host-job (cron diario 08:00 CST = 14:00 UTC en el servidor):
  1. Cuenta leads por origen de AYER (día completo en CST) y del MES en curso.
  2. Señala los canales cableados SIN filas en los últimos 7 días — la señal
     de canal muerto en silencio (así murieron los host-jobs huérfanos tras la
     migración a Hetzner: nadie miraba).
  3. Envía el resumen por Telegram al grupo (`hermes send`, sin LLM).

Solo LEE `leads`; no escribe nada. Todas las fechas se calculan aquí y viajan
como timestamps literales (PostgREST no evalúa now()/interval en filtros,
gotcha 2026-08-02). CST fijo UTC-6 (México sin horario de verano desde 2022).

Uso: python3 reporte-leads.py [--dry-run]
"""
from __future__ import annotations

import datetime
import json
import os
import subprocess
import sys
import urllib.parse
import urllib.request

SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
DELIVER = os.environ.get("LEADS_DELIVER", "telegram:-5449291632")  # grupo del equipo
CONTENEDOR = os.environ.get("HERMES_CONTENEDOR", "hermes-negocio")
# Canales con escritor cableado HOY (RUNBOOK §1). 'manual' y 'slack' fuera:
# manual es esporádico por diseño y slack no tiene escritor (P10 pendiente).
CANALES = [c for c in os.environ.get("REPORTE_CANALES", "web2,a2a,crm,correo,copilot").split(",") if c]
CST = datetime.timezone(datetime.timedelta(hours=-6))
UA = "curl/8.0"  # gotcha Cloudflare 1010 (2026-07-02)


def _req(url: str, headers: dict | None = None):
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=30) as r:
        cuerpo = r.read().decode()
        return json.loads(cuerpo) if cuerpo.strip() else None


def _pg_headers() -> dict:
    return {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}


def contar_por_origen(desde: datetime.datetime, hasta: datetime.datetime | None = None) -> dict[str, int]:
    """Cuenta filas por origen en [desde, hasta) leyendo solo la columna origen.
    Con el volumen actual (decenas/mes) esto es barato; los agregados de
    PostgREST están deshabilitados en la plataforma (PGRST123, 2026-07-23)."""
    filtros = f"created_at=gte.{urllib.parse.quote(desde.isoformat())}"
    if hasta is not None:
        filtros += f"&created_at=lt.{urllib.parse.quote(hasta.isoformat())}"
    url = f"{SUPABASE_URL}/rest/v1/leads?{filtros}&select=origen&limit=10000"
    conteo: dict[str, int] = {}
    for fila in _req(url, headers=_pg_headers()) or []:
        conteo[fila["origen"]] = conteo.get(fila["origen"], 0) + 1
    return conteo


def ultimo_por_canal() -> dict[str, str | None]:
    """max(created_at) por canal cableado (una consulta chica por canal)."""
    ultimos: dict[str, str | None] = {}
    for canal in CANALES:
        url = (
            f"{SUPABASE_URL}/rest/v1/leads?origen=eq.{urllib.parse.quote(canal)}"
            f"&select=created_at&order=created_at.desc&limit=1"
        )
        filas = _req(url, headers=_pg_headers()) or []
        ultimos[canal] = filas[0]["created_at"] if filas else None
    return ultimos


def armar_reporte(ahora_cst: datetime.datetime) -> str:
    ayer = (ahora_cst - datetime.timedelta(days=1)).date()
    ayer_ini = datetime.datetime.combine(ayer, datetime.time.min, tzinfo=CST)
    ayer_fin = ayer_ini + datetime.timedelta(days=1)
    mes_ini = datetime.datetime.combine(ahora_cst.date().replace(day=1), datetime.time.min, tzinfo=CST)

    del_dia = contar_por_origen(ayer_ini, ayer_fin)
    del_mes = contar_por_origen(mes_ini)
    ultimos = ultimo_por_canal()

    lineas = [f"📊 Pipeline comercial — reporte del {ayer.isoformat()} (CST)"]
    if del_dia:
        lineas.append("Ayer: " + " · ".join(f"{k}: {v}" for k, v in sorted(del_dia.items())))
    else:
        lineas.append("Ayer: 0 leads nuevos.")
    total_mes = sum(del_mes.values())
    detalle_mes = " · ".join(f"{k}: {v}" for k, v in sorted(del_mes.items())) or "—"
    lineas.append(f"Mes en curso: {total_mes} ({detalle_mes})")

    ahora_utc = datetime.datetime.now(datetime.timezone.utc)
    muertos = []
    for canal, ultimo in sorted(ultimos.items()):
        if ultimo is None:
            muertos.append(f"{canal} (nunca ha escrito)")
            continue
        edad = ahora_utc - datetime.datetime.fromisoformat(ultimo)
        if edad.days >= 7:
            muertos.append(f"{canal} ({edad.days}d sin filas)")
    if muertos:
        lineas.append("⚠️ Canales sin señal ≥7 días (tratar como rotos hasta probar): " + ", ".join(muertos))
    else:
        lineas.append("Todos los canales cableados tienen señal en los últimos 7 días.")
    lineas.append("La verdad vive en public.leads (Mission Control → /crm es solo lector).")
    return "\n".join(lineas)


def enviar(mensaje: str, dry_run: bool) -> bool:
    if dry_run:
        print("[dry-run] NO enviado. Mensaje:\n" + mensaje)
        return True
    r = subprocess.run(
        ["docker", "exec", CONTENEDOR, "hermes", "send", "-t", DELIVER, mensaje],
        capture_output=True, text=True, timeout=60,
    )
    if r.returncode != 0:
        print(f"[reporte-leads] hermes send falló: {r.stderr.strip()[:200]}")
        return False
    return True


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    if not SUPABASE_URL or not SERVICE_KEY:
        print("[reporte-leads] SUPABASE_URL/SERVICE_ROLE_KEY ausentes — nada que hacer")
        return 1
    try:
        reporte = armar_reporte(datetime.datetime.now(CST))
    except Exception as exc:  # noqa: BLE001 — el fallo se imprime, jamás silencioso
        print(f"[reporte-leads] consulta falló: {type(exc).__name__}: {exc}")
        return 1
    if not enviar(reporte, dry_run):
        return 1
    print("[reporte-leads] reporte enviado")
    return 0


if __name__ == "__main__":
    sys.exit(main())
