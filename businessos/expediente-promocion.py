#!/usr/bin/env python3
"""expediente-promocion.py — presenta expedientes de promoción A1→A2 (plan D-40).

Host-job (cron nocturno en el servidor; el agente NO maneja secretos):
  1. Lee los tenants activos en nivel A1 (PostgREST, service_role del .env).
  2. Pide a sup-crm (127.0.0.1:4700) el expediente de cada uno.
  3. Si es promovible y no hay expediente pendiente vigente: lo REGISTRA en
     crm_expedientes (bitácora de compuerta, caducidad 7 días) y se lo PRESENTA
     a la dueña por Telegram (`hermes send`, sin LLM) con el botón exacto.
  4. Marca como 'expirado' los pendientes vencidos (la evidencia envejece).

El job PRESENTA; jamás promueve. El botón es humano por diseño.
Un escritor por tabla: este job escribe crm_expedientes (presenta/expira);
el humano resuelve vía el update documentado en el mensaje.

Uso: python3 expediente-promocion.py [--dry-run]   (dry-run: no envía Telegram)
"""
from __future__ import annotations

import datetime
import json
import os
import subprocess
import sys
import urllib.request

SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
SUP_CRM = os.environ.get("SUP_CRM_LOCAL", "http://127.0.0.1:4700")
DELIVER = os.environ.get("EXPEDIENTE_DELIVER", "telegram:7022378429")  # DM de la dueña
CADUCIDAD_DIAS = 7
UA = "curl/8.0"  # gotcha Cloudflare 1010 (2026-07-02)


def _req(url: str, *, data: dict | None = None, headers: dict | None = None, metodo: str | None = None):
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers={"User-Agent": UA, **(headers or {})}, method=metodo)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=30) as r:
        cuerpo = r.read().decode()
        return json.loads(cuerpo) if cuerpo.strip() else None


def _pg_headers(extra: str | None = None) -> dict:
    h = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}
    if extra:
        h["Prefer"] = extra
    return h


def tenants_a1() -> list[dict]:
    url = f"{SUPABASE_URL}/rest/v1/crm_tenants?activo=is.true&nivel=eq.A1&select=tenant_id,marca"
    return _req(url, headers=_pg_headers()) or []


def expediente_de(tenant_id: str) -> dict | None:
    try:
        return _req(f"{SUP_CRM}/expediente/{tenant_id}")
    except Exception as exc:  # noqa: BLE001 — un tenant caído no frena a los demás
        print(f"[expediente] {tenant_id}: sup-crm no respondió ({type(exc).__name__})")
        return None


def pendiente_vigente(tenant_id: str) -> bool:
    url = (
        f"{SUPABASE_URL}/rest/v1/crm_expedientes"
        f"?tenant_id=eq.{tenant_id}&estado=eq.pendiente&expira_en=gt.now()&select=id&limit=1"
    )
    return bool(_req(url, headers=_pg_headers()))


def registrar_expediente(tenant_id: str, exp: dict) -> int | None:
    url = f"{SUPABASE_URL}/rest/v1/crm_expedientes"
    expira = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=CADUCIDAD_DIAS)
    fila = {
        "tenant_id": tenant_id,
        "salto": exp["salto"],
        "criterios": exp["criterios"],
        "expira_en": expira.isoformat(),
    }
    filas = _req(url, data=fila, headers=_pg_headers("return=representation"))
    return filas[0]["id"] if filas else None


def expirar_vencidos() -> None:
    url = f"{SUPABASE_URL}/rest/v1/crm_expedientes?estado=eq.pendiente&expira_en=lt.now()"
    _req(url, data={"estado": "expirado"}, headers=_pg_headers("return=minimal"), metodo="PATCH")


def armar_mensaje(marca: str, tenant_id: str, exp: dict, expediente_id: int) -> str:
    c = exp["criterios"]
    return (
        f"📋 EXPEDIENTE DE PROMOCIÓN #{expediente_id} — {marca} ({tenant_id})\n"
        f"Salto propuesto: A1 → A2 (muestreo). La evidencia cumple TODO el criterio:\n"
        f"· Veredictos de juez: {c['veredictos_de_juez']['valor']} (requiere {c['veredictos_de_juez']['requiere']})\n"
        f"· Tasa de rechazo: {c['tasa_rechazo_juez']['valor']:.2%} (requiere {c['tasa_rechazo_juez']['requiere']})\n"
        f"· Fallos de gates: {c['fallos_de_gates']['valor']} (requiere {c['fallos_de_gates']['requiere']})\n\n"
        f"El botón es tuyo. Para APROBAR, dile al agente de Claude Code:\n"
        f"\"aprueba el expediente {expediente_id}\" — o SQL directo:\n"
        f"update crm_tenants set nivel='A2' where tenant_id='{tenant_id}';\n"
        f"update crm_expedientes set estado='aprobado', resuelto_en=now(), resuelto_por='elisa' where id={expediente_id};\n\n"
        f"Para RECHAZAR: mismo update con estado='rechazado'. Caduca en {CADUCIDAD_DIAS} días."
    )


def enviar(mensaje: str, dry_run: bool) -> bool:
    if dry_run:
        print("[dry-run] NO enviado. Mensaje:\n" + mensaje)
        return True
    r = subprocess.run(
        ["docker", "exec", "hermes-negocio", "hermes", "send", "-t", DELIVER, mensaje],
        capture_output=True, text=True, timeout=60,
    )
    if r.returncode != 0:
        print(f"[expediente] hermes send falló: {r.stderr.strip()[:200]}")
        return False
    return True


def main() -> int:
    if not (SUPABASE_URL and SERVICE_KEY):
        print("[expediente] sin SUPABASE_URL/SERVICE_ROLE_KEY: nada que hacer")
        return 1
    dry_run = "--dry-run" in sys.argv
    expirar_vencidos()
    presentados = 0
    for t in tenants_a1():
        exp = expediente_de(t["tenant_id"])
        if not exp or not exp.get("promovible"):
            continue
        if pendiente_vigente(t["tenant_id"]):
            print(f"[expediente] {t['tenant_id']}: ya hay expediente pendiente vigente")
            continue
        eid = registrar_expediente(t["tenant_id"], exp)
        if eid is None:
            print(f"[expediente] {t['tenant_id']}: NO se pudo registrar (no se presenta sin bitácora)")
            continue
        if enviar(armar_mensaje(t.get("marca") or t["tenant_id"], t["tenant_id"], exp, eid), dry_run):
            presentados += 1
            print(f"[expediente] {t['tenant_id']}: expediente #{eid} presentado")
    print(f"[expediente] fin: {presentados} presentado(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
