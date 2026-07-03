#!/usr/bin/env python3
"""Snapshot del Pantheon (Fase 4) — host-job de Mission Control.

El dashboard A2ABot NUNCA monta volumenes .hermes (riesgo de corrupcion con doble
escritor, ver docker-compose.yml). Este job es quien lee cada volumen —el host si
puede— y deja el snapshot en Supabase `pantheon`; el dashboard solo lee Supabase.

Por vertical extrae:
  - modelo principal (config.yaml -> model.default)
  - cadena de fallback (config.yaml -> fallback_providers[].model)
  - skills instalados (/opt/data/skills/*/SKILL.md: nombre + primera linea)
El @handle del bot es estatico (BOTS abajo): cambia solo si se recrea el bot.

Uso:
    python3 businessos/snapshot-pantheon.py            # lee volumenes via docker exec -> UPSERT
    python3 businessos/snapshot-pantheon.py --dry-run  # muestra el snapshot, no toca Supabase

Env (businessos/.env): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
Pruebas sin Docker: PANTHEON_DIR=/ruta con <vertical>/config.yaml y <vertical>/skills/.
Cron sugerido (Droplet, tras cambios de config): 0 7 * * * python3 /root/businessos/snapshot-pantheon.py
"""
import json
import os
import re
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

DRY = "--dry-run" in sys.argv[1:]
LOCAL_DIR = os.environ.get("PANTHEON_DIR")  # modo prueba local (sin docker)

VERTICALES = ("personal", "negocio", "clientes")
BOTS = {
    "personal": "@hermes_khmcih2cwjdulkbq_bot",  # Kiris
    "negocio": "@a2aTeamBot",
    "clientes": "@a2aClientbot",
}


def env(nombre):
    val = os.environ.get(nombre, "")
    if not val:
        print(f"ABORT: falta {nombre} en el entorno (source businessos/.env)")
        sys.exit(1)
    return val


def dexec(vertical, cmd):
    res = subprocess.run(
        ["docker", "exec", "-u", "hermes", f"hermes-{vertical}", "sh", "-c", cmd],
        capture_output=True, text=True,
    )
    return res.stdout if res.returncode == 0 else None


def leer(vertical, relpath):
    """Contenido de un archivo del volumen (o None). Nunca lee .env (credential store)."""
    if LOCAL_DIR:
        p = Path(LOCAL_DIR) / vertical / relpath
        return p.read_text(encoding="utf-8") if p.exists() else None
    return dexec(vertical, f"cat /opt/data/{relpath} 2>/dev/null")


def listar_skills(vertical):
    if LOCAL_DIR:
        base = Path(LOCAL_DIR) / vertical / "skills"
        nombres = sorted(d.name for d in base.iterdir() if d.is_dir()) if base.exists() else []
    else:
        out = dexec(vertical, "ls -1 /opt/data/skills 2>/dev/null") or ""
        nombres = [n for n in out.splitlines() if n.strip()]
    skills = []
    for n in nombres:
        primera = ""
        md = leer(vertical, f"skills/{n}/SKILL.md")
        if md:
            for linea in md.splitlines():
                limpia = linea.strip().lstrip("#").strip()
                if limpia.startswith("description:"):
                    primera = limpia.split(":", 1)[1].strip()[:200]
                    break
                # primera linea de PROSA: ni frontmatter/claves ni el encabezado-nombre
                if limpia and not limpia.startswith(("---", "name:")) and limpia != n:
                    primera = limpia[:200]
                    break
        skills.append({"nombre": n, "descripcion": primera or None})
    return skills


def extraer_config(texto):
    """model.default y fallback_providers[].model de config.yaml.

    Extraccion dirigida por regex (sin pyyaml: los host-jobs son stdlib-only).
    Si Hermes cambia el formato, el snapshot sale con null y se nota en el panel.
    """
    modelo = None
    m = re.search(r"^model:\s*$(.*?)^(?=\S)", texto + "\n_", re.M | re.S)
    bloque = m.group(1) if m else texto
    d = re.search(r'^\s+default:\s*"?([^"\n]+)"?\s*$', bloque, re.M)
    if d:
        modelo = d.group(1).strip()

    fallbacks = []
    # Los items de la lista van a COLUMNA 0 ("- provider: ...", gotcha memoria
    # hermes-vertical-setup): el bloque termina en la siguiente CLAVE top-level.
    fb = re.search(r"^fallback_providers:\s*$(.*?)^(?=[A-Za-z_])", texto + "\n_", re.M | re.S)
    if fb:
        fallbacks = [x.strip().strip('"') for x in re.findall(r'^\s+model:\s*"?([^"\n]+)"?\s*$', fb.group(1), re.M)]
    return modelo, fallbacks


def snapshot():
    filas = []
    for v in VERTICALES:
        cfg = leer(v, "config.yaml")
        if cfg is None:
            print(f"  WARN {v}: sin config.yaml (contenedor apagado o volumen ausente) — se omite")
            continue
        modelo, fallbacks = extraer_config(cfg)
        filas.append({
            "vertical": v,
            "bot": BOTS.get(v),
            "modelo": modelo,
            "fallbacks": fallbacks,
            "skills": listar_skills(v),
            "snapshot_at": datetime.now(timezone.utc).isoformat(),
        })
    return filas


def upsert(filas):
    url = env("SUPABASE_URL").rstrip("/")
    key = env("SUPABASE_SERVICE_ROLE_KEY")
    req = urllib.request.Request(
        f"{url}/rest/v1/pantheon?on_conflict=vertical",
        data=json.dumps(filas, ensure_ascii=False).encode(),
        headers={
            "apikey": key, "Authorization": "Bearer " + key,
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
            # Cloudflare bloquea el UA de urllib (error 1010) — gotcha CLAUDE.md
            "User-Agent": "curl/8.0",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status


filas = snapshot()
for f in filas:
    print(f"  {f['vertical']}: modelo={f['modelo']} fallbacks={len(f['fallbacks'])} skills={len(f['skills'])}")
if not filas:
    print("Nada que subir (ningun volumen legible).")
    sys.exit(1)
if DRY:
    print(json.dumps(filas, ensure_ascii=False, indent=2))
    print(f"=== DRY-RUN: {len(filas)} verticales, no se toco Supabase ===")
    sys.exit(0)
status = upsert(filas)
print(f"=== pantheon: {len(filas)} verticales upsert (HTTP {status}) ===")
