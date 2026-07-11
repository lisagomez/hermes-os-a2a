#!/usr/bin/env python3
"""Ingesta de consumo de tokens (Fase 1) -> tabla Supabase `token_usage`.

Lee las líneas `API call #` del agent.log de cada contenedor Hermes (el loop
principal; las llamadas auxiliares no emiten tokens en ese log todavía), calcula
el costo real con tarifas de OpenRouter (incluida la lectura de caché), agrega por
(fecha, vertical, modelo) y escribe vía PostgREST + service_role.

Uso:
    source businessos/.env            # SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
    python3 businessos/ingest-token-usage.py [YYYY-MM-DD]   # default: hoy (UTC)

Idempotente: re-correr el mismo día recalcula desde el log y reemplaza SOLO las
filas del agregado diario de estas verticales (delete+insert; el índice único es
parcial desde 2026-07-11 y no admite on_conflict — ver supabase-fix-token-ledger.sql).
Las filas por-tarea del trío (task_id set) nunca se tocan. Requiere que el agent.log
aún contenga ese día (si rota, re-correr pierde lo anterior). Corre por cron en el server.
"""
import os, re, json, subprocess, urllib.request, datetime, sys

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DATE = sys.argv[1] if len(sys.argv) > 1 else datetime.datetime.now(datetime.timezone.utc).date().isoformat()
CONTAINERS = {"hermes-personal": "personal", "hermes-negocio": "negocio", "hermes-clientes": "clientes"}

LINE = re.compile(r"API call #\d+: model=(\S+) provider=\S+ in=(\d+) out=(\d+) total=\d+ "
                  r"latency=[\d.]+s(?: cache=(\d+)/\d+)?")

def pricing():
    d = json.load(urllib.request.urlopen("https://openrouter.ai/api/v1/models", timeout=30))["data"]
    return {m["id"]: (float((m.get("pricing") or {}).get("prompt", 0) or 0),
                      float((m.get("pricing") or {}).get("completion", 0) or 0),
                      float((m.get("pricing") or {}).get("input_cache_read", 0) or 0)) for m in d}

PM = pricing()
agg = {}
for cont, vert in CONTAINERS.items():
    out = subprocess.run(["docker", "exec", cont, "sh", "-c",
                          f"grep 'API call #' /opt/data/logs/agent.log 2>/dev/null | grep '{DATE}'"],
                         capture_output=True, text=True).stdout
    for ln in out.splitlines():
        mo = LINE.search(ln)
        if not mo:
            continue
        model = mo.group(1).split(":")[0]  # normaliza :nitro/:floor/:free
        tin, tout, cached = int(mo.group(2)), int(mo.group(3)), int(mo.group(4) or 0)
        pin, pout, pcache = PM.get(model, (0.0, 0.0, 0.0))
        cost = max(tin - cached, 0) * pin + cached * pcache + tout * pout
        a = agg.setdefault((vert, model), [0, 0, 0.0])
        a[0] += tin; a[1] += tout; a[2] += cost

if not agg:
    print("No hay líneas 'API call' para", DATE)
    sys.exit(0)

rows = [{"fecha": DATE, "vertical": v, "modelo": m,
         "tokens_in": a[0], "tokens_out": a[1], "costo_usd": round(a[2], 6)}
        for (v, m), a in sorted(agg.items())]

print(f"=== {DATE} ===")
for r in rows:
    print(f"  {r['vertical']:<9}{r['modelo']:<40} in={r['tokens_in']:>7} out={r['tokens_out']:>5} ${r['costo_usd']:.5f}")
print(f"  TOTAL ${sum(r['costo_usd'] for r in rows):.5f}")

# Idempotencia por delete+insert del dia (2026-07-11): el indice unico es ahora
# PARCIAL (where task_id is null; ver supabase-fix-token-ledger.sql) y PostgREST
# no puede inferir on_conflict sobre el. El delete filtra task_id=is.null Y las
# verticales de ESTE job: jamas toca el ledger por-tarea del trio (lo escribe el
# motor del Ejecutor).
HDRS = {"apikey": KEY, "Authorization": "Bearer " + KEY,
        "Content-Type": "application/json", "Prefer": "return=minimal"}
try:
    req = urllib.request.Request(
        f"{URL}/rest/v1/token_usage?fecha=eq.{DATE}&task_id=is.null"
        "&vertical=in.(personal,negocio,clientes)",
        headers=HDRS, method="DELETE")
    urllib.request.urlopen(req, timeout=30)
    req = urllib.request.Request(
        f"{URL}/rest/v1/token_usage", data=json.dumps(rows).encode(), headers=HDRS)
    urllib.request.urlopen(req, timeout=30)
    print("INGESTA ok (%d filas, delete+insert %s)" % (len(rows), DATE))
except urllib.error.HTTPError as e:
    print("INGESTA ERROR", e.code, e.read().decode()[:300]); sys.exit(1)

# --- Snapshot de presupuesto para el skill budget-report ---
# Hermes scrubbea los secretos del sandbox del agente: NO puede usar el service_role.
# Por eso este job de confianza (que SÍ tiene la credencial) deja el dato ya calculado
# dentro del volumen de negocio, y el skill solo lo LEE (el agente nunca toca el secreto).
MES = DATE[:7]
PRESUPUESTO = 30.0
porv = {}
for (v, m), a in agg.items():
    porv[v] = porv.get(v, 0.0) + a[2]
total = round(sum(porv.values()), 4)
snapshot = {
    "mes": MES,
    "generado": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ"),
    "presupuesto_usd": PRESUPUESTO,
    "costo_total_usd": total,
    "pct_presupuesto": round(total / PRESUPUESTO * 100, 1),
    "alerta_80pct": total > PRESUPUESTO * 0.8,
    "por_vertical": {v: round(c, 4) for v, c in sorted(porv.items(), key=lambda x: -x[1])},
    "nota": "Solo loop principal (las aux aun no emiten tokens al log). Dato al corte de 'generado'.",
}
snap_json = json.dumps(snapshot, ensure_ascii=False, indent=2)
r = subprocess.run(["docker", "exec", "-i", "-u", "hermes", "hermes-negocio",
                    "sh", "-c", "mkdir -p /opt/data/workspace && cat > /opt/data/workspace/presupuesto.json"],
                   input=snap_json, text=True)
print("Snapshot a negocio:/opt/data/workspace/presupuesto.json",
      "ok" if r.returncode == 0 else "FALLO")
