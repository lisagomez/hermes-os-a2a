# -*- coding: utf-8 -*-
"""Generador del sprite sheet del tema "Once Ideal" (id: futbol) — Oficina A2A.

Club FICTICIO "A2A FC": kits inventados mezclando la paleta A2A
(violeta #9F7BFF, rosa #FF4D8D, dorado #FFC24D) con clasicos genericos
(blanco, negro, teal #2A9D8F). Ningun kit reproduce uniformes de clubes
o selecciones reales; personajes 100% originales.

Como regenerar:
    python scripts/gen_theme_futbol.py
  → escribe public/office/themes/futbol.png (96x160, RGBA, fondo transparente)

Layout (identico al contrato de gen_sprites.py):
  8 FILAS  (orden de AGENTS): vendo, flujo, oraculo, ledger, musa,
                              empatia, custodio, tesoro
  6 COLUMNAS: idle-A, idle-B(parpadeo), walk-A, walk-B, celebrate-A, celebrate-B
  Celda exacta 16x20, sin padding, outline #1A1622, fondo alpha 0.

Piernas de futbolista (obligatorias): short 2px (filas 14-15) + rodilla
piel 1px (fila 16) + media de color 1px (fila 17) + botin oscuro (fila 18).
El walk usa walk_frames con leg_fill_ch='q' (botin) sobre esas filas.
TESORO (directora tecnica) es la UNICA sin kit: traje oscuro con piernas
A2A estandar + tabla tactica en la mano.

Celebrate-B: mini balon pixel (2x2, blanco/outline) sobre la cabeza
(esquina superior, unica zona libre de la celda) + destello dorado para
los legendaries (vendo, ledger) y verde para el resto.
"""
import os

from spritelib import (
    grid, s, row, blink, walk_frames, celebrate_frames, compose_sheet,
    SPARKS_L_A, SPARKS_L_B, SPARKS_R_A, SPARKS_R_B,
)

W, H = 16, 20
CELL_W, CELL_H = 16, 20
SHEET_COLS, SHEET_ROWS = 6, 8

# Base futbolista: jersey + short (d) + rodilla piel (k) + media (z) + botin (q)
BASE_FUT = [
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
    "...oddo..oddo...",
    "...okko..okko...",
    "...ozzo..ozzo...",
    "...oqqo..oqqo...",
    "................",
]

# Base DT (tesoro): traje con piernas A2A estandar (pantalon p + zapato o)
BASE_DT = BASE_FUT[:14] + [
    "...o" + "d" * 8 + "o...",
    "...oppo..oppo...",
    "...oppo..oppo...",
    "...oppo..oppo...",
    "...oooo..oooo...",
    "................",
]

for _b in (BASE_FUT, BASE_DT):
    assert all(len(r) == W for r in _b), [len(r) for r in _b]
    assert len(_b) == H

GLOBAL = {
    'o': '#1A1622',  # outline (violeta casi negro)
    'E': '#1A1622',  # ojos
    'w': '#EDEAF4',  # blanco
    'G': '#FFC24D',  # dorado (legendary)
    'c': '#28C840',  # verde exito
    'l': '#B9A6FF',  # lila
}

# Balon pixel 2x2 (blanco + parches outline) para celebrate-B, sobre la
# cabeza en la esquina superior izquierda (zona libre en los 8 personajes).
BALL_X, BALL_Y = 1, 0


def _stamp_ball(g):
    s(g, BALL_X, BALL_Y, 'o'); s(g, BALL_X + 1, BALL_Y, 'w')
    s(g, BALL_X, BALL_Y + 1, 'w'); s(g, BALL_X + 1, BALL_Y + 1, 'o')


# ---------- personajes (grids idle) ----------

def vendo():
    """Capitan delantero #9: kit violeta/short dorado + banda de capitan."""
    g = grid(BASE_FUT)
    row(g, 4, 3, 'hkkkkkhh')            # peinado corto con raya lateral
    s(g, 12, 11, 'G')                   # banda de capitan (brazo derecho)
    s(g, 7, 10, 'G'); s(g, 8, 10, 'G')  # cuello con vivo dorado
    # numero 9 (2x3)
    s(g, 7, 11, 'N'); s(g, 8, 11, 'N')
    s(g, 7, 12, 'N'); s(g, 8, 12, 'N')
    s(g, 8, 13, 'N')
    return g


def flujo():
    """Lateral veloz #2: kit rosa/negro, coleta alta y balon bajo el pie."""
    g = grid(BASE_FUT)
    # coleta alta lateral derecha (silueta)
    s(g, 13, 1, 'o')
    for y in (2, 3, 4, 5):
        s(g, 13, y, 'h'); s(g, 14, y, 'o')
    s(g, 13, 6, 'o')
    # numero 2 (2x3)
    s(g, 7, 11, 'N'); s(g, 8, 11, 'N')
    s(g, 8, 12, 'N')
    s(g, 7, 13, 'N'); s(g, 8, 13, 'N')
    # balon bajo el pie derecho (2x2)
    s(g, 13, 17, 'o'); s(g, 14, 17, 'w')
    s(g, 13, 18, 'w'); s(g, 14, 18, 'o')
    return g


def oraculo():
    """ARQUERO #1: jersey teal (distinto al resto) + guantes dorados grandes."""
    g = grid(BASE_FUT)
    # despeinado: muescas en la silueta superior
    s(g, 5, 0, '.'); s(g, 9, 0, '.')
    s(g, 5, 1, 'o'); s(g, 9, 1, 'o')
    # guantes dorados 2x2 (mas anchos que las manos: silueta de arquero)
    s(g, 3, 12, 'v'); s(g, 12, 12, 'v')
    s(g, 3, 13, 'v'); s(g, 12, 13, 'v')
    s(g, 2, 13, 'v'); s(g, 13, 13, 'v')
    s(g, 1, 13, 'o'); s(g, 14, 13, 'o')
    # numero 1 (1x3)
    s(g, 8, 11, 'N'); s(g, 8, 12, 'N'); s(g, 8, 13, 'N')
    return g


def ledger():
    """Defensa central imponente #4: kit oscuro/dorado, flat-top y hombros anchos."""
    g = grid(BASE_FUT)
    row(g, 3, 0, 'o' * 10)                    # flat-top: craneo cuadrado ancho
    row(g, 3, 10, 'o' + 's' * 8 + 'o')        # hombros mas anchos
    s(g, 5, 5, 'h'); s(g, 6, 5, 'h')          # cejas gruesas
    s(g, 9, 5, 'h'); s(g, 10, 5, 'h')
    s(g, 4, 11, 'G'); s(g, 11, 11, 'G')       # vivos dorados en el pecho
    # numero 4 (2x3)
    s(g, 7, 11, 'N')
    s(g, 7, 12, 'N'); s(g, 8, 12, 'N')
    s(g, 8, 13, 'N')
    return g


def musa():
    """Mediapunta creativa #10: kit violeta claro y pelo suelto largo."""
    g = grid(BASE_FUT)
    # melena suelta cayendo por ambos lados (ensancha la cabeza)
    for y in (5, 6, 7, 8):
        s(g, 3, y, 'h'); s(g, 2, y, 'o')
        s(g, 12, y, 'h'); s(g, 13, y, 'o')
    s(g, 3, 9, 'h'); s(g, 2, 9, 'o')          # puntas
    s(g, 12, 9, 'h'); s(g, 13, 9, 'o')
    # numero 10 (1 + bloque 0, cada digito <= 2x3)
    s(g, 6, 11, 'N'); s(g, 6, 12, 'N'); s(g, 6, 13, 'N')
    s(g, 8, 11, 'N'); s(g, 9, 11, 'N')
    s(g, 8, 12, 'N'); s(g, 9, 12, 'N')
    s(g, 8, 13, 'N'); s(g, 9, 13, 'N')
    return g


def empatia():
    """Delantera alegre #11: kit rosa suave, coleta baja y mejillas."""
    g = grid(BASE_FUT)
    # coleta baja lateral izquierda
    s(g, 2, 2, 'o')
    for y in (3, 4, 5):
        s(g, 2, y, 'h'); s(g, 1, y, 'o')
    s(g, 2, 6, 'o')
    # mejillas rosadas
    s(g, 5, 8, 'r'); s(g, 10, 8, 'r')
    # numero 11 (dos barras 1x3)
    s(g, 6, 11, 'N'); s(g, 6, 12, 'N'); s(g, 6, 13, 'N')
    s(g, 9, 11, 'N'); s(g, 9, 12, 'N'); s(g, 9, 13, 'N')
    return g


def custodio():
    """Mediocampista de contencion #5: kit gris/violeta + cinta en la cabeza."""
    g = grid(BASE_FUT)
    row(g, 4, 3, 'b' * 8)                     # cinta en la frente
    s(g, 13, 3, 'b'); s(g, 14, 3, 'o')        # cola de la cinta (silueta)
    # numero 5 (2x3)
    s(g, 7, 11, 'N'); s(g, 8, 11, 'N')
    s(g, 7, 12, 'N')
    s(g, 7, 13, 'N'); s(g, 8, 13, 'N')
    return g


def tesoro():
    """Directora tecnica en la banda: traje + mono + tabla tactica (sin kit)."""
    g = grid(BASE_DT)
    # mono (bun) arriba a la derecha
    s(g, 12, 0, 'h'); s(g, 13, 0, 'h'); s(g, 14, 0, 'o')
    s(g, 13, 1, 'h'); s(g, 14, 1, 'o')
    # blusa blanca bajo el blazer
    s(g, 7, 10, 'w'); s(g, 8, 10, 'w')
    # tabla tactica en mano izquierda (borde + pizarra con marcas)
    s(g, 1, 11, 'o'); s(g, 2, 11, 'o')
    s(g, 1, 12, 'w'); s(g, 2, 12, 'g')
    s(g, 1, 13, 'w'); s(g, 2, 13, 'g')
    s(g, 1, 14, 'o'); s(g, 2, 14, 'o')
    return g


# ---------- plantilla (orden = filas del sheet = orden de AGENTS) ----------
# legs: 'fut' usa el walk con botin (leg_fill_ch='q'); 'dt' usa el default A2A.
# 4 tonos de piel repartidos: F2C79B (oraculo, custodio), C68642 (vendo,
# empatia), 8D5524 (flujo, ledger), FFDBAC (musa, tesoro).

CHARS = [
    dict(id='vendo', build=vendo, legs='fut',
         pal={'k': '#C68642', 'h': '#2E2436', 's': '#9F7BFF', 'd': '#FFC24D',
              'z': '#4B23D6', 'q': '#2E2436', 'N': '#EDEAF4', 'm': '#1A1622'},
         swing=12, arms='both', spark='G',  # legendary → destello dorado
         sparks_a=SPARKS_L_A, sparks_b=SPARKS_R_A),
    dict(id='flujo', build=flujo, legs='fut',
         pal={'k': '#8D5524', 'h': '#1A1622', 's': '#FF4D8D', 'd': '#17141F',
              'z': '#FF4D8D', 'q': '#2E2436', 'N': '#EDEAF4', 'm': '#1A1622'},
         swing=12, arms='both', spark='c',  # balon en el pie, no en la mano
         sparks_a=SPARKS_L_A, sparks_b=SPARKS_L_B),
    dict(id='oraculo', build=oraculo, legs='fut',
         pal={'k': '#F2C79B', 'h': '#4B3B66', 's': '#2A9D8F', 'd': '#17141F',
              'z': '#2A9D8F', 'q': '#2E2436', 'N': '#EDEAF4', 'm': '#1A1622',
              'v': '#FFC24D'},
         swing=None, arms='both', spark='c',  # arquero: guantes arriba
         sparks_a=SPARKS_L_A, sparks_b=SPARKS_L_B),
    dict(id='ledger', build=ledger, legs='fut',
         pal={'k': '#8D5524', 'h': '#17141F', 's': '#2E2436', 'd': '#17141F',
              'z': '#FFC24D', 'q': '#17141F', 'N': '#FFC24D', 'm': '#1A1622'},
         swing=12, arms='both', spark='G',  # legendary → destello dorado
         sparks_a=SPARKS_L_A, sparks_b=SPARKS_L_B),
    dict(id='musa', build=musa, legs='fut',
         pal={'k': '#FFDBAC', 'h': '#7A3352', 's': '#B9A6FF', 'd': '#EDEAF4',
              'z': '#B9A6FF', 'q': '#2E2436', 'N': '#4B23D6', 'm': '#B3134F'},
         swing=12, arms='both', spark='c',
         sparks_a=SPARKS_L_A, sparks_b=[(0, 6), (1, 2), (0, 3)]),  # evita melena
    dict(id='empatia', build=empatia, legs='fut',
         pal={'k': '#C68642', 'h': '#2E2436', 's': '#FF9DC0', 'd': '#EDEAF4',
              'z': '#FF9DC0', 'q': '#2E2436', 'N': '#B3134F', 'm': '#B3134F',
              'r': '#FF4D8D'},
         swing=12, arms='both', spark='c',  # coleta izquierda → sparks derecha
         sparks_a=SPARKS_R_A, sparks_b=SPARKS_R_B),
    dict(id='custodio', build=custodio, legs='fut',
         pal={'k': '#F2C79B', 'h': '#6B4226', 's': '#75717F', 'd': '#4B3B66',
              'z': '#75717F', 'q': '#17141F', 'N': '#EDEAF4', 'm': '#1A1622',
              'b': '#9F7BFF'},
         swing=12, arms='both', spark='c',  # cola de cinta derecha → sparks izq
         sparks_a=SPARKS_L_A, sparks_b=SPARKS_L_B),
    dict(id='tesoro', build=tesoro, legs='dt',
         pal={'k': '#FFDBAC', 'h': '#6B4226', 's': '#2E2436', 'd': '#17141F',
              'p': '#17141F', 'm': '#1A1622', 'g': '#B9A6FF'},
         swing=12, arms='right', spark='c',  # tabla tactica en mano izquierda
         sparks_a=SPARKS_R_A, sparks_b=SPARKS_R_B),
]


def char_frames(c):
    """6 frames en orden de columnas: idle-A, idle-B, walk-A, walk-B, cel-A, cel-B."""
    g = c['build']()
    ia, ib = g, blink(g)
    if c['legs'] == 'fut':
        wa, wb = walk_frames(g, c['swing'], leg_fill_ch='q')
    else:
        wa, wb = walk_frames(g, c['swing'])
    ca, cb = celebrate_frames(g, c['arms'], c['spark'], c['sparks_a'], c['sparks_b'])
    _stamp_ball(cb)  # mini balon de gol sobre la cabeza solo en frame B
    return [ia, ib, wa, wb, ca, cb]


def build_rows():
    rows_of_frames = []
    for c in CHARS:
        colors = dict(GLOBAL); colors.update(c['pal'])
        rows_of_frames.append([(fr, colors) for fr in char_frames(c)])
    return rows_of_frames


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.normpath(os.path.join(
        here, '..', 'public', 'office', 'themes', 'futbol.png'))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    png, w, h = compose_sheet(build_rows(), CELL_W, CELL_H, SHEET_COLS)
    assert (w, h) == (SHEET_COLS * CELL_W, SHEET_ROWS * CELL_H), (w, h)
    with open(out, 'wb') as f:
        f.write(png)
    print('OK %s %dx%d %.1f KB' % (out, w, h, os.path.getsize(out) / 1024.0))


if __name__ == '__main__':
    main()
