#!/usr/bin/env python3
"""Snapshot de `tareas_reunion` vencidas/por vencer -> volumen de negocio (Fase 10).

Host-job de confianza (mismo patron que revisar-vigencias.py / ingest-token-usage.py):
consulta Supabase con el service_role (el agente Hermes nunca lo toca, secret-scrubbing
por diseno) y deja el resultado ya calculado en el volumen para que
businessos/alerta-tareas-reunion.sh lo lea sin credenciales.

Ventana: estado='pendiente' AND fecha_limite <= manana (UTC) -> cubre vencidas, hoy y
manana en una sola pasada (fecha_limite NULL / "sin fecha" nunca entra: esas tareas van
al acta, no a alertas, por diseno del prompt de ingesta).

Uso:
    source businessos/.env                       # SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
    python3 businessos/snapshot-tareas-reunion.py            # snapshot + escribe al volumen
    python3 businessos/snapshot-tareas-reunion.py --dry-run  # solo imprime, no escribe

Cron sugerido (mismo host que nightly-jobs.sh, corre justo antes de la alerta de las 08:00):
    0 8 * * * python3 /home/hermes/repo/businessos/snapshot-tareas-reunion.py
    5 8 * * * bash /home/hermes/repo/businessos/alerta-tareas-reunion.sh
"""
import datetime
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

CONTAINER = "hermes-negocio"
SNAPSHOT_PATH = "/opt/data/workspace/tareas_reunion_due.json"
DRY = "--dry-run" in sys.argv[1:]


def fetch_due(url: str, key: str, hasta: str) -> list[dict]:
    q = (f"{url.rstrip('/')}/rest/v1/tareas_reunion"
         f"?estado=eq.pendiente&fecha_limite=lte.{hasta}"
         f"&select=id,negocio,reunion_id,tarea,responsable,fecha_limite,canal,fuente"
         f"&order=fecha_limite.asc")
    req = urllib.request.Request(q, headers={"apikey": key, "Authorization": "Bearer " + key})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def build_snapshot(rows: list[dict], hoy: str) -> dict:
    for r in rows:
        r["vencida"] = bool(r.get("fecha_limite")) and r["fecha_limite"] < hoy
    return {
        "generado": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ"),
        "hoy": hoy,
        "total": len(rows),
        "vencidas": sum(1 for r in rows if r["vencida"]),
        "tareas": rows,
    }


def write_snapshot(snapshot: dict) -> bool:
    payload = json.dumps(snapshot, ensure_ascii=False, indent=2)
    cmd = ["docker", "exec", "-i", "-u", "hermes", CONTAINER, "sh", "-c",
           f"mkdir -p /opt/data/workspace && cat > {SNAPSHOT_PATH}"]
    try:
        r = subprocess.run(cmd, input=payload, text=True, capture_output=True)
        return r.returncode == 0
    except FileNotFoundError:
        return False


def main() -> int:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: falta SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno "
              "(source businessos/.env primero).", file=sys.stderr)
        return 1

    hoy = datetime.datetime.now(datetime.timezone.utc).date()
    manana = (hoy + datetime.timedelta(days=1)).isoformat()

    try:
        rows = fetch_due(url, key, manana)
    except urllib.error.HTTPError as e:
        print(f"ERROR: consulta a tareas_reunion fallo {e.code} {e.read().decode()[:300]}",
              file=sys.stderr)
        return 1

    snapshot = build_snapshot(rows, hoy.isoformat())
    print(f"=== tareas_reunion due ({snapshot['generado']}) ===")
    print(f"  total={snapshot['total']} vencidas={snapshot['vencidas']}")
    for r in rows:
        marca = "VENCIDA" if r["vencida"] else "vence"
        print(f"  {marca} {r['fecha_limite']}: '{r['tarea'][:60]}' "
              f"responsable={r.get('responsable') or 'sin dueno'} ({r['reunion_id']}/{r['id']})")

    if DRY:
        print("DRY-RUN: no se escribio el snapshot.")
        return 0

    ok = write_snapshot(snapshot)
    print(f"Snapshot -> {CONTAINER}:{SNAPSHOT_PATH}", "ok" if ok else "FALLO (contenedor no disponible)")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
