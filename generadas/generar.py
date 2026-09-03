#!/usr/bin/env python3
"""Genera las ilustraciones del deck desde los prompts de PROMPTS.md.

Por que no se usa .claude/skills/image-generation/scripts/generate-image.ts:
ese script tiene DOS defectos contra la API de OpenRouter de hoy (2026-08-31),
verificados en vivo:

  1. Su modelo por omision (google/gemini-2.5-flash-preview-image-generation)
     fue retirado: la API responde 400 "not a valid model ID".
  2. Busca la imagen en `message.content`. OpenRouter la devuelve en
     `message.images[i].image_url.url` (content viene null). Por eso aborta con
     "No image in response" y escupe el bloque de razonamiento entero.

Arreglar el skill es un cambio de repo con su propio PR; este archivo vive en
generadas/ (fuera de git) para no tocar el arbol de trabajo mientras tanto.

El prompt se EXTRAE de PROMPTS.md, nunca se retranscribe: lo que se revisa es
exactamente lo que se genera.

Uso:  python3 generadas/generar.py 1 01-portada
      python3 generadas/generar.py todas          # las siete
"""
from __future__ import annotations

import base64
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PROMPTS = RAIZ / "generadas" / "PROMPTS.md"
MODELO = "google/gemini-3.1-flash-image"

SALIDAS = [
    "01-portada", "02-equipo-digital", "03-pilares", "04-forwarder",
    "05-fasteners", "06-beneficios", "07-camino",
]


def leer_llave() -> str:
    """Lee la llave del .env.local. Nunca la imprime ni la registra."""
    for nombre in (".env.local", ".env"):
        ruta = RAIZ / nombre
        if not ruta.exists():
            continue
        for linea in ruta.read_text(encoding="utf-8", errors="replace").splitlines():
            if linea.strip().startswith("OPENROUTER_API_KEY"):
                return linea.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("ERROR: no hay OPENROUTER_API_KEY en .env.local ni en .env")


def leer_prompt(n: int) -> str:
    bloques = re.findall(
        r"^```\n(Fondo color crema.*?)\n```", PROMPTS.read_text(encoding="utf-8"),
        re.S | re.M,
    )
    if not 1 <= n <= len(bloques):
        sys.exit(f"ERROR: el bloque {n} no existe (PROMPTS.md tiene {len(bloques)})")
    return bloques[n - 1]


def generar(n: int, salida: str, llave: str) -> bool:
    prompt = leer_prompt(n)
    destino = RAIZ / "generadas" / f"{salida}.png"
    cuerpo = {
        "model": MODELO,
        "modalities": ["image", "text"],
        "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}],
    }
    peticion = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(cuerpo).encode(),
        headers={
            "Authorization": f"Bearer {llave}",
            "Content-Type": "application/json",
            # Cloudflare responde 1010 al User-Agent por defecto de urllib
            # (aprendizaje 2026-07-02 de CLAUDE.md).
            "User-Agent": "curl/8.0",
        },
    )
    print(f"[{n}] generando {salida}.png ({len(prompt)} caracteres de prompt)…", flush=True)
    try:
        datos = json.load(urllib.request.urlopen(peticion, timeout=300))
    except urllib.error.HTTPError as exc:
        # Nunca en silencio: se dice que fallo, con el codigo y el motivo.
        print(f"[{n}] FALLO HTTP {exc.code}: {exc.read()[:300].decode(errors='replace')}")
        return False
    except OSError as exc:
        print(f"[{n}] FALLO de red: {type(exc).__name__}: {exc}")
        return False

    mensaje = (datos.get("choices") or [{}])[0].get("message") or {}
    imagenes = mensaje.get("images") or []
    if not imagenes:
        texto = (mensaje.get("content") or "")[:300]
        print(f"[{n}] FALLO: la respuesta no trae imagen. El modelo dijo: {texto!r}")
        return False

    url = imagenes[0].get("image_url", {}).get("url", "")
    coincide = re.match(r"^data:image/\w+;base64,(.+)$", url, re.S)
    if not coincide:
        print(f"[{n}] FALLO: data URL inesperado ({url[:40]!r})")
        return False

    destino.write_bytes(base64.b64decode(coincide.group(1)))
    print(f"[{n}] OK → {destino.name} ({destino.stat().st_size // 1024} KB)")
    return True


def main() -> int:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    llave = leer_llave()
    if sys.argv[1] == "todas":
        fallidas = [i for i, s in enumerate(SALIDAS, 1) if not generar(i, s, llave)]
        if fallidas:
            print(f"\nfallaron los bloques: {fallidas}")
            return 1
        print("\nlas siete generadas")
        return 0
    n = int(sys.argv[1])
    salida = sys.argv[2] if len(sys.argv) > 2 else SALIDAS[n - 1]
    return 0 if generar(n, salida, llave) else 1


if __name__ == "__main__":
    raise SystemExit(main())
