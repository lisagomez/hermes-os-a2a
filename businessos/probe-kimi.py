#!/usr/bin/env python3
"""probe-kimi.py — gate de adopcion de Kimi antes de cablearlo a la capa pesada del trio/Hermes.

Contexto (PRP-002, Fase 3): tras GLM-5.2, salio Kimi K2.7 Code / K3 (2026-07-16).
Candidato RACIONAL para la capa pesada (curator, kanban_decomposer, Ejecutor del trio):
**`moonshotai/kimi-k2.7-code` ($0.95/$4)**, NO K3 ($3/$15 con razonamiento always-max que
se come el tope de tokens de la cola de Fase 10). Este probe es el clon de `probe-glm.py`:
mismos 3 checks que descartan un modelo si fallan.

  1. RESPONDE en espanol a un prompt en espanol (adherencia de idioma).
  2. TOOL CALLING: emite `tool_calls` con `tool_choice=required` (capacidad, no decision).
  3. CACHE DE PREFIJO: 2a llamada con el mismo prefijo grande -> `cached_tokens > 0`.

**Gotcha que este probe DEBE medir en vivo (no asumir)**: el cache-hit barato de Moonshot
($0.19/M en K2.7, $0.30/M en K3) es del API DIRECTO de Moonshot; al 2026-07-19 OpenRouter
NO lo igualaba. Si el check 3 da `cached=0` via OpenRouter, el veredicto ECONOMICO cambia
por completo (sin cache, el costo por turno con prefijo grande se dispara — leccion nemotron).
Por eso el output imprime `cached/prompt` explicito: es el dato que decide.

Uso:
    OPENROUTER_API_KEY=... python3 businessos/probe-kimi.py
    OPENROUTER_API_KEY=... python3 businessos/probe-kimi.py --model moonshotai/kimi-k3   # como dato comparativo

Solo lee; no toca Supabase, ni el volumen, ni ninguna config. Es un checador.
NO imprime la key ni el contenido de las respuestas (solo booleanos, conteos, proveedor, latencia).
CORRERLO gasta tokens de OpenRouter -> decision de la duena (gate del PRP-002), no autopiloto.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

OR_API = "https://openrouter.ai/api/v1/chat/completions"

# Prefijo grande y ESTABLE (~repetido) para provocar cache de prefijo: la cache es
# por prefijo identico; con pocos tokens no se activa. Igual disciplina que probe-glm.
_PARRAFO = (
    "Eres un asistente de un despacho contable-fiscal en Mexico. Respondes en "
    "espanol, con precision y citando la fuente cuando afirmas algo regulatorio. "
    "Nunca inventas: si no hay regla aplicable, lo dices. "
)
PREFIJO_ESTABLE = _PARRAFO * 40  # ~2k tokens de prefijo idle para provocar cache

TOOL = [{
    "type": "function",
    "function": {
        "name": "registrar_gasto",
        "description": "Registra un gasto deducible en el libro contable.",
        "parameters": {
            "type": "object",
            "properties": {
                "concepto": {"type": "string"},
                "monto": {"type": "number"},
            },
            "required": ["concepto", "monto"],
        },
    },
}]


def modelo():
    for a in sys.argv[1:]:
        if a.startswith("--model"):
            return a.split("=", 1)[1] if "=" in a else sys.argv[sys.argv.index(a) + 1]
    return "moonshotai/kimi-k2.7-code"


def http(url, data=None, headers=None):
    # Cloudflare bloquea el UA de urllib (error 1010) — mismo gotcha que Polar/Supabase/OR.
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={"User-Agent": "curl/8.0", **(headers or {})},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode())


def llamar(model, key, messages, tools=None, tool_choice=None):
    body = {"model": model, "messages": messages}
    if tools:
        body["tools"] = tools
    if tool_choice:
        body["tool_choice"] = tool_choice
    t0 = time.monotonic()
    data = http(
        OR_API,
        data=json.dumps(body).encode(),
        headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"},
    )
    return data, time.monotonic() - t0


def cached_tokens(data):
    usage = data.get("usage") or {}
    det = usage.get("prompt_tokens_details") or {}
    return int(det.get("cached_tokens") or 0), int(usage.get("prompt_tokens") or 0)


def main():
    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        print("ABORT: falta OPENROUTER_API_KEY en el entorno")
        sys.exit(1)
    model = modelo()
    print(f"== probe KIMI :: modelo={model} ==")

    ok = {"idioma": False, "tools": False, "cache": False}

    # 1) Idioma: prompt en espanol -> respuesta en espanol (heuristica simple).
    try:
        data, lat = llamar(model, key, [
            {"role": "system", "content": PREFIJO_ESTABLE},
            {"role": "user", "content": "En una frase, que es una factura CFDI?"},
        ])
        texto = ((data.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
        prov = data.get("provider", "?")
        ok["idioma"] = any(f" {w} " in f" {texto.lower()} " for w in ("la", "el", "es", "de", "un", "una"))
        c1, p1 = cached_tokens(data)
        print(f"[1] idioma={'OK' if ok['idioma'] else 'NO'}  provider={prov}  "
              f"latencia={lat:.1f}s  prompt_tokens={p1}  cached={c1}")
    except urllib.error.HTTPError as e:
        cuerpo = e.read().decode()[:200]
        print(f"[1] HTTP {e.code}: {cuerpo}")
        if e.code == 404:
            print("    ¿slug correcto? DEBE ser 'moonshotai/...' (no 'moonshot/...').")
        sys.exit(2)

    # 2) Tool calling: tool_choice=required fuerza tool_calls -> verifica CAPACIDAD.
    try:
        data, lat = llamar(model, key, [
            {"role": "system", "content": PREFIJO_ESTABLE},
            {"role": "user", "content": "Registra un gasto: papeleria por 350 pesos."},
        ], tools=TOOL, tool_choice="required")
        tc = ((data.get("choices") or [{}])[0].get("message") or {}).get("tool_calls") or []
        ok["tools"] = len(tc) > 0
        print(f"[2] tool_calling={'OK' if ok['tools'] else 'NO'}  tool_calls={len(tc)}  latencia={lat:.1f}s")
    except urllib.error.HTTPError as e:
        print(f"[2] HTTP {e.code}: {e.read().decode()[:200]}  (¿el proveedor soporta tools?)")

    # 3) Cache de prefijo: 2a llamada con el MISMO prefijo grande -> cached>0.
    #    CRITICO para Kimi: mide si OpenRouter aplica el cache-hit de Moonshot o solo
    #    el API directo. cached=0 aqui => sin descuento de cache via OpenRouter.
    try:
        data, lat = llamar(model, key, [
            {"role": "system", "content": PREFIJO_ESTABLE},
            {"role": "user", "content": "Repite la palabra: listo."},
        ])
        c2, p2 = cached_tokens(data)
        ok["cache"] = c2 > 0
        pct = (100 * c2 // p2) if p2 else 0
        print(f"[3] cache_prefijo={'OK' if ok['cache'] else 'NO'}  cached={c2}/{p2} ({pct}%)  latencia={lat:.1f}s")
        if not ok["cache"]:
            print("    ⚠ cached=0 via OpenRouter: el cache-hit barato de Moonshot NO aplica aqui.")
            print("      El veredicto economico cambia — recalcular costo/turno SIN descuento de cache.")
    except urllib.error.HTTPError as e:
        print(f"[3] HTTP {e.code}: {e.read().decode()[:200]}")

    print("\n== veredicto ==")
    for k, v in ok.items():
        print(f"  {k:8}: {'PASA' if v else 'FALLA'}")
    # idioma + tools son duros; cache es fuerte recomendacion (y decide el caso economico).
    duro = ok["idioma"] and ok["tools"]
    if duro and ok["cache"]:
        print("\n=> APTO para la capa pesada (con caché → costo/turno bajo). Comparar vs GLM-5.2/Sonnet.")
    elif duro:
        print("\n=> APTO con RESERVA: sin caché via OpenRouter, el prefijo grande sube el costo/turno.")
        print("   Solo si el precio base ($0.95/$4) aun gana a Sonnet en tu mezcla real de tokens.")
    else:
        print("\n=> NO apto (falla idioma o tool-calling).")
    sys.exit(0 if duro else 3)


if __name__ == "__main__":
    main()
