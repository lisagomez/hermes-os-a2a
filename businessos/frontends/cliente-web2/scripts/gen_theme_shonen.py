# -*- coding: utf-8 -*-
"""Generador del sprite sheet del tema "Guerreros Anime" (id: shonen).

Academia de artes marciales / anime shonen ORIGINAL: uniformes de combate
variados (gi, tunicas, armadura ligera), pelos salvajes de colores fantasticos,
bandas, cintas y capas cortas. 100%% original: sin personajes con copyright.

Como regenerar:
    python scripts/gen_theme_shonen.py
  -> escribe public/office/themes/shonen.png (96x160, RGBA, fondo transparente)

Layout del sheet (sin padding, celda exacta 16x20):
  8 FILAS  (orden de AGENTS): vendo, flujo, oraculo, ledger, musa, empatia, custodio, tesoro
  6 COLUMNAS: idle-A, idle-B(parpadeo), walk-A, walk-B, celebrate-A, celebrate-B

Mapeo tematico:
  vendo    -> capitan del dojo (gi violeta, cinturon dorado, pelo blanco hacia atras)
  flujo    -> mensajera ninja veloz (traje rosa, bufanda al viento, coleta larga)
  oraculo  -> sabio estratega (capucha a medio poner, lentes redondos, pergamino)
  ledger   -> guardian blindado (armadura oscura con dorados, visor)
  musa     -> artista mistica (kimono corto, pincel gigante a la espalda)
  empatia  -> sanadora (tunica clara, banda con cruz, mejillas amables)
  custodio -> juez marcial (gi formal oscuro, abanico de guerra plegado)
  tesoro   -> alquimista (delantal con frascos, gafas de laboratorio en la frente)

Solo stdlib via spritelib. Cada letra del grid es 1 pixel; '.' = transparente.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from spritelib import (
    grid, s, row, blink as _lib_blink, walk_frames, celebrate_frames,
    hex2rgb, save_png_rgba,
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

# Paleta global (compartida por todos los personajes del tema)
GLOBAL = {
    'o': '#1A1622',  # outline (violeta casi negro)
    'E': '#1A1622',  # ojos
    'w': '#EDEAF4',  # blanco
    'G': '#FFC24D',  # dorado
    'c': '#28C840',  # verde pocion
    'l': '#B9A6FF',  # lila (lentes/glint)
}


# ---------- personajes (grids idle) ----------

def vendo_capitan():
    """Capitan del dojo: gi violeta, cinturon dorado, pelo blanco hacia atras."""
    g = grid(BASE)
    # pelo blanco peinado hacia atras: puntas que sobresalen por detras (der.)
    s(g, 12, 1, 'h'); s(g, 13, 1, 'o')
    s(g, 12, 2, 'h'); s(g, 13, 2, 'h'); s(g, 14, 2, 'o')
    s(g, 12, 3, 'h'); s(g, 13, 3, 'o')
    row(g, 4, 4, 'hhkkkkhh')            # frente despejada, sienes marcadas
    # solapa del gi en V (blanca)
    s(g, 7, 10, 'w'); s(g, 8, 10, 'w')
    s(g, 6, 11, 'w'); s(g, 9, 11, 'w')
    s(g, 7, 12, 'w'); s(g, 8, 12, 'w')
    # cinturon dorado con nudo
    row(g, 4, 14, 'GGGdGGGG')
    return g


def flujo_ninja():
    """Mensajera ninja: traje rosa cenido, bufanda al viento, coleta larga."""
    g = grid(BASE)
    # banda en la frente
    row(g, 4, 4, 'dddddddd')
    # coleta larga azul cayendo por la derecha
    s(g, 12, 1, 'h'); s(g, 13, 1, 'o')
    for y in (2, 3, 4, 5, 6, 7, 8):
        s(g, 13, y, 'h'); s(g, 14, y, 'o')
    s(g, 13, 9, 'o')
    # bufanda rosa clara al viento (izquierda)
    row(g, 1, 10, 'rrr')
    row(g, 0, 11, 'rr'); s(g, 2, 11, 'o')
    s(g, 0, 12, 'o'); s(g, 1, 12, 'o')
    # cierres del traje
    s(g, 7, 12, 'r'); s(g, 8, 12, 'r')
    return g


def oraculo_sabio():
    """Sabio estratega: capucha a medio poner, lentes redondos, pergamino."""
    g = grid(BASE)
    # capucha verde cubriendo la mitad trasera de la cabeza
    row(g, 8, 1, 'tttt')
    row(g, 8, 2, 'tttt')
    row(g, 8, 3, 'tttt')
    s(g, 11, 4, 't')
    # bulto de la capucha sobre el hombro derecho
    s(g, 12, 4, 't'); s(g, 13, 4, 'o')
    s(g, 12, 5, 't'); s(g, 13, 5, 'o')
    # lentes redondos lila
    row(g, 4, 6, 'lEEllEEl')
    row(g, 4, 7, 'lEEllEEl')
    # pergamino enrollado en la mano izquierda
    s(g, 1, 11, 'o'); s(g, 2, 11, 'o')
    s(g, 1, 12, 'w'); s(g, 2, 12, 'w')
    s(g, 1, 13, 'w'); s(g, 2, 13, 'w')
    s(g, 1, 14, 'o'); s(g, 2, 14, 'o')
    return g


def ledger_guardian():
    """Guardian blindado: armadura oscura, detalles dorados, visor."""
    g = grid(BASE)
    # cresta dorada del casco
    s(g, 7, 1, 'G'); s(g, 8, 1, 'G')
    s(g, 7, 2, 'G'); s(g, 8, 2, 'G')
    s(g, 7, 3, 'G'); s(g, 8, 3, 'G')
    # visor oscuro con glint lila
    row(g, 4, 6, 'vvvvvvvv')
    row(g, 4, 7, 'vvvvvvvv')
    s(g, 5, 6, 'l')
    # hombreras y pecho dorados
    s(g, 3, 11, 'G'); s(g, 12, 11, 'G')
    s(g, 7, 12, 'G'); s(g, 8, 12, 'G')
    # cinturon con hebilla dorada
    s(g, 7, 14, 'G'); s(g, 8, 14, 'G')
    return g


def musa_artista():
    """Artista mistica: kimono corto, pincel gigante a la espalda, mechones rosa."""
    g = grid(BASE)
    # mechones rosa sobre pelo oscuro
    s(g, 5, 2, 'b'); s(g, 9, 2, 'b')
    s(g, 4, 3, 'b'); s(g, 10, 3, 'b')
    # flequillo recto
    row(g, 4, 4, 'hkkkkkkh')
    # pincel gigante a la espalda (derecha): cerdas rosa arriba + mango
    s(g, 13, 0, 'o')
    for y in (1, 2, 3):
        s(g, 13, y, 'b'); s(g, 14, y, 'o')
    for y in (4, 5, 6, 7, 8, 9, 10, 11, 12, 13):
        s(g, 13, y, 'n'); s(g, 14, y, 'o')
    s(g, 13, 14, 'o')
    # cruce del kimono + faja rosa
    s(g, 6, 11, 'w'); s(g, 9, 11, 'w')
    s(g, 7, 10, 'w'); s(g, 8, 10, 'w')
    row(g, 4, 14, 'bbbbbbbb')
    return g


def empatia_sanadora():
    """Sanadora: tunica clara, banda con cruz, expresion amable."""
    g = grid(BASE)
    # banda blanca en la frente con cruz rosa
    row(g, 4, 4, 'wwwtwwww')
    # bob verde enmarcando la cara
    s(g, 4, 5, 'h'); s(g, 11, 5, 'h')
    s(g, 4, 6, 'h'); s(g, 11, 6, 'h')
    s(g, 4, 7, 'h'); s(g, 11, 7, 'h')
    # mejillas amables
    s(g, 5, 8, 'r'); s(g, 10, 8, 'r')
    # cruz rosa en el pecho de la tunica
    s(g, 7, 11, 't'); s(g, 8, 11, 't')
    s(g, 7, 12, 't'); s(g, 8, 12, 't')
    return g


def custodio_juez():
    """Juez marcial: gi formal oscuro, abanico de guerra plegado."""
    g = grid(BASE)
    # raya al medio severa
    row(g, 4, 3, 'hhhkkhhh')
    # colas de la cinta de juez (izquierda, al viento)
    s(g, 2, 3, 't'); s(g, 1, 4, 't'); s(g, 2, 4, 'o')
    # cuello blanco del gi formal
    s(g, 7, 10, 'w'); s(g, 8, 10, 'w')
    s(g, 6, 11, 'w'); s(g, 9, 11, 'w')
    # abanico de guerra plegado (dorado) en la mano derecha
    s(g, 13, 10, 'o')
    s(g, 13, 11, 'G'); s(g, 14, 11, 'o')
    s(g, 13, 12, 'G'); s(g, 14, 12, 'o')
    s(g, 13, 13, 'o'); s(g, 14, 13, 'o')
    return g


def tesoro_alquimista():
    """Alquimista: delantal con frascos, gafas de laboratorio en la frente."""
    g = grid(BASE)
    # dos monos (buns) laterales rosa
    s(g, 2, 2, 'h'); s(g, 1, 2, 'o'); s(g, 2, 3, 'h'); s(g, 1, 3, 'o')
    s(g, 2, 1, 'o'); s(g, 2, 4, 'o')
    s(g, 13, 2, 'h'); s(g, 14, 2, 'o'); s(g, 13, 3, 'h'); s(g, 14, 3, 'o')
    s(g, 13, 1, 'o'); s(g, 13, 4, 'o')
    # gafas de laboratorio en la frente (banda + dos lentes lila)
    s(g, 4, 2, 'd'); s(g, 5, 2, 'l'); s(g, 6, 2, 'l')
    s(g, 7, 2, 'd'); s(g, 8, 2, 'd')
    s(g, 9, 2, 'l'); s(g, 10, 2, 'l'); s(g, 11, 2, 'd')
    # delantal blanco al frente
    row(g, 6, 11, 'wwww')
    s(g, 6, 12, 'c'); s(g, 7, 12, 'w'); s(g, 8, 12, 'w'); s(g, 9, 12, 't')
    row(g, 6, 13, 'wwww')
    return g


# ---------- parpadeo especial (guardian sin ojos visibles) ----------

def _ledger_blink_special(b):
    """El guardian no muestra ojos: el glint del visor cambia de lado."""
    s(b, 5, 6, 'v'); s(b, 10, 6, 'l')
    return b


def blink(g, char_id):
    if char_id == 'ledger':
        return _lib_blink(g, special=_ledger_blink_special)
    return _lib_blink(g)


# ---------- aura de energia (celebrate) ----------
# Halo de 2-3px alrededor del personaje; solo pinta sobre pixeles vacios.

AURA_A = [(1, 1), (0, 4), (1, 7), (0, 10), (1, 13), (2, 16),
          (14, 1), (15, 4), (14, 7), (15, 10), (14, 13), (13, 16),
          (5, 0), (10, 0), (7, 19), (8, 19)]
AURA_B = [(0, 2), (1, 5), (0, 8), (1, 11), (0, 14), (3, 16),
          (15, 2), (14, 5), (15, 8), (14, 11), (15, 14), (12, 16),
          (4, 0), (11, 0), (6, 19), (9, 19)]


def aplicar_aura(fr, puntos):
    for i, (x, y) in enumerate(puntos):
        if fr[y][x] == '.':
            fr[y][x] = 'A' if i % 2 == 0 else 'B'
    return fr


# ---------- plantilla (orden = filas del sheet = orden de AGENTS) ----------
# arms/swing eligen el lado libre: el prop (pergamino, pincel, abanico, coleta)
# queda intacto en todos los frames. A/B = colores del aura de energia:
# blanco/dorado en legendaries (vendo, ledger), violeta/rosa en el resto.

AURA_LEGENDARY = {'A': '#FFC24D', 'B': '#EDEAF4'}
AURA_NORMAL = {'A': '#9F7BFF', 'B': '#FF4D8D'}

CHARS = [
    dict(id='vendo', name='CAPITAN DEL DOJO', build=vendo_capitan,
         pal={'k': '#C68642', 'h': '#EDEAF4', 's': '#9F7BFF', 'd': '#4B23D6',
              'p': '#4B23D6', 'm': '#1A1622'},
         aura=AURA_LEGENDARY, swing=12, arms='both'),
    dict(id='flujo', name='MENSAJERA NINJA', build=flujo_ninja,
         pal={'k': '#8D5524', 'h': '#4B23D6', 's': '#FF4D8D', 'd': '#B3134F',
              'p': '#B3134F', 'm': '#1A1622', 'r': '#FF9DC0'},
         aura=AURA_NORMAL, swing=12, arms='right'),  # bufanda a la izquierda
    dict(id='oraculo', name='SABIO ESTRATEGA', build=oraculo_sabio,
         pal={'k': '#F2C79B', 'h': '#9F7BFF', 's': '#2A9D8F', 'd': '#1F7468',
              'p': '#1F7468', 'm': '#1A1622', 't': '#2A9D8F'},
         aura=AURA_NORMAL, swing=12, arms='right'),  # pergamino a la izquierda
    dict(id='ledger', name='GUARDIAN BLINDADO', build=ledger_guardian,
         pal={'k': '#8D5524', 'h': '#3A2F52', 's': '#3A2F52', 'd': '#241E31',
              'p': '#2E2436', 'm': '#1A1622', 'v': '#17141F'},
         aura=AURA_LEGENDARY, swing=3, arms='both'),
    dict(id='musa', name='ARTISTA MISTICA', build=musa_artista,
         pal={'k': '#FFDBAC', 'h': '#2E2436', 's': '#9F7BFF', 'd': '#4B23D6',
              'p': '#4B3B66', 'm': '#B3134F', 'b': '#FF4D8D', 'n': '#8A5A2B'},
         aura=AURA_NORMAL, swing=3, arms='left'),  # pincel a la derecha
    dict(id='empatia', name='SANADORA', build=empatia_sanadora,
         pal={'k': '#C68642', 'h': '#2A9D8F', 's': '#F3EFFA', 'd': '#C9BCE8',
              'p': '#C9BCE8', 'm': '#B3134F', 'r': '#FF9DC0', 't': '#FF4D8D'},
         aura=AURA_NORMAL, swing=12, arms='both'),
    dict(id='custodio', name='JUEZ MARCIAL', build=custodio_juez,
         pal={'k': '#F2C79B', 'h': '#4B3B66', 's': '#2E2436', 'd': '#9F7BFF',
              'p': '#241E31', 'm': '#1A1622', 't': '#FF4D8D'},
         aura=AURA_NORMAL, swing=3, arms='left'),  # abanico a la derecha
    dict(id='tesoro', name='ALQUIMISTA', build=tesoro_alquimista,
         pal={'k': '#FFDBAC', 'h': '#FF4D8D', 's': '#4B23D6', 'd': '#35189E',
              'p': '#35189E', 'm': '#1A1622', 't': '#FF4D8D'},
         aura=AURA_NORMAL, swing=12, arms='both'),
]


def char_frames(c):
    """6 frames en orden de columnas: idle-A, idle-B, walk-A, walk-B, cel-A, cel-B."""
    g = c['build']()
    ia, ib = g, blink(g, c['id'])
    wa, wb = walk_frames(g, c['swing'])
    ca, cb = celebrate_frames(g, c['arms'], 'A', [], [])
    ca = aplicar_aura(ca, AURA_A)
    cb = aplicar_aura(cb, AURA_B)
    return [ia, ib, wa, wb, ca, cb]


# ---------- emision del sheet ----------

def build_sheet_pixels():
    w = SHEET_COLS * CELL_W
    h = SHEET_ROWS * CELL_H
    px = [[(0, 0, 0, 0)] * w for _ in range(h)]
    for r, c in enumerate(CHARS):
        colors = dict(GLOBAL)
        colors.update(c['pal'])
        colors.update(c['aura'])
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
    out = os.path.normpath(os.path.join(here, '..', 'public', 'office', 'themes', 'shonen.png'))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    px, w, h = build_sheet_pixels()
    save_png_rgba(out, px, w, h)
    print('OK %s %dx%d %.1f KB' % (out, w, h, os.path.getsize(out) / 1024.0))


if __name__ == '__main__':
    main()
