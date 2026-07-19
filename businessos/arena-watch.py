#!/usr/bin/env python3
"""arena-watch.py — señal externa GATED de benchmarking (PRP-002, Fase 2).

Baja el mirror JSON del Code Arena (arena.ai no tiene API publica; un mirror de
terceros publica snapshots diarios), compara los candidatos contra el modelo ACTIVO
de cada capa, y deja una nota en el workspace de negocio SOLO si un candidato cumple
el DOBLE UMBRAL: supera al activo por >25 Elo (menos es ruido — arena mide preferencia,
no exactitud) Y es >=2x mas barato en OpenRouter. La decision de correr el probe (y de
adoptar) sigue siendo de la duena: esta nota es ENTRADA al probe, jamas un veredicto.

Estructura real del mirror (verificada 2026-07-19):
  data/latest.json  = puntero {date, path}
  data/<path>/code.json = {meta:{fetched_at,...}, models:[{rank,model,score,vendor,votes}]}
  (score = Elo; hay otras arenas: agent/text/vision/... — usamos code.json)

Uso:
    source businessos/.env
    python3 businessos/arena-watch.py [--dry-run]     # cron semanal en el server

Job INDEPENDIENTE: cualquier fallo (mirror caido/stale, schema raro) sale limpio SIN
tumbar el nightly. Avisa si el snapshot tiene >10 dias. NO imprime credenciales.
NO cambia config. Dedupe por conclusion en ~/state.
"""
import json
import os
import re
import sys
import datetime
import urllib.request

STATE = os.environ.get("HERMES_STATE", os.path.expanduser("~/state"))
PRICE_CACHE = os.path.join(STATE, "openrouter-models.json")
DEDUPE = os.path.join(STATE, "arena-watch-last.json")
DRY = "--dry-run" in sys.argv[1:]

RAW = "https://raw.githubusercontent.com/oolong-tea-2026/arena-ai-leaderboards/main"

# Modelo ACTIVO por capa (documentado en fase1-eficiencia / hermes-vertical-setup).
# arena_match = nombre tal cual aparece en el Code Arena (ver code.json).
# El loop (gemini-2.5-flash-lite) NO suele estar en el top-20 de codigo -> se salta.
CAPAS = {
    "loop":   {"activo_or": "google/gemini-2.5-flash-lite", "arena_match": "gemini-2.5-flash-lite"},
    "pesada": {"activo_or": "anthropic/claude-sonnet-4.6",  "arena_match": "claude-sonnet-4-6"},
}
ELO_MIN = 25       # >25 Elo para salir del ruido
CHEAPER_X = 2.0    # >=2x mas barato en OpenRouter (precio blended prompt+completion)
DIAS_STALE = 10

# Sufijos de variante que arena anexa y OpenRouter no (para el match de nombres).
_VARIANTE = re.compile(r"\s*\([^)]*\)|-(?:thinking|high|xhigh|low|max|preview|instruct|code)\b", re.I)


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")


def http_json(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": "curl/8.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def squish(nombre):
    """Normaliza un nombre para comparar arena<->openrouter: quita variantes y no-alfanumericos.
    'glm-5.2 (max)' -> 'glm52' ; 'claude-sonnet-4-6' -> 'claudesonnet46'."""
    return re.sub(r"[^a-z0-9]", "", _VARIANTE.sub("", nombre.lower()))


def salir(msg, code=0):
    print(f"arena-watch: {msg}")
    sys.exit(code)


def bajar_code_json():
    """Resuelve el puntero latest.json -> data/<path>/code.json. Devuelve el dict o None."""
    fecha = None
    try:
        ptr = http_json(f"{RAW}/data/latest.json")
        fecha = ptr.get("path") or ptr.get("date")
    except Exception:  # noqa: BLE001
        fecha = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    for f in [fecha, datetime.datetime.now(datetime.timezone.utc).date().isoformat()]:
        if not f:
            continue
        try:
            return http_json(f"{RAW}/data/{f}/code.json")
        except Exception:  # noqa: BLE001
            continue
    return None


def cargar_precios():
    """Precio blended (prompt+completion) por token en OpenRouter. Reusa el cache de la ingesta."""
    try:
        data = json.load(open(PRICE_CACHE))["data"]
    except Exception:  # noqa: BLE001
        try:
            data = http_json("https://openrouter.ai/api/v1/models")["data"]
        except Exception:  # noqa: BLE001
            return {}
    return {m["id"]: (float((m.get("pricing") or {}).get("prompt", 0) or 0)
                      + float((m.get("pricing") or {}).get("completion", 0) or 0)) for m in data}


def precio_or_por_nombre(nombre, pm):
    """Precio OR de un modelo de arena via squish del nombre contra los slugs. (slug, precio)."""
    sq = squish(nombre)
    if len(sq) < 4:
        return None, None
    for slug, precio in pm.items():
        if sq in squish(slug):
            return slug, precio
    return None, None


def main():
    os.makedirs(STATE, exist_ok=True)
    code = bajar_code_json()
    if not code or not isinstance(code.get("models"), list) or not code["models"]:
        salir("mirror no accesible o sin lista 'models'. Sin nota; no se toca nada.")

    modelos = code["models"]
    meta = code.get("meta") or {}
    stale_nota = ""
    fetched = meta.get("fetched_at")
    if fetched:
        try:
            f = datetime.datetime.fromisoformat(str(fetched).replace("Z", "+00:00"))
            edad = (datetime.datetime.now(datetime.timezone.utc) - f).days
            if edad > DIAS_STALE:
                stale_nota = f" [OJO: mirror con {edad} dias de antiguedad]"
        except Exception:  # noqa: BLE001
            pass

    pm = cargar_precios()

    def elo_activo_de(match):
        sq = squish(match)
        for m in modelos:
            if sq and sq in squish(str(m.get("model", ""))):
                try:
                    return float(m.get("score"))
                except (TypeError, ValueError):
                    return None
        return None

    hallazgos = []
    for capa, cfg in CAPAS.items():
        elo_activo = elo_activo_de(cfg["arena_match"])
        precio_activo = pm.get(cfg["activo_or"])
        if elo_activo is None or not precio_activo or precio_activo <= 0:
            continue  # sin base de comparacion fiable -> esta capa no genera nota
        for m in modelos:
            nombre = str(m.get("model", ""))
            if squish(cfg["arena_match"]) in squish(nombre):
                continue  # es el activo mismo
            try:
                elo = float(m.get("score"))
            except (TypeError, ValueError):
                continue
            if elo - elo_activo <= ELO_MIN:
                continue
            cand_slug, precio_cand = precio_or_por_nombre(nombre, pm)
            if not precio_cand or precio_cand <= 0:
                continue  # no esta en OpenRouter (o sin precio) -> no accionable
            if precio_activo / precio_cand < CHEAPER_X:
                continue
            hallazgos.append({
                "capa": capa, "candidato": nombre, "candidato_or": cand_slug,
                "elo_candidato": elo, "elo_activo": elo_activo, "delta_elo": round(elo - elo_activo, 1),
                "precio_x_mas_barato": round(precio_activo / precio_cand, 2),
            })

    # Dedupe: la MISMA conclusion no genera dos notas.
    firma = json.dumps(sorted([(h["capa"], h["candidato_or"]) for h in hallazgos]))
    try:
        prev = json.load(open(DEDUPE)).get("firma")
    except Exception:  # noqa: BLE001
        prev = None

    if not hallazgos:
        print(f"arena-watch: sin candidatos que crucen el doble umbral (>{ELO_MIN} Elo Y >={CHEAPER_X}x barato).{stale_nota}")
        if not DRY:
            json.dump({"firma": firma, "cuando": now_iso()}, open(DEDUPE, "w"))
        sys.exit(0)

    nota = {
        "generado": now_iso(), "fuente": f"{RAW}/data/<fecha>/code.json",
        "arena_fetched_at": fetched, "stale": stale_nota.strip() or None,
        "umbral": {"elo_min": ELO_MIN, "cheaper_x": CHEAPER_X},
        "hallazgos": hallazgos,
        "que_hacer": "SEÑAL, no veredicto. Elisa decide si se corre el probe (probe-kimi/probe-glm). "
                     "Arena mide PREFERENCIA humana, no exactitud ni tool-calling/cache — eso lo mide el probe.",
    }
    texto = json.dumps(nota, ensure_ascii=False, indent=2)

    if firma == prev:
        print("arena-watch: hallazgo IGUAL al anterior (dedupe) — no se re-anota.")
        sys.exit(0)

    print("arena-watch: HALLAZGO nuevo:")
    print(texto)
    if DRY:
        print("(dry-run: no se escribe la nota ni el dedupe)")
        sys.exit(0)

    import subprocess
    r = subprocess.run(["docker", "exec", "-i", "-u", "hermes", "hermes-negocio", "sh", "-c",
                        "mkdir -p /opt/data/workspace && cat > /opt/data/workspace/arena-watch.json"],
                       input=texto, text=True)
    json.dump({"firma": firma, "cuando": now_iso()}, open(DEDUPE, "w"))
    print("nota -> negocio:/opt/data/workspace/arena-watch.json", "ok" if r.returncode == 0 else "FALLO")


if __name__ == "__main__":
    main()
