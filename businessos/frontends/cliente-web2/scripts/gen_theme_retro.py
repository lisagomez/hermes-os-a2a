# -*- coding: utf-8 -*-
"""Generador del sprite sheet del tema "Oficina Retro" (id: retro).

Oficina noventera casual: ropa de calle relajada (camisas remangadas,
chalecos, overoles, cardigans), paleta apagada/calida (beige, azul jean,
verde oliva, mostaza, ladrillo, gris). Nada de neon.

Como regenerar:
    python scripts/gen_theme_retro.py
  -> escribe public/office/themes/retro.png (96x160, RGBA, fondo transparente)

Layout del sheet (sin padding, celda exacta 16x20):
  8 FILAS  (orden de AGENTS): vendo, flujo, oraculo, ledger, musa, empatia, custodio, tesoro
  6 COLUMNAS: idle-A, idle-B(parpadeo), walk-A, walk-B, celebrate-A, celebrate-B

Solo stdlib via spritelib. Cada letra del grid es 1 pixel; '.' = transparente.
"""
import os

from spritelib import (
    grid, s, row, blink as _lib_blink, walk_frames, celebrate_frames,
    compose_sheet, SPARKS_L_A, SPARKS_L_B, SPARKS_R_A, SPARKS_R_B,
)

W, H = 16, 20
CELL_W, CELL_H = 16, 20
SHEET_COLS, SHEET_ROWS = 6, 8

BASE = [
    "....oooooooo....",
    "...ohhhhhhhho...",
    "...ohhhhhhhho...",
    "...ohhhhhhhho...",
    "...ohkkkkkkho...",
    "...okkkkkkkko...",
    "...okEwkkEwko...",
    "...okEEkkEEko...",
    "...okkkmmkkko...",
    "....okkkkkko....",
    "....osssssso....",
    "..o" + "s" * 10 + "o..",
    "..o" + "d" + "s" * 8 + "d" + "o..",
    "..o" + "k" + "s" * 8 + "k" + "o..",
    "...o" + "d" * 8 + "o...",
    "...oppo..oppo...",
    "...oppo..oppo...",
    "...oppo..oppo...",
    "...oooo..oooo...",
    "................",
]
assert all(len(r) == W for r in BASE), [len(r) for r in BASE]
assert len(BASE) == H

# Paleta global (outline compartido con los demas temas de la oficina)
GLOBAL = {
    'o': '#1A1622',  # outline
    'E': '#1A1622',  # ojos
    'w': '#EDEAF4',  # blanco
    'G': '#FFC24D',  # dorado (destello legendary)
    'c': '#28C840',  # verde exito (destello comun)
    'l': '#B9A6FF',  # lila (se sobreescribe por personaje si hace falta)
}

# Tonos del tema retro (referencia):
#   beige #C8B08A  jean #5A6E8C  oliva #7A8450  mostaza #C9A227
#   ladrillo #A65846  gris #8C8A94


# ---------- personajes ----------

def vendo():
    """Vendedor: camisa beige remangada + corbata floja + headset."""
    g = grid(BASE)
    row(g, 4, 1, 'hkhhhhhh')            # raya lateral en el peinado
    s(g, 3, 6, 'g'); s(g, 3, 7, 'g')    # pad del headset (fuera de la cara)
    s(g, 2, 6, 'o'); s(g, 2, 7, 'o')
    s(g, 4, 8, 'g')                     # micro 1px
    s(g, 7, 10, 'w'); s(g, 8, 10, 'w')  # cuello abierto
    s(g, 7, 11, 't'); s(g, 8, 11, 't')  # nudo flojo
    s(g, 8, 12, 't'); s(g, 8, 13, 't')  # corbata ladeada
    s(g, 3, 12, 'k'); s(g, 12, 12, 'k')  # mangas remangadas (antebrazo)
    return g


def flujo():
    """Repartidora: gorra oliva con visera + chaleco mostaza + paquete."""
    g = grid(BASE)
    row(g, 4, 1, 'CCCCCCCC')            # copa de la gorra
    row(g, 4, 2, 'CCCCCCCC')
    s(g, 1, 3, 'C'); s(g, 2, 3, 'C')    # visera hacia la izquierda
    s(g, 1, 2, 'o'); s(g, 2, 2, 'o')
    s(g, 0, 3, 'o')
    s(g, 1, 4, 'o'); s(g, 2, 4, 'o')
    s(g, 13, 1, 'o')                    # coleta saliendo de la gorra
    for y in (2, 3, 4, 5):
        s(g, 13, y, 'h'); s(g, 14, y, 'o')
    s(g, 13, 6, 'o')
    for y in (11, 12, 13):              # chaleco mostaza (paneles)
        s(g, 4, y, 'v'); s(g, 11, y, 'v')
    s(g, 0, 11, 'o'); s(g, 1, 11, 'o')  # paquete de carton bajo el brazo
    s(g, 0, 12, 'o'); s(g, 1, 12, 'g')
    s(g, 0, 13, 'o'); s(g, 1, 13, 'g')
    s(g, 0, 14, 'o'); s(g, 1, 14, 'o')
    return g


def oraculo():
    """Analista: lentes gruesos + sueter de rombos + cafe."""
    g = grid(BASE)
    s(g, 5, 0, '.'); s(g, 9, 0, '.')    # despeinado (silueta dentada)
    s(g, 5, 1, 'o'); s(g, 9, 1, 'o')
    row(g, 4, 6, 'lEEllEEl')            # lentes de pasta gruesos
    row(g, 4, 7, 'lEEllEEl')
    s(g, 5, 11, 'y'); s(g, 8, 11, 'y')  # rombos mostaza del sueter
    s(g, 6, 12, 'y'); s(g, 9, 12, 'y')
    s(g, 5, 13, 'y'); s(g, 8, 13, 'y')
    s(g, 14, 11, 'o'); s(g, 14, 12, 'w')  # taza de cafe
    s(g, 14, 13, 'w')
    s(g, 15, 12, 'o'); s(g, 15, 13, 'o')
    return g


def ledger():
    """Contador: visera verde clasica + chaleco gris + maletin."""
    g = grid(BASE)
    row(g, 4, 3, 'nnnnnnnn')            # visera verde (2 filas: banda + ala)
    row(g, 2, 4, 'o' + 'n' * 10 + 'o')  # ala mas ancha que la cara
    s(g, 7, 10, 'w'); s(g, 8, 10, 'w')  # camisa blanca bajo el chaleco
    s(g, 7, 12, 'w'); s(g, 7, 13, 'w')  # botones del chaleco
    row(g, 13, 13, 'ooo')               # maletin
    s(g, 13, 14, 'o'); s(g, 14, 14, 'y'); s(g, 15, 14, 'o')
    row(g, 13, 15, 'ooo')
    return g


def musa():
    """Creativa: melena amplia + overol de pintora + pincel + manchas."""
    g = grid(BASE)
    for y in (1, 2, 3):                 # melena rizada amplia
        s(g, 1, y, 'o'); s(g, 2, y, 'h')
        s(g, 13, y, 'h'); s(g, 14, y, 'o')
    s(g, 2, 0, 'o'); s(g, 13, 0, 'o')
    s(g, 2, 4, 'o'); s(g, 13, 4, 'o')
    s(g, 5, 11, 'd'); s(g, 10, 11, 'd')  # tirantes del overol
    row(g, 5, 12, 'dddddd')             # peto jean
    row(g, 5, 13, 'dddddd')
    s(g, 7, 12, 'r'); s(g, 8, 13, 'y')  # manchas de pintura
    s(g, 1, 9, 'r')                     # pincel: punta con pintura
    s(g, 1, 10, 'o')                    # virola
    s(g, 1, 11, 'g'); s(g, 1, 12, 'g'); s(g, 1, 13, 'g')  # mango
    return g


def empatia():
    """Recepcionista: bob + diadema telefonica + cardigan + portapapeles."""
    g = grid(BASE)
    s(g, 4, 5, 'h'); s(g, 11, 5, 'h')   # bob enmarcando la cara
    s(g, 4, 6, 'h'); s(g, 11, 6, 'h')
    s(g, 4, 7, 'h'); s(g, 11, 7, 'h')
    s(g, 3, 7, 'g'); s(g, 2, 7, 'o')    # diadema: pad + micro
    s(g, 4, 8, 'g')
    s(g, 7, 10, 'w'); s(g, 8, 10, 'w')  # blusa
    s(g, 7, 12, 'w'); s(g, 7, 13, 'w')  # botones del cardigan
    s(g, 13, 11, 'g'); s(g, 14, 11, 'o')  # portapapeles (clip arriba)
    s(g, 13, 12, 'w'); s(g, 14, 12, 'o')
    s(g, 13, 13, 'w'); s(g, 14, 13, 'o')
    s(g, 13, 14, 'o'); s(g, 14, 14, 'o')
    return g


def custodio():
    """Abogado: calvicie con canas + tirantes + corbatin + expediente."""
    g = grid(BASE)
    row(g, 6, 1, 'kkkk')                # coronilla calva
    row(g, 6, 2, 'kkkk')
    s(g, 7, 10, 'w'); s(g, 8, 10, 'w')  # cuello de camisa
    row(g, 6, 11, 'ror')                # corbatin ladrillo
    for y in (11, 12, 13):              # tirantes oscuros
        s(g, 5, y, 'd'); s(g, 10, y, 'd')
    s(g, 0, 11, 'o'); s(g, 1, 11, 'o')  # carpeta de expedientes mostaza
    s(g, 0, 12, 'o'); s(g, 1, 12, 'y')
    s(g, 0, 13, 'o'); s(g, 1, 13, 'y')
    s(g, 0, 14, 'o'); s(g, 1, 14, 'o')
    return g


def tesoro():
    """Cajera: mono + lentes de cadena + lapiz en la oreja + libreta."""
    g = grid(BASE)
    s(g, 12, 0, 'h'); s(g, 13, 0, 'h'); s(g, 14, 0, 'o')  # mono lateral
    s(g, 13, 1, 'h'); s(g, 14, 1, 'o')
    s(g, 4, 7, 'y'); s(g, 7, 7, 'y')    # lentes media luna mostaza
    s(g, 8, 7, 'y'); s(g, 11, 7, 'y')
    s(g, 2, 7, 'y'); s(g, 2, 8, 'y')    # cadena colgando (izquierda)
    s(g, 13, 7, 'y'); s(g, 13, 8, 'y')  # cadena colgando (derecha)
    s(g, 1, 5, 'y'); s(g, 2, 5, 'y')    # lapiz en la oreja
    s(g, 7, 10, 'w'); s(g, 8, 10, 'w')  # cuello de la blusa
    s(g, 0, 11, 'o'); s(g, 1, 11, 'o')  # libreta contable ladrillo
    s(g, 0, 12, 'o'); s(g, 1, 12, 'r')
    s(g, 0, 13, 'o'); s(g, 1, 13, 'w')
    s(g, 0, 14, 'o'); s(g, 1, 14, 'o')
    return g


# ---------- plantilla (orden = filas del sheet = orden de AGENTS) ----------
# arms/swing eligen el lado libre: el prop (paquete, cafe, maletin, pincel,
# portapapeles, carpeta, libreta) queda intacto en todos los frames.

CHARS = [
    dict(id='vendo', build=vendo,
         pal={'k': '#C68642', 'h': '#3B2A1E', 's': '#C8B08A', 'd': '#4A3B2A',
              'p': '#5A6E8C', 'm': '#1A1622', 't': '#A65846', 'g': '#8C8A94'},
         swing=None, arms='both', spark='G',  # legendary -> dorado
         sparks_a=SPARKS_L_A, sparks_b=SPARKS_R_A),
    dict(id='flujo', build=flujo,
         pal={'k': '#8D5524', 'h': '#241A14', 's': '#8C8A94', 'd': '#6B6975',
              'p': '#5A6E8C', 'm': '#1A1622', 'C': '#7A8450', 'v': '#C9A227',
              'g': '#B08D57'},
         swing=12, arms='right', spark='c',  # paquete en mano izquierda
         sparks_a=[(15, 2), (15, 5), (14, 7)], sparks_b=[(15, 4), (15, 8), (14, 6)]),
    dict(id='oraculo', build=oraculo,
         pal={'k': '#F2C79B', 'h': '#6B4226', 's': '#7A8450', 'd': '#5C6340',
              'p': '#8C8A94', 'm': '#1A1622', 'y': '#C9A227', 'l': '#4A4A55'},
         swing=3, arms='left', spark='c',  # taza al lado derecho
         sparks_a=SPARKS_L_A, sparks_b=SPARKS_L_B),
    dict(id='ledger', build=ledger,
         pal={'k': '#8D5524', 'h': '#B9B6BD', 's': '#6E6C78', 'd': '#4A4855',
              'p': '#3A3642', 'm': '#1A1622', 'n': '#3F7A4A', 'y': '#C9A227'},
         swing=3, arms='left', spark='G',  # legendary -> dorado; maletin derecha
         sparks_a=SPARKS_L_A, sparks_b=SPARKS_L_B),
    dict(id='musa', build=musa,
         pal={'k': '#FFDBAC', 'h': '#A65846', 's': '#C8B08A', 'd': '#5A6E8C',
              'p': '#5A6E8C', 'm': '#1A1622', 'r': '#A65846', 'y': '#C9A227',
              'g': '#8A6642'},
         swing=12, arms='right', spark='c',  # pincel en mano izquierda
         sparks_a=[(15, 3), (14, 6), (15, 5)], sparks_b=[(15, 1), (14, 5), (15, 7)]),
    dict(id='empatia', build=empatia,
         pal={'k': '#C68642', 'h': '#4A3020', 's': '#A65846', 'd': '#7A4030',
              'p': '#8C8A94', 'm': '#1A1622', 'g': '#8C8A94'},
         swing=3, arms='left', spark='c',  # portapapeles a la derecha
         sparks_a=SPARKS_L_A, sparks_b=SPARKS_L_B),
    dict(id='custodio', build=custodio,
         pal={'k': '#F2C79B', 'h': '#8C8A94', 's': '#F0EDE4', 'd': '#3A3642',
              'p': '#3A3642', 'm': '#1A1622', 'r': '#A65846', 'y': '#C9A227'},
         swing=12, arms='right', spark='c',  # carpeta en mano izquierda
         sparks_a=SPARKS_R_A, sparks_b=SPARKS_R_B),
    dict(id='tesoro', build=tesoro,
         pal={'k': '#FFDBAC', 'h': '#3B2A1E', 's': '#5A6E8C', 'd': '#3F4A63',
              'p': '#8C8A94', 'm': '#1A1622', 'y': '#C9A227', 'r': '#A65846'},
         swing=12, arms='right', spark='c',  # libreta en mano izquierda
         sparks_a=SPARKS_R_A, sparks_b=SPARKS_R_B),
]


def char_frames(c):
    """6 frames en orden de columnas: idle-A, idle-B, walk-A, walk-B, cel-A, cel-B."""
    g = c['build']()
    ia, ib = g, _lib_blink(g)
    wa, wb = walk_frames(g, c['swing'])
    ca, cb = celebrate_frames(g, c['arms'], c['spark'], c['sparks_a'], c['sparks_b'])
    return [ia, ib, wa, wb, ca, cb]


def build_rows():
    rows = []
    for c in CHARS:
        colors = dict(GLOBAL); colors.update(c['pal'])
        rows.append([(fr, colors) for fr in char_frames(c)])
    return rows


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.normpath(os.path.join(here, '..', 'public', 'office', 'themes', 'retro.png'))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    png, w, h = compose_sheet(build_rows(), CELL_W, CELL_H, SHEET_COLS)
    assert (w, h) == (96, 160), (w, h)
    with open(out, 'wb') as f:
        f.write(png)
    print('OK %s %dx%d %.1f KB' % (out, w, h, os.path.getsize(out) / 1024.0))


if __name__ == '__main__':
    main()
