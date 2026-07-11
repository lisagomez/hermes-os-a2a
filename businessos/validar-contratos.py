#!/usr/bin/env python3
"""Validación de contratos-documento vía grafo (Fase 3).

Cada contrato pasa por el grafo ANTES de cerrarse: la dimensión `contractual`
evalúa las cláusulas según la jurisdicción del cliente y devuelve banderas con
fuente (CCF/CCo/LFPDPPP/CFF) + checklist. El grafo NUNCA aprueba: marca `dudoso`
y señala; aprobar y firmar es EXCLUSIVAMENTE humano (Elisa). Este job solo
transcribe el dictamen.

Flujo (patrón host-job; el agente no tiene secretos de Supabase):

    agente clientes redacta el borrador (contrato-template.md) y deja el JSON en
    /opt/data/workspace/contratos_pending/<cliente>-<titulo>.json
      -> este job lo evalúa en el grafo (dimensión contractual)
      -> upsert a Supabase `contratos`: estado 'en_revision' si hay banderas
         rojas, 'validado' si no; validacion = dictamen completo
      -> deja el dictamen en /opt/data/workspace/contratos_validados/<nombre>.json
         (el agente lo LEE y se lo presenta a Elisa)
      -> mueve el request a contratos_procesados/.

Forma del request:
    {"cliente": "ACME S.A.", "titulo": "Consultoria 2026", "jurisdiccion": "MX",
     "clausulas": [{"titulo": "Condiciones de pago", "texto": "..."}, ...]}

Uso (servidor, grafo arriba):
    source businessos/.env
    python3 businessos/validar-contratos.py            # procesa la bandeja
    python3 businessos/validar-contratos.py --dry-run  # evalúa y muestra, sin escribir

Pruebas locales sin Docker: CONTRATOS_DIR=/ruta/local (bandeja en disco local).
"""
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

DRY = "--dry-run" in sys.argv[1:]
GRAFO = os.environ.get("GRAFO_URL", "http://127.0.0.1:3000").rstrip("/")
LOCAL_DIR = os.environ.get("CONTRATOS_DIR")

CONTAINER = "hermes-clientes"
PENDING = "/opt/data/workspace/contratos_pending"
VALIDADOS = "/opt/data/workspace/contratos_validados"
DONE = "/opt/data/workspace/contratos_procesados"


def http(url, data=None, headers=None, method=None):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode()


def dexec(cmd, inp=None):
    import subprocess
    return subprocess.run(["docker", "exec", "-i", "-u", "hermes", CONTAINER, "sh", "-c", cmd],
                          input=inp, capture_output=True, text=True)


def bandeja():
    if LOCAL_DIR:
        return [(p.name, p.read_text(encoding="utf-8")) for p in sorted(Path(LOCAL_DIR).glob("*.json"))]
    out = dexec(f"ls -1 {PENDING}/*.json 2>/dev/null").stdout
    return [(os.path.basename(p), dexec(f"cat {p}").stdout) for p in out.splitlines() if p.strip()]


def entregar(nombre, dictamen):
    data = json.dumps(dictamen, ensure_ascii=False, indent=2)
    if LOCAL_DIR:
        destino = Path(LOCAL_DIR) / "validados"
        destino.mkdir(exist_ok=True)
        (destino / nombre).write_text(data, encoding="utf-8")
        (Path(LOCAL_DIR) / nombre).rename(Path(LOCAL_DIR) / f"procesado-{nombre}")
        return True
    r1 = dexec(f"mkdir -p {VALIDADOS} {DONE} && cat > {VALIDADOS}/{nombre}", inp=data)
    r2 = dexec(f"mv {PENDING}/{nombre} {DONE}/")
    return r1.returncode == 0 and r2.returncode == 0


def valid(f):
    faltan = [k for k in ("cliente", "titulo", "clausulas") if not f.get(k)]
    if faltan:
        return None, "faltan campos: " + ", ".join(faltan)
    if not isinstance(f["clausulas"], list) or not all(
        isinstance(c, dict) and c.get("texto") for c in f["clausulas"]
    ):
        return None, "clausulas debe ser lista de {titulo, texto}"
    return {
        "cliente": str(f["cliente"]).strip(),
        "titulo": str(f["titulo"]).strip(),
        "jurisdiccion": str(f.get("jurisdiccion", "MX")).strip().upper(),
        "clausulas": f["clausulas"],
    }, None


def evaluar(contrato):
    conceptos = [
        {"descripcion": (f"{c.get('titulo', '')}. {c['texto']}" if c.get("titulo") else c["texto"])}
        for c in contrato["clausulas"]
    ]
    body = json.dumps({
        "contexto": {"jurisdiccion": contrato["jurisdiccion"], "dimension": "contractual",
                     "regimen": "GENERAL"},
        "conceptos": conceptos,
    })
    return json.loads(http(f"{GRAFO}/evaluaciones", data=body.encode(),
                           headers={"Content-Type": "application/json"}))


def upsert_supabase(contrato, salida, estado):
    url = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    fila = {
        "cliente": contrato["cliente"], "titulo": contrato["titulo"],
        "jurisdiccion": contrato["jurisdiccion"], "clausulas": contrato["clausulas"],
        "estado": estado, "validacion": salida, "evaluacion_id": salida.get("id"),
    }
    http(f"{url}/rest/v1/contratos?on_conflict=cliente,titulo",
         data=json.dumps(fila).encode(),
         headers={"apikey": key, "Authorization": "Bearer " + key,
                  "Content-Type": "application/json",
                  "Prefer": "resolution=merge-duplicates,return=minimal"})


# Salud del grafo antes de tocar nada.
try:
    salud = json.loads(http(f"{GRAFO}/health"))
    if salud.get("db") != "ok" or not salud.get("reglas"):
        print(f"ABORT: grafo vivo pero sin conocimiento (health: {salud}).")
        sys.exit(1)
except (urllib.error.URLError, OSError) as e:
    print(f"ABORT: grafo no responde en {GRAFO} ({e}). ¿docker compose up -d grafo?")
    sys.exit(1)

items = bandeja()
if not items:
    print(f"No hay contratos en la bandeja.")
    sys.exit(0)

ok = errores = 0
for nombre, raw in items:
    try:
        f = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"  SKIP {nombre}: JSON invalido ({e})"); errores += 1; continue
    contrato, err = valid(f)
    if err:
        print(f"  SKIP {nombre}: {err}"); errores += 1; continue

    try:
        salida = evaluar(contrato)
    except urllib.error.HTTPError as e:
        print(f"  ERROR {nombre}: grafo {e.code} {e.read().decode()[:200]}"); errores += 1; continue

    banderas = salida.get("banderas_rojas", [])
    estado = "en_revision" if banderas else "validado"
    etiqueta = f"{contrato['cliente']} / {contrato['titulo']} -> {estado}  [{len(banderas)} banderas]"

    if DRY:
        print(f"  DRY  {etiqueta}")
        for c in salida["conceptos"]:
            fuente = c["fuente"]["cita"] if c.get("fuente") else "sin regla aplicable"
            print(f"       - {c['descripcion'][:45]:45s} {c['estado']:8s} ({fuente})")
        ok += 1
        continue

    try:
        upsert_supabase(contrato, salida, estado)
    except urllib.error.HTTPError as e:
        print(f"  ERROR {etiqueta}: Supabase {e.code} {e.read().decode()[:200]}"); errores += 1; continue
    except KeyError as e:
        print(f"  ERROR {etiqueta}: falta {e} en el entorno"); errores += 1; continue

    entregado = entregar(nombre, {"contrato": contrato["titulo"], "estado": estado,
                                  "dictamen": salida})
    print(f"  OK   {etiqueta}" + ("" if entregado else "  [WARN: dictamen no entregado al volumen]"))
    ok += 1

print(f"=== contratos: {ok} validados, {errores} con problema"
      + ("  (DRY-RUN, no se escribió nada)" if DRY else "")
      + " === (aprobar/firmar: SOLO humano)")
sys.exit(1 if errores else 0)
