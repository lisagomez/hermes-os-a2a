#!/usr/bin/env python3
"""Evaluación de deducibilidad de facturas `pendiente` -> veredicto via grafo (Fase 2).

Cierra el ciclo abierto desde Fase 0: `facturas.deducibilidad_estado` nace 'pendiente'
y NADIE lo determinaba. Este host-job (patrón host-job: los agentes Hermes no tienen
secretos, ver CLAUDE.md 2026-06-30):

    lee facturas pendientes de Supabase (service_role)
      -> POST http://grafo:3000/evaluaciones (fecha de la factura = vigencia)
      -> escribe deducibilidad_estado + deducibilidad_detalle en la fila.

El veredicto por concepto llega CON fuente citada (LISR/CFF/SAT), banderas rojas,
checklist y disclaimer; todo queda en `deducibilidad_detalle` para que las verticales
lo lean sin secretos ni re-cómputo. Lo 'dudoso' lo escala el agente a Elisa; este job
no decide nada: transcribe lo que el grafo dictamina.

Uso (en el Droplet, con grafo arriba; GRAFO_URL default http://127.0.0.1:3000):
    source businessos/.env            # SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
    python3 businessos/evaluar-facturas.py            # evalúa y escribe veredictos
    python3 businessos/evaluar-facturas.py --dry-run  # evalúa y muestra, sin escribir

Idempotente: solo toca filas 'pendiente'; re-correrlo no re-evalúa lo ya dictaminado.
(Para re-evaluar tras actualizar reglas: regresar la fila a 'pendiente' a mano.)
"""
import json
import os
import sys
import urllib.error
import urllib.request

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
GRAFO = os.environ.get("GRAFO_URL", "http://127.0.0.1:3000").rstrip("/")
DRY = "--dry-run" in sys.argv[1:]

SB_HEADERS = {"apikey": KEY, "Authorization": "Bearer " + KEY,
              "Content-Type": "application/json"}


def http(url, data=None, headers=None, method=None):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode()


def pendientes():
    q = f"{URL}/rest/v1/facturas?deducibilidad_estado=eq.pendiente&select=id,cliente,folio,fecha,conceptos&order=id"
    return json.loads(http(q, headers=SB_HEADERS))


def evaluar(factura):
    conceptos = [
        {"descripcion": str(c.get("descripcion", "")).strip() or "(sin descripcion)",
         "importe": c.get("importe")}
        for c in (factura.get("conceptos") or [])
    ]
    if not conceptos:
        # Sin conceptos no hay qué clasificar: el grafo no adivina y este job tampoco.
        return None, "factura sin conceptos (no hay qué evaluar)"
    body = json.dumps({"contexto": {"fecha": factura["fecha"]}, "conceptos": conceptos})
    try:
        salida = json.loads(http(f"{GRAFO}/evaluaciones", data=body.encode(),
                                 headers={"Content-Type": "application/json"}))
    except urllib.error.HTTPError as e:
        return None, f"grafo respondió {e.code}: {e.read().decode()[:200]}"
    return salida, None


def escribir_veredicto(factura_id, salida):
    http(f"{URL}/rest/v1/facturas?id=eq.{factura_id}",
         data=json.dumps({
             "deducibilidad_estado": salida["estado"],
             "deducibilidad_detalle": salida,   # veredicto+fuentes+banderas+checklist+disclaimer
         }).encode(),
         headers={**SB_HEADERS, "Prefer": "return=minimal"}, method="PATCH")


# Salud del grafo antes de tocar nada (mensaje claro si no está arriba).
try:
    salud = json.loads(http(f"{GRAFO}/health"))
    if salud.get("db") != "ok" or not salud.get("reglas"):
        print(f"ABORT: grafo vivo pero sin base de conocimiento (health: {salud}). "
              "¿Volumen de grafo-db seedeado?")
        sys.exit(1)
except (urllib.error.URLError, OSError) as e:
    print(f"ABORT: grafo no responde en {GRAFO} ({e}). ¿docker compose up -d grafo?")
    sys.exit(1)

facturas = pendientes()
if not facturas:
    print("No hay facturas pendientes de deducibilidad.")
    sys.exit(0)

ok = errores = 0
for f in facturas:
    etiqueta = f"{f['cliente']} / {f['folio']} ({f['fecha']})"
    salida, err = evaluar(f)
    if err:
        print(f"  SKIP {etiqueta}: {err}"); errores += 1; continue
    n_flags = len(salida.get("banderas_rojas", []))
    resumen = f"{etiqueta} -> {salida['estado']}  [{n_flags} banderas]"
    if DRY:
        for c in salida["conceptos"]:
            fuente = c["fuente"]["cita"] if c.get("fuente") else "sin regla aplicable"
            print(f"  DRY  {etiqueta} :: {c['descripcion'][:40]:40s} {c['estado']:12s} ({fuente})")
        ok += 1
        continue
    try:
        escribir_veredicto(f["id"], salida)
    except urllib.error.HTTPError as e:
        print(f"  ERROR {resumen}: {e.code} {e.read().decode()[:200]}"); errores += 1; continue
    print(f"  OK   {resumen}"); ok += 1

print(f"=== deducibilidad: {ok} evaluadas, {errores} con problema"
      + ("  (DRY-RUN, no se escribió nada)" if DRY else "") + " ===")
sys.exit(1 if errores else 0)
