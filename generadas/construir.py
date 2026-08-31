#!/usr/bin/env python3
"""Arma el deck publicable incrustando las ilustraciones como data URI.

Por que se construye en vez de publicar la fuente directa: la vía de `assets` de
Artifacts NO esta habilitada en esta cuenta (capacidades disponibles: artifact,
downloads, mcp, self), asi que las imagenes tienen que viajar dentro del HTML.
Un archivo con 2 MB de base64 es imposible de editar a mano, de modo que:

  deck-fuente.html      <- el que se edita (rutas relativas a las imagenes)
  deck-a2a-logistica.html <- el que se publica (generado, con las imagenes dentro)

El nombre del publicado NO cambia: el Artifact se redespliega por ruta de archivo
y asi conserva su URL.
"""
import base64
import re
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
FUENTE = AQUI / "deck-fuente.html"
DESTINO = AQUI / "deck-a2a-logistica.html"
OPTIMIZADAS = AQUI / "opt"

html = FUENTE.read_text(encoding="utf-8")
faltantes, incrustadas, total = [], 0, 0

for ref in sorted(set(re.findall(r'src="(\d\d-[a-z-]+)\.png"', html))):
    jpg = OPTIMIZADAS / f"{ref}.jpg"
    if not jpg.exists():
        faltantes.append(jpg.name)
        continue
    datos = base64.b64encode(jpg.read_bytes()).decode()
    total += len(datos)
    html = html.replace(f'src="{ref}.png"', f'src="data:image/jpeg;base64,{datos}"')
    incrustadas += 1

if faltantes:
    # Nunca en silencio: un deck al que le falte una ilustracion no se publica.
    sys.exit(f"ERROR: faltan las imagenes optimizadas {faltantes} — corre generar.py y sharp-cli")
if incrustadas != 7:
    sys.exit(f"ERROR: se incrustaron {incrustadas} de 7 ilustraciones")

DESTINO.write_text(html, encoding="utf-8")
mb = len(html.encode()) / 1048576
print(f"{incrustadas} ilustraciones incrustadas → {DESTINO.name} ({mb:.2f} MB de 16 MB)")
if mb > 14:
    sys.exit("ERROR: el deck supera el margen seguro del tope de 16 MB")
