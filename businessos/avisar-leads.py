#!/usr/bin/env python3
"""avisar-leads.py — aviso en vivo de leads nuevos (RUNBOOK-PIPELINE-COMERCIAL P4).

Host-job (cron cada 5 min en el servidor; el agente NO maneja secretos):
  1. Lee `leads` con created_at posterior a la marca de agua local (PostgREST,
     service_role del .env). Este job NO escribe en `leads` (un escritor por
     origen: los escritores son los canales; este solo LEE y avisa).
  2. Si hay leads nuevos, avisa por Telegram al grupo del equipo
     (`hermes send`, sin LLM) con origen, contacto, empresa y mensaje.
  3. Avanza la marca de agua SOLO tras el envío exitoso: si Telegram falla, el
     siguiente ciclo reintenta (at-least-once; un aviso doble es mejor que un
     lead del que nadie se entera).

Primera corrida: inicializa la marca a AHORA y no avisa nada (lo dice en
stdout) — no spamea el histórico.

Uso: python3 avisar-leads.py [--dry-run]   (dry-run: no envía Telegram ni avanza la marca)
"""
from __future__ import annotations

import datetime
import json
import os
import pathlib
import subprocess
import sys
import urllib.parse
import urllib.request

SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
DELIVER = os.environ.get("LEADS_DELIVER", "telegram:-5449291632")  # grupo del equipo
CONTENEDOR = os.environ.get("HERMES_CONTENEDOR", "hermes-negocio")
ESTADO = pathlib.Path(os.environ.get("AVISAR_LEADS_ESTADO", os.path.expanduser("~/.local/state/avisar-leads.marca")))
MAX_POR_AVISO = 20  # más que esto en 5 min es una anomalía: se avisa el total y se listan 20
UA = "curl/8.0"  # gotcha Cloudflare 1010 (2026-07-02)


def _req(url: str, headers: dict | None = None):
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=30) as r:
        cuerpo = r.read().decode()
        return json.loads(cuerpo) if cuerpo.strip() else None


def _pg_headers() -> dict:
    return {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}


def leer_marca() -> str | None:
    try:
        marca = ESTADO.read_text().strip()
        return marca or None
    except FileNotFoundError:
        return None


def guardar_marca(iso: str) -> None:
    ESTADO.parent.mkdir(parents=True, exist_ok=True)
    ESTADO.write_text(iso + "\n")


def leads_desde(marca: str) -> list[dict]:
    # Timestamp literal calculado aquí — PostgREST NO evalúa now()/interval en
    # filtros (gotcha 2026-08-02 del buzón).
    filtro = urllib.parse.quote(marca)
    url = (
        f"{SUPABASE_URL}/rest/v1/leads"
        f"?created_at=gt.{filtro}"
        f"&select=lead_id,origen,empresa,contacto,mensaje,etapa,created_at"
        f"&order=created_at.asc&limit=200"
    )
    return _req(url, headers=_pg_headers()) or []


def armar_mensaje(leads: list[dict]) -> str:
    lineas = [f"🔔 {len(leads)} lead(s) nuevo(s) en el pipeline:"]
    for l in leads[:MAX_POR_AVISO]:
        mensaje = (l.get("mensaje") or "").strip().replace("\n", " ")
        if len(mensaje) > 120:
            mensaje = mensaje[:117] + "…"
        partes = [f"· [{l['origen']}] {l.get('contacto') or '(sin contacto)'}"]
        if l.get("empresa"):
            partes.append(f"— {l['empresa']}")
        if mensaje:
            partes.append(f"— “{mensaje}”")
        lineas.append(" ".join(partes))
    if len(leads) > MAX_POR_AVISO:
        lineas.append(f"… y {len(leads) - MAX_POR_AVISO} más (revisa Mission Control /crm).")
    lineas.append("Verlos: Mission Control → /crm")
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
        print(f"[avisar-leads] hermes send falló: {r.stderr.strip()[:200]}")
        return False
    return True


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    if not SUPABASE_URL or not SERVICE_KEY:
        print("[avisar-leads] SUPABASE_URL/SERVICE_ROLE_KEY ausentes — nada que hacer")
        return 1

    ahora = datetime.datetime.now(datetime.timezone.utc).isoformat()
    marca = leer_marca()
    if marca is None:
        # Primera corrida: no avisar el histórico; declarar el arranque.
        if not dry_run:
            guardar_marca(ahora)
        print(f"[avisar-leads] primera corrida: marca inicializada a {ahora}; sin avisos")
        return 0

    try:
        leads = leads_desde(marca)
    except Exception as exc:  # noqa: BLE001 — el fallo se imprime, jamás silencioso
        print(f"[avisar-leads] consulta a leads falló: {type(exc).__name__}: {exc}")
        return 1

    if not leads:
        print(f"[avisar-leads] sin leads nuevos desde {marca}")
        return 0

    if not enviar(armar_mensaje(leads), dry_run):
        # La marca NO avanza: el próximo ciclo reintenta con los mismos leads.
        return 1
    if not dry_run:
        guardar_marca(leads[-1]["created_at"])
    print(f"[avisar-leads] avisados {len(leads)} lead(s); marca → {leads[-1]['created_at']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
