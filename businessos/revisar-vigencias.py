#!/usr/bin/env python3
"""Cron de vigencias del grafo (Fase 3): un grafo desactualizado miente con certeza.

Consulta GET /salud-conocimiento del grafo y:
  1. imprime el reporte (para el log del cron / Telegram via negocio);
  2. deja el snapshot en el volumen de negocio (/opt/data/workspace/vigencias.json)
     para que el agente LO LEA y lo incluya en el cierre/reportes (patrón host-job:
     el agente no consulta nada con secretos; aquí ni secretos hay, pero el snapshot
     evita que cada reporte re-consulte y da una marca de tiempo auditable);
  3. sale con código 1 si hay reglas VENCIDAS aún sirviendo (eso es mentir con
     certeza: hay que reseedear) — así el cron alerta.

Los montos con `verificar:true` NO son error (el seed nace pendiente de cotejo
DOF/DIAN): se listan para que Elisa/contador los vayan cerrando.

Uso (servidor, grafo arriba):
    python3 businessos/revisar-vigencias.py            # reporte + snapshot
    python3 businessos/revisar-vigencias.py --dry-run  # solo reporte, sin escribir
Cron sugerido (lunes 8:00): 0 8 * * 1 python3 /root/businessos/revisar-vigencias.py
"""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

GRAFO = os.environ.get("GRAFO_URL", "http://127.0.0.1:3000").rstrip("/")
CONTAINER = "hermes-negocio"
SNAPSHOT = "/opt/data/workspace/vigencias.json"
DRY = "--dry-run" in sys.argv[1:]

try:
    with urllib.request.urlopen(f"{GRAFO}/salud-conocimiento", timeout=30) as r:
        salud = json.loads(r.read().decode())
except (urllib.error.URLError, OSError) as e:
    print(f"ABORT: grafo no responde en {GRAFO} ({e}). ¿docker compose up -d grafo?")
    sys.exit(1)

print(f"=== salud del conocimiento ({salud['generado']}) ===")
print(f"reglas: {salud['reglas_total']}  | ambitos: "
      + ", ".join(f"{a['jurisdiccion']}/{a['dimension']}={a['reglas']}" for a in salud["ambitos"]))
for sv in salud["source_versions"]:
    print(f"seed: {sv}")

vencidas = salud["reglas_vencidas"]
if vencidas:
    print(f"\n!! {len(vencidas)} reglas VENCIDAS sirviendo (reseedear el grafo):")
    for v in vencidas:
        print(f"   - {v['clave']} (vigente_hasta {v['vigente_hasta']})")

pend = salud["verificar_pendientes"]
if pend:
    print(f"\n{len(pend)} montos/topes pendientes de cotejo contra fuente oficial:")
    for p in pend:
        print(f"   - {p['regla']} ({p['cita']})" + (f" [{p['categoria']}]" if p["categoria"] else ""))

if not DRY:
    # Snapshot al volumen de negocio (mismo mecanismo que presupuesto.json).
    res = subprocess.run(
        ["docker", "exec", "-i", "-u", "hermes", CONTAINER, "sh", "-c", f"cat > {SNAPSHOT}"],
        input=json.dumps(salud, ensure_ascii=False), capture_output=True, text=True)
    if res.returncode == 0:
        print(f"\nsnapshot -> {CONTAINER}:{SNAPSHOT}")
    else:
        print(f"\nWARN: no se pudo escribir el snapshot ({res.stderr.strip()[:120]})")

sys.exit(1 if vencidas else 0)
