#!/usr/bin/env python3
"""Ingesta de accion items de reuniones de negocio -> tabla Supabase `tareas_reunion`.

Consume el bloque TAREAS_JSON que produce el prompt generico de ingesta de reuniones
(C:\\OPS\\_VelOS\\proyectos\\Transcript reuniones colaborativas\\SYSTEM-PROMPT-ingesta-reunion-negocio.md,
fuera de este repo a proposito) y hace UPSERT en `tareas_reunion` (migracion
businessos/supabase-fase10-reuniones.sql). Idempotente: reingerir la misma reunion
actualiza las filas (clave natural reunion_id+id), no duplica.

A diferencia de ingest-facturas.py (que relevea via `docker exec` porque el PRODUCTOR
del JSON es el agente Hermes sandboxeado, sin credenciales por diseno), aqui el
PRODUCTOR es una sesion de Claude Code en este repo (el skill ingesta-reunion, corriendo
en la maquina del desarrollador/equipo), que YA tiene permitido leer `businessos/.env` en
runtime sin imprimirlo (regla seguridad-secretos). Por eso este script llama a
PostgREST directo, sin relevo por volumen Docker.

Uso:
    source businessos/.env                       # SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
    python3 businessos/ingest-reuniones.py acta.md          # extrae el bloque de un .md/.txt
    python3 businessos/ingest-reuniones.py bloque.json      # o un JSON ya aislado
    cat bloque.json | python3 businessos/ingest-reuniones.py -   # o por stdin ("-")
    python3 businessos/ingest-reuniones.py acta.md --dry-run     # valida y muestra, sin escribir

Forma esperada del bloque (envuelto o crudo, ambos se aceptan):
    <<<TAREAS_JSON
    {"negocio":"a2a","reunion_id":"a2a-reunion-2026-07-15","generado":"2026-07-16",
     "tareas":[{"id":"T1","tarea":"...","responsable":"...",
                "fecha_limite":"2026-07-24 (dicho: 'el viernes')|sin fecha",
                "canal":"#alertas","fuente":"Nombre [mm:ss]"}]}
    TAREAS_JSON>>>

Reglas de validacion (nunca adivina; si falta algo lo rechaza esa tarea, no toda la reunion):
  - reunion_id y generado son obligatorios a nivel de reunion.
  - negocio: si falta, default 'a2a' (unico negocio con este flujo validado hasta hoy).
  - por tarea: id y tarea son obligatorios. responsable/canal/fuente pasan tal cual (o null).
  - fecha_limite: "sin fecha" (o vacio) -> NULL. Si trae anotacion "AAAA-MM-DD (dicho: ...)"
    se conserva SOLO la fecha AAAA-MM-DD (la anotacion es para el humano, no para la BD).
    Una fecha que no parsea a AAAA-MM-DD se rechaza esa tarea (no se adivina).
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request

DRY = "--dry-run" in sys.argv[1:]
ARGS = [a for a in sys.argv[1:] if a != "--dry-run"]

BLOCK_RE = re.compile(r"<<<TAREAS_JSON\s*(.*?)\s*TAREAS_JSON>>>", re.S)
FECHA_RE = re.compile(r"^\s*(\d{4}-\d{2}-\d{2})")


def extract_json(text: str) -> str:
    """Si el texto trae el acta completa, aisla el bloque entre marcadores.
    Si ya es JSON crudo (empieza con '{'), lo devuelve tal cual."""
    text = text.strip()
    m = BLOCK_RE.search(text)
    if m:
        return m.group(1)
    if text.startswith("{"):
        return text
    raise ValueError("no se encontro un bloque <<<TAREAS_JSON ... TAREAS_JSON>>> ni JSON crudo")


def normalize_fecha(raw) -> tuple[str | None, str | None]:
    """('' | 'sin fecha' | None) -> (None, None). 'AAAA-MM-DD (dicho: ...)' -> solo la fecha.
    Devuelve (fecha_normalizada_o_None, error_o_None)."""
    if raw is None:
        return None, None
    s = str(raw).strip()
    if not s or s.lower() == "sin fecha":
        return None, None
    m = FECHA_RE.match(s)
    if not m:
        return None, f"fecha_limite no parseable: {raw!r}"
    return m.group(1), None


REQUIRED_TAREA = ("id", "tarea")


def valid_tarea(t: dict, negocio: str, reunion_id: str) -> tuple[dict | None, str | None]:
    """Devuelve (fila_normalizada, None) o (None, motivo_de_rechazo)."""
    if not isinstance(t, dict):
        return None, "tarea no es un objeto"
    faltan = [k for k in REQUIRED_TAREA if not str(t.get(k, "")).strip()]
    if faltan:
        return None, "faltan campos: " + ", ".join(faltan)
    fecha, err = normalize_fecha(t.get("fecha_limite"))
    if err:
        return None, err
    fila = {
        "id": str(t["id"]).strip(),
        "negocio": negocio,
        "reunion_id": reunion_id,
        "tarea": str(t["tarea"]).strip(),
        "responsable": (str(t["responsable"]).strip() or None) if t.get("responsable") else None,
        "fecha_limite": fecha,
        "canal": (str(t["canal"]).strip() or None) if t.get("canal") else None,
        "fuente": (str(t["fuente"]).strip() or None) if t.get("fuente") else None,
    }
    return fila, None


def build_rows(envelope: dict) -> tuple[list[dict], list[str]]:
    """Valida el envelope completo. Devuelve (filas_validas, errores_por_tarea_rechazada).
    Lanza ValueError si falta algo obligatorio a nivel de reunion."""
    reunion_id = str(envelope.get("reunion_id") or "").strip()
    if not reunion_id:
        raise ValueError("falta 'reunion_id' en el envelope")
    if not str(envelope.get("generado") or "").strip():
        raise ValueError("falta 'generado' en el envelope")
    negocio = str(envelope.get("negocio") or "a2a").strip()
    tareas = envelope.get("tareas", [])
    if not isinstance(tareas, list):
        raise ValueError("'tareas' debe ser una lista")

    rows, errores = [], []
    for i, t in enumerate(tareas):
        fila, err = valid_tarea(t, negocio, reunion_id)
        if err:
            errores.append(f"tarea[{i}] ({t.get('id', '?')}): {err}")
        else:
            rows.append(fila)
    return rows, errores


def upsert(rows: list[dict], url: str, key: str) -> None:
    if not rows:
        return
    req = urllib.request.Request(
        f"{url.rstrip('/')}/rest/v1/tareas_reunion?on_conflict=reunion_id,id",
        data=json.dumps(rows).encode(),
        headers={"apikey": key, "Authorization": "Bearer " + key,
                 "Content-Type": "application/json",
                 "Prefer": "resolution=merge-duplicates,return=minimal"})
    urllib.request.urlopen(req, timeout=30)


def read_input(arg: str | None) -> str:
    if arg is None or arg == "-":
        return sys.stdin.read()
    with open(arg, "r", encoding="utf-8") as f:
        return f.read()


def main() -> int:
    if len(ARGS) > 1:
        print("Uso: ingest-reuniones.py <archivo.md|archivo.json|-> [--dry-run]", file=sys.stderr)
        return 2
    raw = read_input(ARGS[0] if ARGS else None)

    try:
        block = extract_json(raw)
        envelope = json.loads(block)
    except (ValueError, json.JSONDecodeError) as e:
        print(f"ERROR: bloque TAREAS_JSON invalido: {e}", file=sys.stderr)
        return 1

    try:
        rows, errores = build_rows(envelope)
    except ValueError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

    reunion_id = envelope.get("reunion_id")
    print(f"=== {reunion_id} ({envelope.get('negocio', 'a2a')}) - "
          f"{len(rows)} tarea(s) valida(s), {len(errores)} rechazada(s) ===")
    for r in rows:
        venc = r["fecha_limite"] or "sin fecha"
        print(f"  {r['id']:<4} {r['tarea'][:60]:<60} {r['responsable'] or 'sin dueno':<20} "
              f"vence={venc:<12} canal={r['canal'] or '-'}")
    for e in errores:
        print(f"  SKIP {e}")

    if not rows:
        print("Nada que subir.")
        return 1 if errores else 0

    if DRY:
        print(f"DRY-RUN: no se escribio nada ({len(rows)} fila(s) habrian subido).")
        return 0

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: falta SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno "
              "(source businessos/.env primero).", file=sys.stderr)
        return 1
    try:
        upsert(rows, url, key)
    except urllib.error.HTTPError as e:
        print(f"ERROR: UPSERT fallo {e.code} {e.read().decode()[:300]}", file=sys.stderr)
        return 1
    print(f"UPSERT ok ({len(rows)} fila(s)) -> tareas_reunion")
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())
