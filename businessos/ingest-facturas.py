#!/usr/bin/env python3
"""Ingesta de facturas (vertical clientes) -> tabla Supabase `facturas`.

Cierra la DEUDA de Fase 1: el agente `hermes-clientes` NO tiene el service_role
(Hermes scrubbea los secretos del sandbox por diseño), así que no puede escribir a
Supabase. Patrón host-job (espejo invertido de `ingest-token-usage.py`):

    agente extrae la factura  ->  deja un JSON en el volumen  ->  ESTE job lo lee y
    hace UPSERT a `facturas` con el service_role  ->  mueve el JSON a procesadas.

El agente escribe cada factura ya extraída y confirmada en:
    /opt/data/workspace/facturas_pending/<lo-que-sea>.json
con la forma (deducibilidad la decide el grafo en Fase futura, aquí queda 'pendiente'):
    {
      "cliente": "ACME S.A.",
      "folio": "A-1024",
      "fecha": "2026-07-01",
      "conceptos": [{"descripcion": "Consultoría", "cantidad": 1, "importe": 1000.00}],
      "subtotal": 1000.00,
      "impuestos": 160.00,
      "total": 1160.00
    }

Uso:
    source businessos/.env            # SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
    python3 businessos/ingest-facturas.py            # procesa la bandeja de clientes
    python3 businessos/ingest-facturas.py --dry-run  # valida y muestra, sin escribir

Idempotente: `facturas` tiene unique (cliente, folio); reprocesar la misma factura
hace merge (no duplica). Solo se mueve a procesadas lo que se subió con éxito.
Requiere Docker + el contenedor `hermes-clientes` arriba (no accesible sin runtime).
"""
import os, sys, json, subprocess, urllib.request, urllib.error

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DRY = "--dry-run" in sys.argv[1:]

CONTAINER = "hermes-clientes"
PENDING = "/opt/data/workspace/facturas_pending"
DONE = "/opt/data/workspace/facturas_procesadas"

REQUIRED = ("cliente", "folio", "fecha", "subtotal", "impuestos", "total")


def dexec(cmd, inp=None):
    """Corre un comando dentro del contenedor de clientes."""
    return subprocess.run(["docker", "exec", "-i", "-u", "hermes", CONTAINER, "sh", "-c", cmd],
                          input=inp, capture_output=True, text=True)


def list_pending():
    out = dexec(f"ls -1 {PENDING}/*.json 2>/dev/null").stdout
    return [p for p in out.splitlines() if p.strip()]


def read_file(path):
    return dexec(f"cat {path}").stdout


def valid(f):
    """Devuelve (fila_normalizada, error). Nunca adivina: si falta un campo, lo rechaza."""
    faltan = [k for k in REQUIRED if f.get(k) in (None, "")]
    if faltan:
        return None, "faltan campos: " + ", ".join(faltan)
    try:
        sub, imp, tot = float(f["subtotal"]), float(f["impuestos"]), float(f["total"])
    except (TypeError, ValueError):
        return None, "subtotal/impuestos/total no son números"
    if min(sub, imp, tot) < 0:
        return None, "montos negativos"
    conceptos = f.get("conceptos", [])
    if not isinstance(conceptos, list):
        return None, "conceptos debe ser una lista"
    fila = {
        "cliente": str(f["cliente"]).strip(),
        "folio": str(f["folio"]).strip(),
        "fecha": str(f["fecha"]).strip(),
        "conceptos": conceptos,
        "subtotal": round(sub, 2),
        "impuestos": round(imp, 2),
        "total": round(tot, 2),
        # deducibilidad_estado se deja en el DEFAULT 'pendiente' (lo decide el grafo, Fase futura).
    }
    # Chequeo suave de cuadre: avisa, no bloquea (el humano/grafo revisa después).
    warn = "" if abs(sub + imp - tot) < 0.01 else f"  [ojo: subtotal+impuestos != total]"
    return (fila, warn), None


def upsert(fila):
    req = urllib.request.Request(
        f"{URL}/rest/v1/facturas?on_conflict=cliente,folio",
        data=json.dumps(fila).encode(),
        headers={"apikey": KEY, "Authorization": "Bearer " + KEY,
                 "Content-Type": "application/json",
                 "Prefer": "resolution=merge-duplicates,return=minimal"})
    urllib.request.urlopen(req, timeout=30)


paths = list_pending()
if not paths:
    print(f"No hay facturas en {PENDING} (contenedor {CONTAINER}).")
    sys.exit(0)

dexec(f"mkdir -p {DONE}")
ok = errores = 0
for path in paths:
    raw = read_file(path)
    try:
        f = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"  SKIP {path}: JSON inválido ({e})"); errores += 1; continue

    res, err = valid(f)
    if err:
        print(f"  SKIP {path}: {err}"); errores += 1; continue

    fila, warn = res
    etiqueta = f"{fila['cliente']} / {fila['folio']}  ${fila['total']:.2f}{warn}"
    if DRY:
        print(f"  DRY  {etiqueta}"); ok += 1; continue
    try:
        upsert(fila)
    except urllib.error.HTTPError as e:
        print(f"  ERROR {etiqueta}: {e.code} {e.read().decode()[:200]}"); errores += 1; continue
    # Solo tras subir con éxito: mover a procesadas (deja rastro, permite re-correr limpio).
    dexec(f"mv {path} {DONE}/")
    print(f"  OK   {etiqueta}"); ok += 1

print(f"=== facturas: {ok} procesadas, {errores} con problema"
      + ("  (DRY-RUN, no se escribió nada)" if DRY else "") + " ===")
sys.exit(1 if errores else 0)
