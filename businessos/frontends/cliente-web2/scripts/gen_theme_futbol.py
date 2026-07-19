# -*- coding: utf-8 -*-
"""Generador del sprite sheet del tema "Once Ideal" (id: futbol) — Oficina A2A (v2, 20x28).

Club FICTICIO "A2A FC": kits inventados mezclando la paleta A2A
(violeta #9F7BFF, rosa #FF4D8D, dorado #FFC24D) con clasicos genericos
(blanco, negro, teal #2A9D8F). Ningun kit reproduce uniformes de clubes
o selecciones reales; personajes 100% originales.

Como regenerar:
    python scripts/gen_theme_futbol.py
  → escribe public/office/themes/futbol.png (120x224, RGBA, fondo transparente)

Layout del sheet (sin padding, celda exacta 20x28 — ver anatomy.py):
  8 FILAS  (orden de AGENTS): vendo, flujo, oraculo, ledger, musa,
                              empatia, custodio, tesoro
  6 COLUMNAS: idle-A, idle-B(parpadeo), walk-A, walk-B, celebrate-A, celebrate-B

Piernas de futbolista sobre el contrato de anatomy.py (LEG_TOP..SHOE_ROWS):
  short 'p' filas 17-19 (3) + rodilla piel 'k' filas 20-21 (2) +
  MEDIA de color del kit 'M' filas 22-25 (4) + botin oscuro 'z' filas 26-27.
  El walk28 nativo recoge la pierna (el botin 'z' sube 2 filas solo).
TESORO (directora tecnica) es la UNICA sin kit: BASE_BODY con traje +
tabla tactica en la mano izquierda (margen cols 0-2).

Numeros en el pecho: digitos de hasta 3x4 px ('N'), filas 11-14 del torso.

Celebrate: brazos de gol (celebrate28) + mini balon pixel 2x2 sobre la
cabeza SOLO en frame B + destello dorado para los legendaries (vendo,
ledger) y verde para el resto. La DT celebra con puno derecho en alto y
la tabla intacta en la otra mano (arms='right').
"""
import os

import anatomy as A
from anatomy import grid, s, row, blink28, walk28, celebrate28, compose_sheet

CELL_W, CELL_H = A.CELL_W, A.CELL_H
SHEET_COLS, SHEET_ROWS = A.SHEET_COLS, A.SHEET_ROWS
SHEET_W, SHEET_H = A.SHEET_W, A.SHEET_H

# Base futbolista: BASE_BODY con las piernas re-vestidas.
#   filas 17-19 short 'p' (ya son 'p' en BASE_BODY) · 20-21 rodilla piel 'k'
#   filas 22-25 media 'M' · 26-27 botin 'z' + suela (ya en BASE_BODY)
BASE_FUT = (
    A.BASE_BODY[:20]
    + [".....okko..okko....."] * 2      # rodillas (piel)
    + [".....oMMo..oMMo....."] * 4      # medias del kit
    + A.BASE_BODY[26:]                  # botin 'z' + suela
)
BASE_DT = list(A.BASE_BODY)             # traje: pantalon 'p' + zapato 'z'

for _b in (BASE_FUT, BASE_DT):
    assert all(len(r) == CELL_W for r in _b), [len(r) for r in _b]
    assert len(_b) == CELL_H

GLOBAL = {
    'o': '#1A1622',  # outline (violeta casi negro)
    'E': '#1A1622',  # ojos
    'w': '#EDEAF4',  # blanco
    'G': '#FFC24D',  # dorado (legendary)
    'c': '#28C840',  # verde exito
    'l': '#B9A6FF',  # lila
}

# ---------- numeros de camiseta (digitos <= 3x4, letra 'N') ----------

DIGITS = {
    '0': ("NNN", "N.N", "N.N", "NNN"),
    '1': (".N", "NN", ".N", ".N"),
    '2': ("NNN", "..N", "N..", "NNN"),
    '4': ("N.N", "N.N", "NNN", "..N"),
    '5': ("NNN", "N..", "NNN", "..N"),
    '9': ("NNN", "N.N", "NNN", "..N"),
}
NUM_Y = 11  # fila superior del numero (torso filas 11-14)


def _digit(g, x0, d):
    for dy, line in enumerate(DIGITS[d]):
        for dx, ch in enumerate(line):
            if ch == 'N':
                s(g, x0 + dx, NUM_Y + dy, 'N')


# Balon pixel 2x2 (blanco + parches outline) para celebrate-B, sobre la
# cabeza en la esquina superior izquierda (cols 2-3: libre en los 8 y sin
# chocar con SPARKS28_*_B).
BALL_X, BALL_Y = 2, 0


def _stamp_ball(g):
    s(g, BALL_X, BALL_Y, 'o'); s(g, BALL_X + 1, BALL_Y, 'w')
    s(g, BALL_X, BALL_Y + 1, 'w'); s(g, BALL_X + 1, BALL_Y + 1, 'o')


# ---------- personajes (grids idle 20x28) ----------

def vendo():
    """Capitan delantero #9: kit violeta/short dorado + banda de capitan."""
    g = grid(BASE_FUT)
    row(g, 7, 4, 'hh')                    # raya lateral en el flequillo
    s(g, 9, 10, 'G'); s(g, 10, 10, 'G')   # cuello con vivo dorado
    s(g, 15, 11, 'G'); s(g, 16, 11, 'G')  # banda de capitan (manga derecha)
    _digit(g, 8, '9')
    return g


def flujo():
    """Lateral veloz #2: kit rosa/negro, coleta alta y balon bajo el pie."""
    g = grid(BASE_FUT)
    # coleta alta lateral derecha (silueta)
    s(g, 15, 1, 'o')
    for y in (2, 3, 4):
        s(g, 15, y, 'h'); s(g, 16, y, 'o')
    s(g, 15, 5, 'o')
    _digit(g, 8, '2')
    # balon junto al pie derecho (margen cols 15-18)
    s(g, 16, 24, 'o'); s(g, 17, 24, 'o')
    s(g, 15, 25, 'o'); s(g, 16, 25, 'w'); s(g, 17, 25, 'w'); s(g, 18, 25, 'o')
    s(g, 15, 26, 'o'); s(g, 16, 26, 'w'); s(g, 17, 26, 'o'); s(g, 18, 26, 'o')
    s(g, 16, 27, 'o'); s(g, 17, 27, 'o')
    return g


def oraculo():
    """ARQUERO #1: jersey teal (unico distinto) + guantes dorados ANCHOS."""
    g = grid(BASE_FUT)
    # despeinado: muescas en la silueta superior
    s(g, 8, 0, '.'); s(g, 8, 1, 'o')
    s(g, 11, 0, '.'); s(g, 11, 1, 'o')
    # guantes dorados: manos 2x2 → 3x2, mas anchas que el punho normal
    for y in A.HAND_ROWS:
        s(g, 3, y, 'v'); s(g, 4, y, 'v'); s(g, 2, y, 'v'); s(g, 1, y, 'o')
        s(g, 15, y, 'v'); s(g, 16, y, 'v'); s(g, 17, y, 'v'); s(g, 18, y, 'o')
    _digit(g, 9, '1')
    return g


def ledger():
    """Defensa central imponente #4: kit oscuro/dorado, flat-top, cejas."""
    g = grid(BASE_FUT)
    row(g, 5, 0, 'o' * 10)                    # flat-top: craneo cuadrado ancho
    s(g, 7, 4, 'h'); s(g, 8, 4, 'h')          # cejas gruesas
    s(g, 11, 4, 'h'); s(g, 12, 4, 'h')
    s(g, 6, 11, 'G'); s(g, 13, 11, 'G')       # vivos dorados en el pecho
    _digit(g, 8, '4')
    return g


def musa():
    """Mediapunta creativa #10: kit violeta claro y melena suelta."""
    g = grid(BASE_FUT)
    # melena cayendo por ambos lados hasta los hombros
    for y in (5, 6, 7, 8, 9):
        s(g, 4, y, 'h'); s(g, 3, y, 'o')
        s(g, 15, y, 'h'); s(g, 16, y, 'o')
    _digit(g, 6, '1'); _digit(g, 9, '0')
    return g


def empatia():
    """Delantera alegre #11: kit rosa suave, coleta baja y mejillas."""
    g = grid(BASE_FUT)
    # coleta baja lateral izquierda
    s(g, 4, 2, 'o')
    for y in (3, 4, 5):
        s(g, 4, y, 'h'); s(g, 3, y, 'o')
    s(g, 4, 6, 'o')
    s(g, 7, 7, 'r'); s(g, 12, 7, 'r')         # mejillas rosadas
    _digit(g, 6, '1'); _digit(g, 9, '1')
    return g


def custodio():
    """Mediocampista de contencion #5: kit gris/violeta + cinta en la cabeza."""
    g = grid(BASE_FUT)
    row(g, 6, 4, 'b' * 8)                     # cinta en la frente
    s(g, 15, 4, 'b'); s(g, 16, 4, 'o')        # cola de la cinta (silueta)
    _digit(g, 8, '5')
    return g


def tesoro():
    """Directora tecnica en la banda: traje + monho + tabla tactica (sin kit)."""
    g = grid(BASE_DT)
    # monho (bun) lateral derecho
    s(g, 15, 0, 'o')
    s(g, 15, 1, 'h'); s(g, 16, 1, 'o')
    s(g, 15, 2, 'h'); s(g, 16, 2, 'o')
    # blusa blanca bajo el blazer
    s(g, 9, 10, 'w'); s(g, 10, 10, 'w')
    s(g, 9, 11, 'w'); s(g, 10, 11, 'w')
    # tabla tactica en la mano izquierda (margen cols 0-2)
    row(g, 0, 12, 'ooo')
    for y in (13, 14, 15, 16):
        s(g, 0, y, 'o'); s(g, 1, y, 'w'); s(g, 2, y, 'o')
    s(g, 1, 13, 'g'); s(g, 1, 15, 'g')        # marcas de jugada (lila)
    row(g, 0, 17, 'ooo')
    return g


# ---------- ajustes de pose del arquero (guantes intactos) ----------

def _oraculo_walk(g):
    """El arquero camina con los dos guantes quietos (walk28 solo suprime el
    vaiven de UN lado por frame): se toma el frame sin swing de cada llamada."""
    wa = walk28(g, prop_side='right')[0]   # A: pierna izq, brazo der quieto
    wb = walk28(g, prop_side='left')[1]    # B: pierna der, brazo izq quieto
    return wa, wb


def _oraculo_fix_celebrate(fr):
    """celebrate28 redibuja los brazos arriba con mano de piel: se re-pintan
    como guantes y se limpian los bordes del guante ancho que _clear_arm
    (cols 2-4 / 15-17) no alcanza (cols 1 y 18)."""
    for x, y in ((2, 6), (3, 6), (2, 7), (3, 7),
                 (16, 6), (17, 6), (16, 7), (17, 7)):
        s(fr, x, y, 'v')
    for y in A.HAND_ROWS:
        s(fr, 1, y, '.'); s(fr, 18, y, '.')
    return fr


# ---------- plantilla (orden = filas del sheet = orden de AGENTS) ----------
# prop_side: la mano con prop no se balancea en walk. arms: lado(s) alzados
# en celebrate. 4 tonos de piel repartidos como en el tema anterior:
#   C68642: vendo, empatia | 8D5524: flujo, ledger
#   F2C79B: oraculo, custodio | FFDBAC: musa, tesoro

CHARS = [
    dict(id='vendo', build=vendo,
         pal={'k': '#C68642', 'h': '#2E2436', 's': '#9F7BFF', 'd': '#4B23D6',
              'p': '#FFC24D', 'M': '#4B23D6', 'z': '#17141F', 'm': '#1A1622',
              'N': '#EDEAF4'},
         prop_side=None, arms='both', spark='G'),   # legendary → dorado
    dict(id='flujo', build=flujo,
         pal={'k': '#8D5524', 'h': '#1A1622', 's': '#FF4D8D', 'd': '#17141F',
              'p': '#17141F', 'M': '#FF4D8D', 'z': '#2E2436', 'm': '#1A1622',
              'N': '#EDEAF4'},
         prop_side=None, arms='both', spark='c'),   # balon en el pie, no mano
    dict(id='oraculo', build=oraculo,
         pal={'k': '#F2C79B', 'h': '#4B3B66', 's': '#2A9D8F', 'd': '#17141F',
              'p': '#17141F', 'M': '#2A9D8F', 'z': '#2E2436', 'm': '#1A1622',
              'N': '#EDEAF4', 'v': '#FFC24D'},
         prop_side=None, arms='both', spark='c'),   # guantes arriba
    dict(id='ledger', build=ledger,
         pal={'k': '#8D5524', 'h': '#17141F', 's': '#2E2436', 'd': '#17141F',
              'p': '#17141F', 'M': '#FFC24D', 'z': '#17141F', 'm': '#1A1622',
              'N': '#FFC24D'},
         prop_side=None, arms='both', spark='G'),   # legendary → dorado
    dict(id='musa', build=musa,
         pal={'k': '#FFDBAC', 'h': '#7A3352', 's': '#B9A6FF', 'd': '#EDEAF4',
              'p': '#EDEAF4', 'M': '#B9A6FF', 'z': '#2E2436', 'm': '#B3134F',
              'N': '#4B23D6'},
         prop_side=None, arms='both', spark='c'),
    dict(id='empatia', build=empatia,
         pal={'k': '#C68642', 'h': '#2E2436', 's': '#FF9DC0', 'd': '#EDEAF4',
              'p': '#EDEAF4', 'M': '#FF9DC0', 'z': '#2E2436', 'm': '#B3134F',
              'N': '#B3134F', 'r': '#FF4D8D'},
         prop_side=None, arms='both', spark='c'),
    dict(id='custodio', build=custodio,
         pal={'k': '#F2C79B', 'h': '#6B4226', 's': '#75717F', 'd': '#4B3B66',
              'p': '#4B3B66', 'M': '#75717F', 'z': '#17141F', 'm': '#1A1622',
              'N': '#EDEAF4', 'b': '#9F7BFF'},
         prop_side=None, arms='both', spark='c'),
    dict(id='tesoro', build=tesoro,
         pal={'k': '#FFDBAC', 'h': '#6B4226', 's': '#2E2436', 'd': '#17141F',
              'p': '#2E2436', 'z': '#17141F', 'm': '#1A1622', 'g': '#B9A6FF'},
         prop_side='left', arms='right', spark='c'),  # punho der + tabla izq
]
assert len(CHARS) == SHEET_ROWS


def char_frames(c):
    """6 frames en orden de columnas: idle-A, idle-B, walk-A, walk-B, cel-A, cel-B."""
    g = c['build']()
    ia, ib = g, blink28(g)
    if c['id'] == 'oraculo':
        wa, wb = _oraculo_walk(g)
    else:
        wa, wb = walk28(g, c['prop_side'])
    ca, cb = celebrate28(g, c['arms'], c['spark'])
    if c['id'] == 'oraculo':
        ca, cb = _oraculo_fix_celebrate(ca), _oraculo_fix_celebrate(cb)
    if c['id'] != 'tesoro':
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
    assert (w, h) == (SHEET_W, SHEET_H), (w, h)
    with open(out, 'wb') as f:
        f.write(png)
    print('OK %s %dx%d %.1f KB' % (out, w, h, os.path.getsize(out) / 1024.0))


if __name__ == '__main__':
    main()
