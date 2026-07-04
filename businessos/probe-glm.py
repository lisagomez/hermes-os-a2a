#!/usr/bin/env python3
"""probe-glm.py — gate de verificacion de GLM-5.2 antes de cablearlo al routing de Hermes.

Contexto (Fase 1, eficiencia de tokens): GLM-5.2 (OpenRouter `z-ai/glm-5.2`) es
candidato para los profiles PESADOS de Hermes (curator, kanban_decomposer, hoy en
claude-sonnet-4.6) y/o la cadena de fallback. Antes de aplicarlo hay que confirmar
tres cosas que, si fallan, lo descartan:

  1. RESPONDE en espanol a un prompt en espanol (adherencia de idioma).
  2. TOOL CALLING: emite `tool_calls` cuando se le da una tool — imprescindible,
     los profiles de Hermes usan herramientas.
  3. CACHE DE PREFIJO: en una 2a llamada con el mismo prefijo grande,
     `usage.prompt_tokens_details.cached_tokens > 0`. Sin cache repetiria el costo
     y la latencia del incidente nemotron (proveedor sin prompt-cache).

Reporta ademas latencia y proveedor efectivo. NO imprime la key ni el contenido de
las respuestas (solo booleanos, conteos, proveedor, latencia). Patron http() igual
que polar-cobros.py (User-Agent curl/8.0 por el gotcha Cloudflare 1010).

Uso:
    OPENROUTER_API_KEY=... python3 businessos/probe-glm.py
    OPENROUTER_API_KEY=... python3 businessos/probe-glm.py --model z-ai/glm-5.2:nitro

Solo lee; no toca Supabase, ni el volumen, ni ninguna config. Es un checador.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

OR_API = "https://openrouter.ai/api/v1/chat/completions"

# Prefijo grande y ESTABLE (~repetido) para que el proveedor cachee: la cache es
# por prefijo identico; con pocos tokens no se activa. Igual disciplina que el
# SOUL/MEMORY estables de Hermes.
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
    return "z-ai/glm-5.2"


def http(url, data=None, headers=None):
    # Cloudflare bloquea el UA de urllib (error 1010) — mismo gotcha que Polar/Supabase.
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
    print(f"== probe GLM :: modelo={model} ==")

    ok = {"idioma": False, "tools": False, "cache": False}

    # 1) Idioma: prompt en espanol -> respuesta en espanol (heuristica simple).
    try:
        data, lat = llamar(model, key, [
            {"role": "system", "content": PREFIJO_ESTABLE},
            {"role": "user", "content": "En una frase, que es una factura CFDI?"},
        ])
        texto = ((data.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
        prov = data.get("provider", "?")
        # senal barata de espanol: articulos/particulas comunes
        ok["idioma"] = any(f" {w} " in f" {texto.lower()} " for w in ("la", "el", "es", "de", "un", "una"))
        c1, p1 = cached_tokens(data)
        print(f"[1] idioma={'OK' if ok['idioma'] else 'NO'}  provider={prov}  "
              f"latencia={lat:.1f}s  prompt_tokens={p1}  cached={c1}")
    except urllib.error.HTTPError as e:
        print(f"[1] HTTP {e.code}: {e.read().decode()[:200]}")
        sys.exit(2)

    # 2) Tool calling: tool_choice=required fuerza al modelo a emitir tool_calls
    #    -> verifica la CAPACIDAD (no que decida usarla).
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
    try:
        data, lat = llamar(model, key, [
            {"role": "system", "content": PREFIJO_ESTABLE},
            {"role": "user", "content": "Repite la palabra: listo."},
        ])
        c2, p2 = cached_tokens(data)
        ok["cache"] = c2 > 0
        pct = (100 * c2 // p2) if p2 else 0
        print(f"[3] cache_prefijo={'OK' if ok['cache'] else 'NO'}  cached={c2}/{p2} ({pct}%)  latencia={lat:.1f}s")
    except urllib.error.HTTPError as e:
        print(f"[3] HTTP {e.code}: {e.read().decode()[:200]}")

    print("\n== veredicto ==")
    for k, v in ok.items():
        print(f"  {k:8}: {'PASA' if v else 'FALLA'}")
    # Gate para routing de Hermes: idioma + tools son duros; cache es fuerte
    # recomendacion (sin cache, usar GLM solo en profiles poco frecuentes o fallback).
    duro = ok["idioma"] and ok["tools"]
    if duro and ok["cache"]:
        print("\n=> APTO para profiles pesados de Hermes (curator/kanban).")
    elif duro:
        print("\n=> APTO con reserva: sin cache, solo profiles poco frecuentes o cadena de fallback.")
    else:
        print("\n=> NO apto para el routing de Hermes (falla idioma o tool-calling).")
    sys.exit(0 if duro else 3)


if __name__ == "__main__":
    main()
