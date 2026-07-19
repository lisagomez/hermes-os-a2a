# -*- coding: utf-8 -*-
"""Generador del sprite sheet de produccion — personajes pixel A2A (v2, 20x28).

FUENTE DE VERDAD editable de los 8 agentes de la oficina, ahora con CUERPO
COMPLETO estilo "profesiones pixel" (cabeza ~1/3, brazos diferenciados,
manos 2x2 que sostienen el prop, piernas separadas, calzado oscuro).

Como regenerar:
    python scripts/gen_sprites.py
  → escribe public/office/sprites.png (120x224, RGBA, fondo transparente)

Layout del sheet (sin padding, celda exacta 20x28 — ver anatomy.py):
  8 FILAS  (orden de AGENTS): vendo, flujo, oraculo, ledger, musa, empatia, custodio, tesoro
  6 COLUMNAS: idle-A, idle-B(parpadeo), walk-A, walk-B, celebrate-A, celebrate-B

Contrato TS que consume este sheet:
  src/features/landing/sections/office/sprites.ts

Solo stdlib. Cada letra del grid es 1 pixel; '.' = transparente.
Paleta: SOLO design system + tonos de piel/pelo establecidos.
"""
import os

import anatomy as A
from anatomy import grid, s, row, blink28, walk28, celebrate28, hex2rgb, save_png_rgba

CELL_W, CELL_H = A.CELL_W, A.CELL_H
SHEET_COLS, SHEET_ROWS = A.SHEET_COLS, A.SHEET_ROWS

# Paleta global de marca (compartida por todos los personajes)
GLOBAL = {
    'o': '#1A1622',  # outline (violeta casi negro)
    'E': '#1A1622',  # ojos
    'w': '#EDEAF4',  # blanco texto / glint
    'G': '#FFC24D',  # dorado claro (legendary)
    'c': '#28C840',  # verde exito
    'l': '#B9A6FF',  # lila
}


# ---------- personajes (grids idle 20x28) ----------

def vendo1():
    """El Closer: saco violeta, corbata rosa, headset, botones dorados."""
    g = grid(A.BASE_BODY)
    # headset: pad fuera de la cara + micro
    s(g, 3, 5, 'o'); s(g, 3, 6, 'o')
    s(g, 4, 5, 'g'); s(g, 4, 6, 'g')
    s(g, 4, 7, 'o'); s(g, 4, 8, 'g')          # brazo del micro + capsula
    # cuello de camisa + corbata rosa
    s(g, 9, 10, 'w'); s(g, 10, 10, 'w')
    s(g, 9, 11, 't'); s(g, 10, 11, 't')
    s(g, 9, 12, 't'); s(g, 10, 12, 't')
    s(g, 9, 13, 't')
    # saco cruzado: botones dorados (legendary)
    s(g, 7, 12, 'G'); s(g, 12, 12, 'G')
    s(g, 7, 14, 'G'); s(g, 12, 14, 'G')
    return g


def flujo7():
    """La Logistica: chaleco reflectivo rosa, coleta alta, tablet en mano."""
    g = grid(A.BASE_BODY)
    # coleta alta lateral derecha
    s(g, 15, 1, 'o')
    for y in (2, 3, 4):
        s(g, 15, y, 'h'); s(g, 16, y, 'o')
    s(g, 15, 5, 'o')
    # chaleco reflectivo: franjas blancas verticales sobre el rosa
    for y in (11, 12, 13, 14):
        s(g, 7, y, 'w'); s(g, 12, y, 'w')
    # tablet sostenida en la mano izquierda (margen col 0-2)
    row(g, 0, 12, 'ooo')
    for y in (13, 14, 15, 16):
        s(g, 0, y, 'o'); s(g, 1, y, 'g')
    s(g, 1, 13, 'w')                           # glint de pantalla
    row(g, 0, 17, 'ooo')
    return g


def oraculo():
    """El Vidente: gafas grandes lila, hoodie violeta con bolsillo, taza."""
    g = grid(A.BASE_BODY)
    # despeinado: silueta dentada arriba
    s(g, 8, 0, '.'); s(g, 8, 1, 'o')
    s(g, 11, 0, '.'); s(g, 11, 1, 'o')
    # gafas grandes lila (marcos 'l', ojos dentro)
    row(g, 6, 5, 'lEwllEwl')
    row(g, 6, 6, 'lEEllEEl')
    # hoodie: bulto de capucha junto al cuello + cordones + bolsillo
    s(g, 6, 9, 's'); s(g, 13, 9, 's')
    s(g, 8, 11, 'w'); s(g, 11, 11, 'w')
    s(g, 8, 12, 'w'); s(g, 11, 12, 'w')
    row(g, 8, 15, 'dddd'); row(g, 8, 16, 'dddd')
    # taza de cafe en la mano derecha (margen col 17-19)
    s(g, 18, 11, 'w')                          # vapor
    s(g, 17, 13, 'o'); s(g, 18, 13, 'o')
    s(g, 17, 14, 'w'); s(g, 18, 14, 'w'); s(g, 19, 14, 'o')
    s(g, 17, 15, 'w'); s(g, 18, 15, 'w'); s(g, 19, 15, 'o')
    s(g, 17, 16, 'o'); s(g, 18, 16, 'o')
    return g


def ledgerx():
    """El Custodio On-chain: visor con glint lila, traje oscuro + dorado,
    maletin en mano, zapatos brillantes."""
    g = grid(A.BASE_BODY)
    # visor oscuro con glint lila
    row(g, 6, 5, 'vvvvvvvv')
    row(g, 6, 6, 'vvvvvvvv')
    s(g, 7, 5, 'l')
    # solapas + camisa + corbata con pisacorbatas dorado
    s(g, 7, 11, 'd'); s(g, 12, 11, 'd')
    s(g, 9, 10, 'w'); s(g, 10, 10, 'w')
    s(g, 9, 11, 't'); s(g, 10, 11, 't')
    s(g, 9, 12, 't'); s(g, 10, 12, 't')
    s(g, 9, 13, 't'); s(g, 9, 14, 'G')
    # gemelos dorados (legendary)
    s(g, 4, 14, 'G'); s(g, 15, 14, 'G')
    # maletin colgando de la mano derecha
    s(g, 16, 17, 'o'); s(g, 17, 17, 'o')       # asa
    row(g, 15, 18, 'oooo')
    s(g, 15, 19, 'o'); s(g, 16, 19, 's'); s(g, 17, 19, 's'); s(g, 18, 19, 'o')
    s(g, 15, 20, 'o'); s(g, 16, 20, 'G'); s(g, 17, 20, 's'); s(g, 18, 20, 'o')
    row(g, 15, 21, 'oooo')
    # zapatos brillantes
    s(g, 7, 26, 'w'); s(g, 12, 26, 'w')
    return g


def musa3():
    """La Creativa: boina rosa, mechon violeta, audifonos al cuello,
    overol, pincel en mano."""
    g = grid(A.BASE_BODY)
    # boina rosa (outline duro arriba + banda ancha + brim)
    row(g, 4, 0, 'oooooooooooo')
    row(g, 4, 1, 'obbbbbbbbbbo')
    row(g, 5, 2, 'obbbbbbbbo')
    # mechon violeta
    s(g, 12, 3, 'v'); s(g, 13, 3, 'v')
    # audifonos al cuello (pads lila flanqueando el cuello)
    s(g, 6, 9, 'l'); s(g, 13, 9, 'l')
    # overol: tirantes + peto con bolsillo
    s(g, 7, 10, 'd'); s(g, 12, 10, 'd')
    s(g, 7, 11, 'd'); s(g, 12, 11, 'd')
    for y in (12, 13, 14, 15, 16):
        row(g, 7, y, 'dddddd')
    s(g, 9, 14, 'w'); s(g, 10, 14, 'w')
    # pincel vertical en la mano derecha
    s(g, 17, 12, 'l')                          # punta con pintura lila
    s(g, 17, 13, 'G')                          # virola dorada
    s(g, 17, 14, 'a'); s(g, 17, 15, 'a'); s(g, 17, 16, 'a')
    return g


def empatia2():
    """La Anfitriona: headset calido, cardigan rosa suave, sonrisa,
    portapapeles en mano."""
    g = grid(A.BASE_BODY)
    # bob redondeado enmarcando la cara
    for y in (5, 6, 7):
        s(g, 6, y, 'h'); s(g, 13, y, 'h')
    # sonrisa visible + mejillas rosadas
    s(g, 8, 7, 'r'); s(g, 11, 7, 'r')
    # headset calido: pad fuera de la cara + micro
    s(g, 3, 5, 'o'); s(g, 3, 6, 'o')
    s(g, 4, 5, 'r'); s(g, 4, 6, 'r')
    s(g, 4, 7, 'o'); s(g, 4, 8, 'w')
    # cardigan abierto: blusa clara al centro
    for y in (11, 12, 13, 14):
        s(g, 9, y, 'w'); s(g, 10, y, 'w')
    # portapapeles en la mano izquierda (clip dorado)
    s(g, 1, 11, 'G')
    row(g, 0, 12, 'ooo')
    for y in (13, 14, 15, 16):
        s(g, 0, y, 'o'); s(g, 1, y, 'w')
    row(g, 0, 17, 'ooo')
    return g


def custodio():
    """El Notario: corbatin, chaleco gris-violeta sobre camisa, sello en
    mano, peinado formal."""
    g = grid(A.BASE_BODY)
    row(g, 6, 3, 'hhhkkhhh')                   # raya al medio
    # camisa blanca bajo el chaleco
    s(g, 9, 10, 'w'); s(g, 10, 10, 'w')
    for y in (12, 13, 14):
        s(g, 9, y, 'w'); s(g, 10, y, 'w')
    # corbatin lila
    s(g, 8, 11, 'b'); s(g, 9, 11, 'o'); s(g, 10, 11, 'o'); s(g, 11, 11, 'b')
    # sello en la mano derecha (pomo + base)
    s(g, 17, 13, 'a'); s(g, 17, 14, 'o')
    s(g, 17, 15, 'o'); s(g, 18, 15, 'o')
    s(g, 17, 16, 'o'); s(g, 18, 16, 'o')
    return g


def tesoro():
    """La Contadora: lentes de media luna doradas, mono, saco,
    calculadora en mano."""
    g = grid(A.BASE_BODY)
    # mono (bun) lateral
    s(g, 14, 0, 'o')
    s(g, 14, 1, 'h'); s(g, 15, 1, 'o')
    s(g, 14, 2, 'h'); s(g, 15, 2, 'o')
    # lentes media luna doradas (bajo los ojos)
    s(g, 7, 6, 'G'); s(g, 8, 6, 'G'); s(g, 11, 6, 'G'); s(g, 12, 6, 'G')
    # blusa + broche dorado
    s(g, 9, 10, 'w'); s(g, 10, 10, 'w')
    s(g, 9, 11, 'w'); s(g, 10, 11, 'w')
    s(g, 9, 12, 'G')
    # calculadora en la mano izquierda (pantalla lila + teclas)
    row(g, 0, 12, 'ooo')
    s(g, 0, 13, 'o'); s(g, 1, 13, 'g')
    for y in (14, 15, 16):
        s(g, 0, y, 'o'); s(g, 1, y, 'w')
    row(g, 0, 17, 'ooo')
    return g


# ---------- parpadeo especifico de LEDGER-X ----------

def _ledger_blink_special(b):
    """LEDGER-X no tiene ojos: el glint del visor cambia de lado."""
    s(b, 7, 5, 'v'); s(b, 12, 5, 'l')
    return b


def blink(g, c):
    if c['id'] == 'ledger':
        return blink28(g, special=_ledger_blink_special)
    return blink28(g, closed_ch=c.get('closed_ch', 'k'))


# ---------- plantilla (orden = filas del sheet = orden de AGENTS en agents.ts) ----------
# prop_side: la mano que sostiene el prop no se balancea en walk ni se alza
# en celebrate (arms = el lado LIBRE). Piel repartida 2-2-2-2:
#   C68642: vendo, empatia | 8D5524: flujo, ledger
#   F2C79B: oraculo, custodio | FFDBAC: musa, tesoro

CHARS = [
    dict(id='vendo', name='VENDO-1', build=vendo1,
         pal={'k': '#C68642', 'h': '#2E2436', 's': '#9F7BFF', 'd': '#4B23D6',
              'p': '#4B3B66', 'z': '#17141F', 'm': '#1A1622', 't': '#FF4D8D',
              'g': '#B9A6FF'},
         prop_side=None, arms='both', spark='G'),   # legendary → destello dorado
    dict(id='flujo', name='FLUJO-7', build=flujo7,
         pal={'k': '#8D5524', 'h': '#2E2436', 's': '#FF4D8D', 'd': '#B3134F',
              'p': '#4B3B66', 'z': '#17141F', 'm': '#1A1622', 'g': '#B9A6FF'},
         prop_side='left', arms='right', spark='c'),  # tablet en mano izq
    dict(id='oraculo', name='ORACULO', build=oraculo,
         pal={'k': '#F2C79B', 'h': '#4B3B66', 's': '#9F7BFF', 'd': '#4B23D6',
              'p': '#4B3B66', 'z': '#17141F', 'm': '#1A1622'},
         prop_side='right', arms='left', spark='c', closed_ch='l'),  # taza der
    dict(id='ledger', name='LEDGER-X', build=ledgerx,
         pal={'k': '#8D5524', 'h': '#1A1622', 's': '#2E2436', 'd': '#17141F',
              'p': '#2E2436', 'z': '#17141F', 'm': '#1A1622', 't': '#FF4D8D',
              'v': '#4B3B66'},
         prop_side='right', arms='left', spark='G'),  # legendary; maletin der
    dict(id='musa', name='MUSA-3', build=musa3,
         pal={'k': '#FFDBAC', 'h': '#7A3352', 's': '#9F7BFF', 'd': '#4B3B66',
              'p': '#4B23D6', 'z': '#17141F', 'm': '#B3134F', 'b': '#FF4D8D',
              'v': '#9F7BFF', 'a': '#B3134F'},
         prop_side='right', arms='left', spark='c'),  # pincel en mano der
    dict(id='empatia', name='EMPATIA-2', build=empatia2,
         pal={'k': '#C68642', 'h': '#6B4226', 's': '#FF6BA3', 'd': '#B3134F',
              'p': '#4B3B66', 'z': '#17141F', 'm': '#B3134F', 'r': '#FF9DC0'},
         prop_side='left', arms='right', spark='c'),  # portapapeles izq
    dict(id='custodio', name='CUSTODIO', build=custodio,
         pal={'k': '#F2C79B', 'h': '#2E2436', 's': '#4B3B66', 'd': '#2E2436',
              'p': '#4B3B66', 'z': '#17141F', 'm': '#1A1622', 'b': '#9F7BFF',
              'a': '#B3134F'},
         prop_side='right', arms='left', spark='c'),  # sello en mano der
    dict(id='tesoro', name='TESORO', build=tesoro,
         pal={'k': '#FFDBAC', 'h': '#6B4226', 's': '#FF4D8D', 'd': '#B3134F',
              'p': '#4B3B66', 'z': '#17141F', 'm': '#1A1622', 'g': '#B9A6FF'},
         prop_side='left', arms='right', spark='c'),  # calculadora izq
]
assert len(CHARS) == SHEET_ROWS


def char_frames(c):
    """Los 6 frames en orden de columnas: idle-A, idle-B, walk-A, walk-B, cel-A, cel-B."""
    g = c['build']()
    ia, ib = g, blink(g, c)
    wa, wb = walk28(g, c['prop_side'])
    ca, cb = celebrate28(g, c['arms'], c['spark'])
    return [ia, ib, wa, wb, ca, cb]


# ---------- emision PNG (RGBA, stdlib puro via spritelib) ----------

def build_sheet_pixels():
    w = SHEET_COLS * CELL_W
    h = SHEET_ROWS * CELL_H
    assert (w, h) == (A.SHEET_W, A.SHEET_H)
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
