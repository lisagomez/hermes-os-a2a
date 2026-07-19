#!/usr/bin/env python3
"""Ingesta de consumo de tokens v2 (PRP-002, Fase 1) -> Supabase `token_usage` + snapshot.

Lee las lineas `API call #` del agent.log de cada contenedor Hermes (loop principal;
las aux no emiten tokens al log todavia), calcula el costo real con tarifas de OpenRouter
(incluida la lectura de cache), agrega por (fecha, vertical, modelo) y escribe via
PostgREST + service_role.

v2 sobre v1 (PRP-002):
  1. CACHE DE PRECIOS en ~/state con fallback: el endpoint de OpenRouter puede fallar a
     las 03:10; se cachea el catalogo (con fecha) y se reusa el ultimo bueno si falla.
  2. EXIT RUIDOSO: si el log tiene lineas 'API call #' pero NINGUNA matchea el regex,
     sale != 0 (un upgrade de Hermes que cambie el formato ya no falla EN SILENCIO —
     antes imprimia "No hay lineas" y salia 0, y el cron no avisaba).
  3. BUFFER del agent.log en el host antes de parsear (mitiga rotacion del log).
  4. SNAPSHOT enriquecido: pct_cache y costo_promedio_por_turno por modelo, y
     pct_no_observado (reconciliacion mensual vs el gasto real de OpenRouter).

Uso:
    source businessos/.env            # SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (+ OPENROUTER_API_KEY)
    python3 businessos/ingest-token-usage.py [YYYY-MM-DD]   # default: hoy (UTC)

Idempotente: re-correr el mismo dia recalcula desde el log y reemplaza SOLO el agregado
diario de estas verticales (delete+insert; indice unico PARCIAL desde 2026-07-11, no admite
on_conflict — ver supabase-fix-token-ledger.sql). Las filas por-tarea del trio (task_id set)
NUNCA se tocan. Corre por cron en el server.
"""
import os, re, json, subprocess, urllib.request, urllib.error, datetime, sys

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
OR_KEY = os.environ.get("OPENROUTER_API_KEY", "")
DATE = sys.argv[1] if len(sys.argv) > 1 else datetime.datetime.now(datetime.timezone.utc).date().isoformat()
MES = DATE[:7]
CONTAINERS = {"hermes-personal": "personal", "hermes-negocio": "negocio", "hermes-clientes": "clientes"}
PRESUPUESTO = 30.0
STATE = os.environ.get("HERMES_STATE", os.path.expanduser("~/state"))
PRICE_CACHE = os.path.join(STATE, "openrouter-models.json")
OR_LEDGER = os.path.join(STATE, "or-usage-ledger.json")
# Umbral de alerta de caché. OJO: pct_cache es AGREGADO del día (incluye las 1as
# llamadas sin caché de cada conversación), no el mejor-caso por-llamada (97%). El
# baseline real medido el 2026-07-19 es ~45% (haiku 44%, gemini-lite 48%), así que
# el umbral detecta un COLAPSO (cache rota, tipo nemotron), no la varianza normal.
PCT_CACHE_MIN = float(os.environ.get("PCT_CACHE_MIN", "25"))

LINE = re.compile(r"API call #\d+: model=(\S+) provider=\S+ in=(\d+) out=(\d+) total=\d+ "
                  r"latency=[\d.]+s(?: cache=(\d+)/\d+)?")


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")


def http_json(url, headers=None, timeout=30):
    # UA curl/8.0: Cloudflare bloquea el UA de urllib (error 1010).
    req = urllib.request.Request(url, headers={"User-Agent": "curl/8.0", **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def pricing():
    """(precios, fuente). Intenta OpenRouter; cachea; si falla, usa el ultimo bueno."""
    os.makedirs(STATE, exist_ok=True)
    try:
        data = http_json("https://openrouter.ai/api/v1/models")["data"]
        with open(PRICE_CACHE, "w") as f:
            json.dump({"fetched_at": now_iso(), "data": data}, f)
        fuente = "openrouter"
    except Exception as e:  # noqa: BLE001 — cualquier fallo de red/parse -> fallback
        try:
            cached = json.load(open(PRICE_CACHE))
            data = cached["data"]
            fuente = f"cache({cached.get('fetched_at', '?')})"
            print(f"AVISO: precios OpenRouter fallaron ({type(e).__name__}); uso {fuente}", file=sys.stderr)
        except Exception:
            print("ERROR: sin precios de OpenRouter y sin cache local", file=sys.stderr)
            sys.exit(1)
    pm = {m["id"]: (float((m.get("pricing") or {}).get("prompt", 0) or 0),
                    float((m.get("pricing") or {}).get("completion", 0) or 0),
                    float((m.get("pricing") or {}).get("input_cache_read", 0) or 0)) for m in data}
    return pm, fuente


def or_month_spend():
    """Gasto de OpenRouter del MES via delta de total_usage (lifetime) en ~/state.

    OpenRouter no expone un total mensual limpio; /credits da total_usage LIFETIME.
    Guardamos el primer total_usage visto en el mes y el gasto del mes ~= actual - inicial.
    Devuelve (usd|None, nota). None si no hay key/endpoint (se marca pendiente, no se inventa).
    """
    if not OR_KEY:
        return None, "sin OPENROUTER_API_KEY en el job"
    try:
        d = http_json("https://openrouter.ai/api/v1/credits",
                      headers={"Authorization": "Bearer " + OR_KEY}).get("data", {})
        total_usage = float(d.get("total_usage", 0) or 0)
    except Exception as e:  # noqa: BLE001
        return None, f"endpoint /credits fallo ({type(e).__name__})"
    try:
        led = json.load(open(OR_LEDGER))
    except Exception:
        led = {}
    ancla = led.get(MES, {}).get("inicio_total_usage")
    if ancla is None:
        led.setdefault(MES, {})["inicio_total_usage"] = total_usage
        led[MES]["primer_visto"] = now_iso()
    led.setdefault(MES, {})["ultimo_total_usage"] = total_usage
    led[MES]["ultimo_visto"] = now_iso()
    try:
        os.makedirs(STATE, exist_ok=True)
        with open(OR_LEDGER, "w") as f:
            json.dump(led, f, indent=2)
    except Exception:
        pass
    if ancla is None:
        return None, "primer dia del mes con ancla; brecha disponible el proximo run"
    return round(total_usage - ancla, 6), f"delta lifetime desde {led[MES].get('primer_visto', '?')}"


def observed_month_total():
    """Suma de costo_usd de token_usage para el MES (todas las verticales, incl. trio)."""
    try:
        rows = http_json(
            f"{URL}/rest/v1/token_usage?fecha=gte.{MES}-01&fecha=lte.{MES}-31&select=costo_usd",
            headers={"apikey": KEY, "Authorization": "Bearer " + KEY})
        return round(sum(float(r.get("costo_usd", 0) or 0) for r in rows), 6)
    except Exception:
        return None


PM, PRICE_SRC = pricing()

# --- parseo con buffer al host + conteo para exit ruidoso ---
os.makedirs(STATE, exist_ok=True)
agg = {}          # (vert, model) -> [tin, tout, cost, cached, calls]
raw_api_lines = 0  # lineas 'API call #' del dia ANTES del regex
matched = 0
for cont, vert in CONTAINERS.items():
    out = subprocess.run(["docker", "exec", cont, "sh", "-c",
                          f"grep 'API call #' /opt/data/logs/agent.log 2>/dev/null | grep '{DATE}'"],
                         capture_output=True, text=True).stdout
    # buffer al host (mitiga rotacion: si el log rota tras esto, ya tenemos el dia)
    try:
        with open(os.path.join(STATE, f"agentlog-{vert}-{DATE}.txt"), "w") as f:
            f.write(out)
    except Exception:
        pass
    for ln in out.splitlines():
        if "API call #" not in ln:
            continue
        raw_api_lines += 1
        mo = LINE.search(ln)
        if not mo:
            continue
        matched += 1
        model = mo.group(1).split(":")[0]  # normaliza :nitro/:floor/:free
        tin, tout, cached = int(mo.group(2)), int(mo.group(3)), int(mo.group(4) or 0)
        pin, pout, pcache = PM.get(model, (0.0, 0.0, 0.0))
        cost = max(tin - cached, 0) * pin + cached * pcache + tout * pout
        a = agg.setdefault((vert, model), [0, 0, 0.0, 0, 0])
        a[0] += tin; a[1] += tout; a[2] += cost; a[3] += cached; a[4] += 1

# EXIT RUIDOSO: contenido presente pero 0 matches => el parser esta roto (formato cambio).
if raw_api_lines > 0 and matched == 0:
    print(f"ERROR: {raw_api_lines} lineas 'API call #' para {DATE} pero 0 matchearon el regex.",
          file=sys.stderr)
    print("       ¿Cambio el formato del agent.log de Hermes? El parser esta ROTO — revisar LINE.",
          file=sys.stderr)
    sys.exit(2)

if not agg:
    print(f"No hay lineas 'API call #' para {DATE} (sin actividad o log ya rotado).")
    sys.exit(0)

rows = [{"fecha": DATE, "vertical": v, "modelo": m,
         "tokens_in": a[0], "tokens_out": a[1], "costo_usd": round(a[2], 6)}
        for (v, m), a in sorted(agg.items())]

print(f"=== {DATE} (precios: {PRICE_SRC}) ===")
for r in rows:
    print(f"  {r['vertical']:<9}{r['modelo']:<40} in={r['tokens_in']:>7} out={r['tokens_out']:>5} ${r['costo_usd']:.5f}")
print(f"  TOTAL ${sum(r['costo_usd'] for r in rows):.5f}")

# Idempotencia por delete+insert del dia (2026-07-11): indice unico PARCIAL
# (where task_id is null). El delete filtra task_id=is.null Y estas verticales:
# JAMAS toca el ledger por-tarea del trio (lo escribe el motor del Ejecutor).
HDRS = {"apikey": KEY, "Authorization": "Bearer " + KEY,
        "Content-Type": "application/json", "Prefer": "return=minimal"}
try:
    urllib.request.urlopen(urllib.request.Request(
        f"{URL}/rest/v1/token_usage?fecha=eq.{DATE}&task_id=is.null"
        "&vertical=in.(personal,negocio,clientes)",
        headers={"User-Agent": "curl/8.0", **HDRS}, method="DELETE"), timeout=30)
    urllib.request.urlopen(urllib.request.Request(
        f"{URL}/rest/v1/token_usage", data=json.dumps(rows).encode(),
        headers={"User-Agent": "curl/8.0", **HDRS}), timeout=30)
    print("INGESTA ok (%d filas, delete+insert %s)" % (len(rows), DATE))
except urllib.error.HTTPError as e:
    print("INGESTA ERROR", e.code, e.read().decode()[:300], file=sys.stderr)
    sys.exit(1)

# --- Snapshot v2 para el skill budget-report (dato-en-SOUL: el agente LEE, no toca secretos) ---
porv = {}
por_modelo = {}
for (v, m), a in agg.items():
    porv[v] = porv.get(v, 0.0) + a[2]
    pm_ = por_modelo.setdefault(m, [0, 0, 0.0, 0, 0])
    pm_[0] += a[0]; pm_[1] += a[1]; pm_[2] += a[2]; pm_[3] += a[3]; pm_[4] += a[4]
total = round(sum(porv.values()), 4)

modelos = {}
peor_cache = None  # (modelo, pct) del modelo con mas turnos y cache bajo umbral
for m, a in sorted(por_modelo.items(), key=lambda x: -x[1][2]):
    pct_cache = round(100 * a[3] / a[0], 1) if a[0] else 0.0
    modelos[m] = {
        "costo_usd": round(a[2], 5),
        "turnos": a[4],
        "costo_promedio_por_turno": round(a[2] / a[4], 6) if a[4] else 0.0,
        "pct_cache": pct_cache,
    }
    if a[4] >= 5 and pct_cache < PCT_CACHE_MIN and (peor_cache is None or a[4] > peor_cache[2]):
        peor_cache = (m, pct_cache, a[4])

or_gasto, or_nota = or_month_spend()
obs_mes = observed_month_total()
if or_gasto and or_gasto > 0 and obs_mes is not None:
    pct_no_obs = round(max(or_gasto - obs_mes, 0) / or_gasto * 100, 1)
    no_obs_nota = f"OR mes ${or_gasto:.4f} vs observado ${obs_mes:.4f} ({or_nota})"
else:
    pct_no_obs = None
    no_obs_nota = f"pendiente: {or_nota}"

snapshot = {
    "mes": MES,
    "generado": now_iso(),
    "presupuesto_usd": PRESUPUESTO,
    "costo_total_usd": total,
    "pct_presupuesto": round(total / PRESUPUESTO * 100, 1),
    "alerta_80pct": total > PRESUPUESTO * 0.8,
    "por_vertical": {v: round(c, 4) for v, c in sorted(porv.items(), key=lambda x: -x[1])},
    "por_modelo": modelos,
    "pct_no_observado": pct_no_obs,
    "pct_no_observado_nota": no_obs_nota,
    "precios_fuente": PRICE_SRC,
    "cache_bajo_umbral": ({"modelo": peor_cache[0], "pct_cache": peor_cache[1],
                           "umbral": PCT_CACHE_MIN} if peor_cache else None),
    "nota": "Snapshot del dia 'generado'. por_modelo/pct_cache del loop principal (aux no emiten al log).",
}
snap_json = json.dumps(snapshot, ensure_ascii=False, indent=2)
r = subprocess.run(["docker", "exec", "-i", "-u", "hermes", "hermes-negocio",
                    "sh", "-c", "mkdir -p /opt/data/workspace && cat > /opt/data/workspace/presupuesto.json"],
                   input=snap_json, text=True)
print("Snapshot v2 a negocio:/opt/data/workspace/presupuesto.json",
      "ok" if r.returncode == 0 else "FALLO")
