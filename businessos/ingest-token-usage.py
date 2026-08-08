#!/usr/bin/env python3
"""Ingesta de consumo de tokens v3 (Fase 1 revisitada) -> Supabase `token_usage` + snapshot.

Lee las lineas `API call #` del agent.log de cada contenedor Hermes (loop principal;
las aux no emiten tokens al log todavia), calcula el costo real con tarifas de OpenRouter
(incluida la lectura de cache), agrega por (fecha, vertical, modelo) y escribe via
PostgREST + service_role.

v3 sobre v2 (costeo ENFOCADO POR TAREA, 2026-07-29):
  1. RECALCULO PERSISTENTE del ledger por-tarea (task_id set) del MES: los modelos
     MAL TARIFADOS por el CLI (glm via z.ai: tarifa Anthropic -> costo 0 o erroneo,
     gotcha 2026-07-04) se recalculan SIEMPRE de tokens x tarifa OpenRouter y se
     escriben de vuelta (PATCH por id); los demas modelos solo si costo=0. Sin precio
     en el catalogo -> el hueco SE DECLARA, jamas se inventa. Antes esta correccion
     vivia solo en memoria en cosechar-activos.py: Mission Control, el corte de
     presupuesto del enjambre y el total mensual veian el numero inflado (~12x:
     $27 nominales vs ~$2.3 reales en julio 2026).
  2. SNAPSHOT MENSUAL DE VERDAD: `costo_total_usd` ahora es el gasto del MES desde
     token_usage (incluye el trio), no el del dia. FIX del bug dia/mes: la alerta 80%
     y el SOUL comparaban el gasto de UN dia contra el presupuesto MENSUAL de $30
     (la alerta solo habria disparado con $24 en un solo dia). `por_vertical` pasa a
     ser mensual; el detalle del dia queda en `costo_hoy_usd` y `por_modelo`.
  3. Bloque `por_tarea_mes` en el snapshot: top de tareas del trio por costo del mes
     (para que negocio responda "que tarea costo que" desde el SOUL).
  4. `--dry-run`: muestra ingesta+recalculo sin escribir nada.
  5. El recalculo y el snapshot corren AUNQUE el log del dia venga vacio (antes un
     dia sin lineas abortaba todo; el mes y el ledger del trio no dependen del log).

v2 (PRP-002): cache de precios en ~/state con fallback, exit ruidoso si el regex no
matchea, buffer del agent.log al host, pct_cache y reconciliacion vs OpenRouter.

Uso:
    source businessos/.env            # SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (+ OPENROUTER_API_KEY)
    python3 businessos/ingest-token-usage.py [YYYY-MM-DD] [--dry-run]

Idempotente: re-correr el mismo dia recalcula desde el log y reemplaza SOLO el agregado
diario de estas verticales (delete+insert; indice unico PARCIAL desde 2026-07-11, no admite
on_conflict — ver migrations/supabase-fix-token-ledger.sql). Las filas por-tarea del trio (task_id set)
NUNCA se borran; solo se les corrige costo_usd (recalculo determinista: mismo insumo,
mismo resultado). El recalculo se acota al MES corriente: los meses cerrados no se
reescriben aunque cambie la tarifa. Corre por cron en el server.
"""
import os, re, json, subprocess, urllib.request, urllib.error, datetime, sys

URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
OR_KEY = os.environ.get("OPENROUTER_API_KEY", "")
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

# Modelos cuyo costo del CLI NO es fiable (substring, case-insensitive): el motor del
# Ejecutor tarifica con precios Anthropic aunque corra contra z.ai (gotcha 2026-07-04)
# -> para estos, el costo del ledger se recalcula SIEMPRE de tokens x tarifa OpenRouter.
MAL_TARIFADOS = ("glm",)
# Tope de tareas listadas en el snapshot (el SOUL no es un dashboard).
POR_TAREA_TOP = 8

LINE = re.compile(r"API call #\d+: model=(\S+) provider=\S+ in=(\d+) out=(\d+) total=\d+ "
                  r"latency=[\d.]+s(?: cache=(\d+)/\d+)?")


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")


def mes_rango(mes):
    """(primer_dia, primer_dia_del_mes_siguiente) para filtrar gte/lt sin fechas
    invalidas ('2026-02-31' revienta el parser de Postgres — bug latente de v2)."""
    y, m = int(mes[:4]), int(mes[5:7])
    sig = f"{y + 1}-01-01" if m == 12 else f"{y}-{m + 1:02d}-01"
    return f"{mes}-01", sig


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


def match_precio(modelo, precios):
    """Id de OpenRouter cuyo nombre contenga el modelo del ledger, o None.

    El motor escribe nombres pelados ('glm-5.2', 'claude-opus-4-8[1m]'); OpenRouter
    usa 'vendor/nombre' con puntos ('z-ai/glm-5.2', 'anthropic/claude-opus-4.8').
    Se intenta el nombre tal cual (sin sufijo [contexto] ni :variante) y con el
    '-X-Y' final convertido a '-X.Y'. Sin match -> None (el hueco se declara)."""
    base = (modelo or "").lower().split("[")[0].split(":")[0].strip()
    if not base:
        return None
    for cand in (base, re.sub(r"-(\d+)-(\d+)$", r"-\1.\2", base)):
        m = next((k for k in precios if cand in k.lower()), None)
        if m:
            return m
    return None


def recalcular_ledger_tarea(filas, precios):
    """Que filas por-tarea necesitan costo nuevo. Devuelve (cambios, sin_precio):
    cambios = [(id, costo_nuevo)], sin_precio = filas con tokens y costo 0 cuyo
    modelo no esta en el catalogo (quedan declaradas, no inventadas).

    Regla (gotcha GLM 2026-07-04): modelo MAL_TARIFADO -> recalcular SIEMPRE
    (el costo del CLI es tarifa Anthropic, erroneo contra z.ai); otros modelos ->
    solo si costo=0 (el CLI tarifa bien lo de Anthropic; 0 = corrida muerta a media
    faena, filas_parciales). Determinista e idempotente: re-correr con el mismo
    catalogo no produce cambios nuevos. Aproximacion declarada: tokens_in sin
    desglose de cache (el ledger no lo trae) a precio pleno de prompt."""
    cambios, sin_precio = [], 0
    for f in filas:
        tin, tout = int(f.get("tokens_in") or 0), int(f.get("tokens_out") or 0)
        costo = float(f.get("costo_usd") or 0)
        modelo = f.get("modelo") or ""
        mal = any(s in modelo.lower() for s in MAL_TARIFADOS)
        if not mal and costo > 0:
            continue                      # tarifa fiable del CLI: no se toca
        if not (tin or tout):
            continue                      # sin tokens no hay que recalcular
        origen = match_precio(modelo, precios)
        if origen is None:
            if costo == 0:
                sin_precio += 1
            continue
        pin, pout = precios[origen][0], precios[origen][1]
        nuevo = round(tin * pin + tout * pout, 6)
        if abs(nuevo - costo) > 1e-6:
            cambios.append((f["id"], nuevo))
    return cambios, sin_precio


def resumen_por_tarea(filas, top=POR_TAREA_TOP):
    """Bloque por-tarea del snapshot desde las filas del mes (post-recalculo).
    Top N por costo + totales; los huecos (tokens sin costo) se declaran."""
    por_tarea = {}
    sin_costo = 0
    for f in filas:
        t = f.get("task_id")
        c = float(f.get("costo_usd") or 0)
        por_tarea[t] = por_tarea.get(t, 0.0) + c
        if c == 0 and (int(f.get("tokens_in") or 0) or int(f.get("tokens_out") or 0)):
            sin_costo += 1
    orden = sorted(por_tarea.items(), key=lambda x: -x[1])
    return {
        "gasto_usd": round(sum(por_tarea.values()), 4),
        "tareas_con_gasto": len(por_tarea),
        "filas_sin_costo": sin_costo,
        "top": {t: round(c, 4) for t, c in orden[:top]},
    }


def or_month_spend(mes):
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
    ancla = led.get(mes, {}).get("inicio_total_usage")
    if ancla is None:
        led.setdefault(mes, {})["inicio_total_usage"] = total_usage
        led[mes]["primer_visto"] = now_iso()
    led.setdefault(mes, {})["ultimo_total_usage"] = total_usage
    led[mes]["ultimo_visto"] = now_iso()
    try:
        os.makedirs(STATE, exist_ok=True)
        with open(OR_LEDGER, "w") as f:
            json.dump(led, f, indent=2)
    except Exception:
        pass
    if ancla is None:
        return None, "primer dia del mes con ancla; brecha disponible el proximo run"
    return round(total_usage - ancla, 6), f"delta lifetime desde {led[mes].get('primer_visto', '?')}"


def rest_get(path):
    return http_json(f"{URL}/rest/v1/{path}",
                     headers={"apikey": KEY, "Authorization": "Bearer " + KEY})


def rest_write(path, method, data=None):
    hdrs = {"User-Agent": "curl/8.0", "apikey": KEY, "Authorization": "Bearer " + KEY,
            "Content-Type": "application/json", "Prefer": "return=minimal"}
    req = urllib.request.Request(f"{URL}/rest/v1/{path}",
                                 data=json.dumps(data).encode() if data is not None else None,
                                 headers=hdrs, method=method)
    urllib.request.urlopen(req, timeout=30)


def parsear_logs(fecha, pm):
    """agg del dia desde los agent.log (con buffer al host + conteo para exit ruidoso)."""
    os.makedirs(STATE, exist_ok=True)
    agg = {}           # (vert, model) -> [tin, tout, cost, cached, calls]
    raw_api_lines = 0  # lineas 'API call #' del dia ANTES del regex
    matched = 0
    for cont, vert in CONTAINERS.items():
        out = subprocess.run(["docker", "exec", cont, "sh", "-c",
                              f"grep 'API call #' /opt/data/logs/agent.log 2>/dev/null | grep '{fecha}'"],
                             capture_output=True, text=True).stdout
        # buffer al host (mitiga rotacion: si el log rota tras esto, ya tenemos el dia)
        try:
            with open(os.path.join(STATE, f"agentlog-{vert}-{fecha}.txt"), "w") as f:
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
            pin, pout, pcache = pm.get(model, (0.0, 0.0, 0.0))
            cost = max(tin - cached, 0) * pin + cached * pcache + tout * pout
            a = agg.setdefault((vert, model), [0, 0, 0.0, 0, 0])
            a[0] += tin; a[1] += tout; a[2] += cost; a[3] += cached; a[4] += 1
    # EXIT RUIDOSO: contenido presente pero 0 matches => el parser esta roto (formato cambio).
    if raw_api_lines > 0 and matched == 0:
        print(f"ERROR: {raw_api_lines} lineas 'API call #' para {fecha} pero 0 matchearon el regex.",
              file=sys.stderr)
        print("       ¿Cambio el formato del agent.log de Hermes? El parser esta ROTO — revisar LINE.",
              file=sys.stderr)
        sys.exit(2)
    return agg


def main(argv):
    args = [a for a in argv if a != "--dry-run"]
    dry = "--dry-run" in argv
    fecha = args[0] if args else datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    mes = fecha[:7]
    if not URL or not KEY:
        print("ERROR: faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.", file=sys.stderr)
        sys.exit(1)
    pm, price_src = pricing()

    # --- 1. Ingesta del dia (agregado por vertical/modelo desde agent.log) ---
    agg = parsear_logs(fecha, pm)
    rows = [{"fecha": fecha, "vertical": v, "modelo": m,
             "tokens_in": a[0], "tokens_out": a[1], "costo_usd": round(a[2], 6)}
            for (v, m), a in sorted(agg.items())]
    costo_hoy = round(sum(r["costo_usd"] for r in rows), 6)
    print(f"=== {fecha} (precios: {price_src}){' [DRY-RUN]' if dry else ''} ===")
    for r in rows:
        print(f"  {r['vertical']:<9}{r['modelo']:<40} in={r['tokens_in']:>7} out={r['tokens_out']:>5} ${r['costo_usd']:.5f}")
    if not rows:
        print(f"  (sin lineas 'API call #' para {fecha}: sin actividad o log rotado — sigo con mes+ledger)")
    else:
        print(f"  HOY ${costo_hoy:.5f}")
        # Idempotencia por delete+insert del dia (2026-07-11): indice unico PARCIAL
        # (where task_id is null). El delete filtra task_id=is.null Y estas verticales:
        # JAMAS toca el ledger por-tarea del trio (lo escribe el motor del Ejecutor).
        if not dry:
            try:
                rest_write(f"token_usage?fecha=eq.{fecha}&task_id=is.null"
                           "&vertical=in.(personal,negocio,clientes)", "DELETE")
                rest_write("token_usage", "POST", rows)
                print(f"INGESTA ok ({len(rows)} filas, delete+insert {fecha})")
            except urllib.error.HTTPError as e:
                print("INGESTA ERROR", e.code, e.read().decode()[:300], file=sys.stderr)
                sys.exit(1)

    # --- 2. Recalculo del ledger por-tarea del MES (costeo por tarea, v3) ---
    ini, sig = mes_rango(mes)
    try:
        filas_tarea = rest_get(f"token_usage?task_id=not.is.null&fecha=gte.{ini}&fecha=lt.{sig}"
                               "&select=id,task_id,modelo,tokens_in,tokens_out,costo_usd")
    except Exception as e:  # noqa: BLE001 — sin ledger no hay costeo por tarea: ruidoso
        print(f"ERROR: no pude leer el ledger por-tarea del mes ({type(e).__name__}: {e})", file=sys.stderr)
        sys.exit(1)
    cambios, sin_precio = recalcular_ledger_tarea(filas_tarea, pm)
    if cambios:
        antes = {f["id"]: float(f.get("costo_usd") or 0) for f in filas_tarea}
        delta = sum(nuevo - antes[i] for i, nuevo in cambios)
        print(f"RECALCULO ledger por-tarea: {len(cambios)} fila(s) de {len(filas_tarea)} "
              f"(delta ${delta:+.4f} sobre el mes){' [no escrito]' if dry else ''}")
        if not dry:
            for fila_id, nuevo in cambios:
                try:
                    rest_write(f"token_usage?id=eq.{fila_id}", "PATCH", {"costo_usd": nuevo})
                except urllib.error.HTTPError as e:
                    # best-effort RUIDOSO (regla 2026-07-13): se sigue, pero queda dicho.
                    print(f"RECALCULO ERROR fila {fila_id}: HTTP {e.code}", file=sys.stderr)
        nuevos = dict(cambios)
        for f in filas_tarea:  # reflejar en memoria para el snapshot de abajo
            if f["id"] in nuevos:
                f["costo_usd"] = nuevos[f["id"]]
    else:
        print(f"RECALCULO ledger por-tarea: sin cambios ({len(filas_tarea)} fila(s) del mes)")
    if sin_precio:
        print(f"AVISO: {sin_precio} fila(s) con tokens y costo 0 SIN precio en el catalogo: "
              "monto subestimado, tokens completos", file=sys.stderr)

    # --- 3. Totales del MES (fuente: token_usage, ya recalculado; incluye trio) ---
    try:
        filas_mes = rest_get(f"token_usage?fecha=gte.{ini}&fecha=lt.{sig}&select=vertical,costo_usd")
    except Exception as e:  # noqa: BLE001
        print(f"ERROR: no pude leer el total del mes ({type(e).__name__}: {e})", file=sys.stderr)
        sys.exit(1)
    porv = {}
    for f in filas_mes:
        porv[f["vertical"]] = porv.get(f["vertical"], 0.0) + float(f.get("costo_usd") or 0)
    total_mes = round(sum(porv.values()), 4)

    # --- 4. Snapshot v3 para budget-report (dato-en-SOUL: el agente LEE, no toca secretos) ---
    por_modelo = {}
    for (v, m), a in agg.items():
        pmod = por_modelo.setdefault(m, [0, 0, 0.0, 0, 0])
        pmod[0] += a[0]; pmod[1] += a[1]; pmod[2] += a[2]; pmod[3] += a[3]; pmod[4] += a[4]
    modelos = {}
    peor_cache = None  # (modelo, pct, turnos) del modelo con mas turnos y cache bajo umbral
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

    or_gasto, or_nota = or_month_spend(mes)
    if or_gasto and or_gasto > 0:
        pct_no_obs = round(max(or_gasto - total_mes, 0) / or_gasto * 100, 1)
        no_obs_nota = f"OR mes ${or_gasto:.4f} vs observado ${total_mes:.4f} ({or_nota})"
    else:
        pct_no_obs = None
        no_obs_nota = f"pendiente: {or_nota}"

    snapshot = {
        "mes": mes,
        "generado": now_iso(),
        "presupuesto_usd": PRESUPUESTO,
        "costo_total_usd": total_mes,
        "pct_presupuesto": round(total_mes / PRESUPUESTO * 100, 1),
        "alerta_80pct": total_mes > PRESUPUESTO * 0.8,
        "costo_hoy_usd": costo_hoy,
        "por_vertical": {v: round(c, 4) for v, c in sorted(porv.items(), key=lambda x: -x[1])},
        "por_modelo": modelos,
        "por_tarea_mes": resumen_por_tarea(filas_tarea),
        "pct_no_observado": pct_no_obs,
        "pct_no_observado_nota": no_obs_nota,
        "precios_fuente": price_src,
        "cache_bajo_umbral": ({"modelo": peor_cache[0], "pct_cache": peor_cache[1],
                               "umbral": PCT_CACHE_MIN} if peor_cache else None),
        "nota": ("v3: costo_total_usd/por_vertical = MES real desde token_usage (incluye trio). "
                 "costo_hoy_usd/por_modelo = solo el dia 'generado', loop principal "
                 "(aux no emiten al log). por_tarea_mes = ledger del trio, top "
                 f"{POR_TAREA_TOP}."),
    }
    print(f"MES {mes}: ${total_mes:.4f} de ${PRESUPUESTO:.0f} ({snapshot['pct_presupuesto']}%) | "
          f"trio ${snapshot['por_tarea_mes']['gasto_usd']:.4f} en "
          f"{snapshot['por_tarea_mes']['tareas_con_gasto']} tarea(s)")
    if dry:
        print("[DRY-RUN] snapshot no escrito")
        return
    snap_json = json.dumps(snapshot, ensure_ascii=False, indent=2)
    r = subprocess.run(["docker", "exec", "-i", "-u", "hermes", "hermes-negocio",
                        "sh", "-c", "mkdir -p /opt/data/workspace && cat > /opt/data/workspace/presupuesto.json"],
                       input=snap_json, text=True)
    print("Snapshot v3 a negocio:/opt/data/workspace/presupuesto.json",
          "ok" if r.returncode == 0 else "FALLO")


if __name__ == "__main__":
    main(sys.argv[1:])
