# -*- coding: utf-8 -*-
"""Generador del sprite sheet de produccion — personajes pixel A2A.

FUENTE DE VERDAD editable de los 8 personajes de la oficina.

Como regenerar:
    python scripts/gen_sprites.py
  → escribe public/office/sprites.png (96x160, RGBA, fondo transparente)

Layout del sheet (sin padding, celda exacta 16x20):
  8 FILAS  (orden de AGENTS): vendo, flujo, oraculo, ledger, musa, empatia, custodio, tesoro
  6 COLUMNAS: idle-A, idle-B(parpadeo), walk-A, walk-B, celebrate-A, celebrate-B

Contrato TS que consume este sheet:
  src/features/landing/sections/office/sprites.ts

Solo stdlib (zlib + struct via spritelib). Cada letra del grid es 1 pixel; '.' = transparente.
"""
import os

from spritelib import (
    grid, s, row, clone, blink as _lib_blink, walk_frames, celebrate_frames,
    hex2rgb, save_png_rgba, SPARKS_L_A, SPARKS_L_B, SPARKS_R_A, SPARKS_R_B,
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

# Paleta global de marca (compartida por todos los personajes)
GLOBAL = {
    'o': '#1A1622',  # outline (violeta casi negro)
    'E': '#1A1622',  # ojos
    'w': '#EDEAF4',  # blanco texto
    'G': '#FFC24D',  # dorado claro (legendary)
    'c': '#28C840',  # verde exito
    'l': '#B9A6FF',  # lila
}


# ---------- personajes (grids idle aprobados) ----------

def vendo1():
    g = grid(BASE)
    row(g, 4, 3, 'hkkkkkhh')          # peinado formal con raya
    s(g, 3, 6, 'g'); s(g, 3, 7, 'g')  # pad headset (fuera de la cara)
    s(g, 2, 6, 'o'); s(g, 2, 7, 'o')
    s(g, 4, 8, 'g')                   # micro 1px
    s(g, 7, 10, 'w'); s(g, 8, 10, 'w')  # cuello camisa
    row(g, 7, 11, 'tt'); row(g, 7, 12, 'tt'); s(g, 7, 13, 't')  # corbata rosa
    s(g, 5, 12, 'G'); s(g, 10, 12, 'G')  # botones dorados (legendary)
    return g


def flujo7():
    g = grid(BASE)
    # coleta alta lateral derecha
    s(g, 13, 1, 'o')
    for y in (2, 3, 4, 5):
        s(g, 13, y, 'h'); s(g, 14, y, 'o')
    s(g, 13, 6, 'o')
    # chaleco reflectivo: franjas blancas verticales
    for y in (11, 12, 13):
        s(g, 5, y, 'w'); s(g, 10, y, 'w')
    # tablet en mano izquierda
    s(g, 1, 12, 'o'); s(g, 2, 12, 'g')
    s(g, 1, 13, 'o'); s(g, 2, 13, 'g')
    s(g, 1, 11, 'o'); s(g, 2, 11, 'o')
    s(g, 1, 14, 'o'); s(g, 2, 14, 'o')
    return g


def oraculo():
    g = grid(BASE)
    # despeinado: silueta dentada arriba
    s(g, 5, 0, '.'); s(g, 9, 0, '.')
    s(g, 5, 1, 'o'); s(g, 9, 1, 'o')
    s(g, 4, 5, 'h')                    # patilla asimetrica
    # gafas grandes lila
    row(g, 4, 6, 'lEEllEEl')
    row(g, 4, 7, 'lEEllEEl')
    # hoodie: capucha ancha + cordones
    row(g, 3, 10, 'o' + 's' * 8 + 'o')
    s(g, 6, 11, 'w'); s(g, 9, 11, 'w')
    s(g, 6, 12, 'w'); s(g, 9, 12, 'w')
    # taza de cafe al lado
    s(g, 14, 11, 'o'); s(g, 14, 12, 'w'); s(g, 14, 13, 'w')
    s(g, 15, 12, 'o'); s(g, 15, 13, 'o')
    return g


def ledgerx():
    g = grid(BASE)
    # gafas oscuras tipo visor con glint lila
    row(g, 4, 6, 'vvvvvvvv')
    row(g, 4, 7, 'vvvkkvvv')
    s(g, 5, 6, 'l')
    # traje oscuro con solapas y detalles dorados
    s(g, 4, 11, 'd'); s(g, 11, 11, 'd')
    s(g, 5, 11, 'G'); s(g, 10, 11, 'G')
    row(g, 7, 11, 'tt'); row(g, 7, 12, 'tt')
    s(g, 7, 13, 'G')  # pisacorbatas dorado
    # maletin con broche dorado
    row(g, 13, 13, 'ooo')
    s(g, 13, 14, 'o'); s(g, 14, 14, 'G'); s(g, 15, 14, 'o')
    row(g, 13, 15, 'ooo')
    return g


def musa3():
    g = grid(BASE)
    # boina rosa ladeada
    row(g, 2, 0, 'obbbbbbbbo')
    row(g, 4, 1, 'bbbbbhhh')
    # mechon violeta
    s(g, 9, 2, 'v'); s(g, 8, 3, 'v'); s(g, 9, 3, 'v')
    # audifonos (pads lila visibles)
    s(g, 3, 7, 'l'); s(g, 12, 7, 'l')
    return g


def empatia2():
    g = grid(BASE)
    # bob redondeado enmarcando la cara
    s(g, 4, 5, 'h'); s(g, 11, 5, 'h')
    s(g, 4, 6, 'h'); s(g, 11, 6, 'h')
    s(g, 4, 7, 'h'); s(g, 11, 7, 'h')
    # headset calido: pad fuera de la cara + micro 1px
    s(g, 3, 7, 'r'); s(g, 2, 7, 'o')
    s(g, 4, 8, 'w')
    # mejilla + sonrisa rosa visible
    s(g, 10, 8, 'r')
    # botones del cardigan
    s(g, 7, 12, 'w'); s(g, 7, 13, 'w')
    return g


def custodio():
    g = grid(BASE)
    row(g, 4, 3, 'hhhkkhhh')  # raya al medio
    # camisa blanca bajo chaleco
    s(g, 7, 10, 'w'); s(g, 8, 10, 'w')
    s(g, 3, 11, 'w'); s(g, 12, 11, 'w')
    s(g, 3, 12, 'w'); s(g, 12, 12, 'w')
    # corbatin violeta
    row(g, 6, 11, 'bdb')
    # sello en mano derecha
    s(g, 13, 12, 'a'); s(g, 14, 12, 'o'); s(g, 14, 13, 'o')
    return g


def tesoro():
    g = grid(BASE)
    # mono (bun) arriba a la derecha
    s(g, 12, 0, 'h'); s(g, 13, 0, 'h'); s(g, 14, 0, 'o')
    s(g, 13, 1, 'h'); s(g, 14, 1, 'o')
    # lentes media luna doradas (bajo los ojos)
    s(g, 4, 7, 'G'); s(g, 7, 7, 'G'); s(g, 8, 7, 'G'); s(g, 11, 7, 'G')
    # blusa
    s(g, 7, 10, 'w'); s(g, 8, 10, 'w')
    # calculadora en mano izquierda
    s(g, 1, 11, 'o'); s(g, 2, 11, 'o')
    s(g, 1, 12, 'g'); s(g, 2, 12, 'g')
    s(g, 1, 13, 'w'); s(g, 2, 13, 'w')
    s(g, 1, 14, 'o'); s(g, 2, 14, 'o')
    return g


# ---------- frames (parpadeo especifico de LEDGER-X) ----------

def _ledger_blink_special(b):
    """LEDGER-X no tiene ojos: el glint del visor cambia de lado."""
    s(b, 5, 6, 'v'); s(b, 10, 6, 'l')
    return b


def blink(g, char_id):
    if char_id == 'ledger':
        return _lib_blink(g, special=_ledger_blink_special)
    return _lib_blink(g)


# ---------- plantilla (orden = filas del sheet = orden de AGENTS en agents.ts) ----------
# arms/swing eligen el lado libre: el prop (tablet, calculadora, sello, maletin, taza)
# queda intacto en todos los frames.

CHARS = [
    dict(id='vendo', name='VENDO-1', build=vendo1,
         pal={'k': '#C68642', 'h': '#2E2436', 's': '#9F7BFF', 'd': '#4B23D6',
              'p': '#4B23D6', 'm': '#1A1622', 't': '#FF4D8D', 'g': '#B9A6FF'},
         swing=None, arms='both', spark='G',  # legendary → destello dorado
         sparks_a=SPARKS_L_A, sparks_b=SPARKS_R_A),
    dict(id='flujo', name='FLUJO-7', build=flujo7,
         pal={'k': '#8D5524', 'h': '#2E2436', 's': '#FF4D8D', 'd': '#B3134F',
              'p': '#4B3B66', 'm': '#1A1622', 'r': '#FF9DC0', 'g': '#B9A6FF'},
         swing=12, arms='right', spark='c',  # tablet en mano izquierda
         sparks_a=[(15, 4), (14, 6), (15, 8)], sparks_b=[(15, 2), (14, 7), (15, 6)]),
    dict(id='oraculo', name='ORACULO', build=oraculo,
         pal={'k': '#F2C79B', 'h': '#4B3B66', 's': '#9F7BFF', 'd': '#4B23D6',
              'p': '#4B3B66', 'm': '#1A1622'},
         swing=12, arms='left', spark='c',  # taza al lado derecho
         sparks_a=SPARKS_L_A, sparks_b=SPARKS_L_B),
    dict(id='ledger', name='LEDGER-X', build=ledgerx,
         pal={'k': '#8D5524', 'h': '#1A1622', 's': '#2E2436', 'd': '#17141F',
              'p': '#2E2436', 'm': '#1A1622', 't': '#FF4D8D', 'v': '#17141F'},
         swing=3, arms='left', spark='G',  # legendary → dorado; maletin a la derecha
         sparks_a=SPARKS_L_A, sparks_b=SPARKS_L_B),
    dict(id='musa', name='MUSA-3', build=musa3,
         pal={'k': '#FFDBAC', 'h': '#7A3352', 's': '#9F7BFF', 'd': '#4B23D6',
              'p': '#4B3B66', 'm': '#B3134F', 'b': '#FF4D8D', 'v': '#9F7BFF',
              'g': '#4B3B66'},
         swing=12, arms='both', spark='c',
         sparks_a=SPARKS_L_A, sparks_b=SPARKS_R_A),
    dict(id='empatia', name='EMPATIA-2', build=empatia2,
         pal={'k': '#C68642', 'h': '#6B4226', 's': '#FF6BA3', 'd': '#B3134F',
              'p': '#4B3B66', 'm': '#B3134F', 'r': '#FF9DC0'},
         swing=12, arms='both', spark='c',
         sparks_a=SPARKS_L_A, sparks_b=SPARKS_R_A),
    dict(id='custodio', name='CUSTODIO', build=custodio,
         pal={'k': '#F2C79B', 'h': '#2E2436', 's': '#4B3B66', 'd': '#1A1622',
              'p': '#2E2436', 'm': '#1A1622', 'b': '#9F7BFF', 'a': '#B3134F'},
         swing=3, arms='left', spark='c',  # sello en mano derecha
         sparks_a=SPARKS_L_A, sparks_b=SPARKS_L_B),
    dict(id='tesoro', name='TESORO', build=tesoro,
         pal={'k': '#FFDBAC', 'h': '#6B4226', 's': '#FF4D8D', 'd': '#B3134F',
              'p': '#4B3B66', 'm': '#1A1622', 'g': '#B9A6FF'},
         swing=12, arms='right', spark='c',  # calculadora en mano izquierda
         sparks_a=SPARKS_R_A, sparks_b=SPARKS_R_B),
]


def char_frames(c):
    """Devuelve los 6 frames en orden de columnas: idle-A, idle-B, walk-A, walk-B, cel-A, cel-B."""
    g = c['build']()
    ia, ib = g, blink(g, c['id'])
    wa, wb = walk_frames(g, c['swing'])
    ca, cb = celebrate_frames(g, c['arms'], c['spark'], c['sparks_a'], c['sparks_b'])
    return [ia, ib, wa, wb, ca, cb]


# ---------- emision PNG (RGBA, stdlib puro via spritelib) ----------

def build_sheet_pixels():
    w = SHEET_COLS * CELL_W
    h = SHEET_ROWS * CELL_H
    px = [[(0, 0, 0, 0)] * w for _ in range(h)]
    for r, c in enumerate(CHARS):
        colors = dict(GLOBAL); colors.update(c['pal'])
        for col, fr in enumerate(char_frames(c)):
            ox, oy = col * CELL_W, r * CELL_H
            for y in range(CELL_H):
                for x in range(CELL_W):
                    ch = fr[y][x]
                    if ch == '.':
                        continue
                    if ch not in colors:
                        raise KeyError('%s: letra sin color %r en frame %d (%d,%d)'
                                       % (c['id'], ch, col, x, y))
                    px[oy + y][ox + x] = hex2rgb(colors[ch]) + (255,)
    return px, w, h


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.normpath(os.path.join(here, '..', 'public', 'office', 'sprites.png'))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    px, w, h = build_sheet_pixels()
    save_png_rgba(out, px, w, h)
    print('OK %s %dx%d %.1f KB' % (out, w, h, os.path.getsize(out) / 1024.0))


if __name__ == '__main__':
    main()
