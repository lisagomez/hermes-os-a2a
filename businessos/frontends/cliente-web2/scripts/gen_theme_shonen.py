# -*- coding: utf-8 -*-
"""Generador del sprite sheet del tema "Guerreros Anime" (id: shonen) — v2, 20x28.

Academia de artes marciales / anime shonen ORIGINAL: uniformes de combate
variados (gi, tunicas, armadura ligera), pelos salvajes de colores fantasticos,
bandas, cintas y capas cortas. 100%% original: sin personajes con copyright.

Cuerpo completo estilo "profesiones pixel" (ver anatomy.py): cabeza ~1/3,
brazos diferenciados con manos 2x2 que sostienen el prop, piernas separadas
con hueco, zapatos oscuros de 2 filas. Con la altura nueva, los gi/tunicas
por fin caen hasta las piernas (faldones de 2-3 filas y cinturones con nudo).

Como regenerar:
    python scripts/gen_theme_shonen.py
  -> escribe public/office/themes/shonen.png (SHEET_W x SHEET_H de anatomy,
     RGBA, fondo transparente)

Layout del sheet (sin padding, celda exacta CELL_W x CELL_H):
  8 FILAS  (orden de AGENTS): vendo, flujo, oraculo, ledger, musa, empatia, custodio, tesoro
  6 COLUMNAS: idle-A, idle-B(parpadeo), walk-A, walk-B, celebrate-A, celebrate-B

Mapeo tematico:
  vendo    -> capitan del dojo (gi violeta, cinturon dorado, pelo blanco hacia atras)
  flujo    -> mensajera ninja veloz (traje rosa, banda en la frente, coleta azul, bufanda)
  oraculo  -> sabio estratega (tunica verde, capucha a medio poner, lentes redondos, pergamino)
  ledger   -> guardian blindado (casco con cresta dorada, visor con glint, hombreras doradas)
  musa     -> artista mistica (kimono violeta, faja rosa, pincel gigante a la espalda)
  empatia  -> sanadora (tunica clara, banda con cruz rosa, bob verde)
  custodio -> juez marcial (gi oscuro formal, cintas de juez, abanico dorado)
  tesoro   -> alquimista (dos buns rosa, gafas de laboratorio en la frente, delantal con frascos)

Efecto especial del tema: AURA de energia en los frames celebrate — post-pass
que pinta pixeles SOLO sobre celdas vacias alrededor del cuerpo, antes de
componer el sheet. Blanco/dorado en los legendaries (vendo, ledger),
violeta/rosa en el resto.

Solo stdlib via anatomy/spritelib. Cada letra del grid es 1 pixel; '.' = transparente.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import anatomy as A
from anatomy import (
    grid, s, row, blink28, walk28, celebrate28, compose_sheet,
)

# Todas las dimensiones DERIVAN del contrato de anatomy — cero numeros magicos.
CELL_W, CELL_H = A.CELL_W, A.CELL_H
SHEET_COLS, SHEET_ROWS = A.SHEET_COLS, A.SHEET_ROWS
assert (A.SHEET_W, A.SHEET_H) == (SHEET_COLS * CELL_W, SHEET_ROWS * CELL_H)

# Paleta global (compartida por todos los personajes del tema)
GLOBAL = {
    'o': '#1A1622',  # outline (violeta casi negro)
    'E': '#1A1622',  # ojos
    'w': '#EDEAF4',  # blanco
    'G': '#FFC24D',  # dorado
    'c': '#28C840',  # verde pocion
    'l': '#B9A6FF',  # lila (lentes/glint)
}


def falda(g, ys):
    """Faldon de gi/tunica/kimono: cubre el hueco de las piernas en las filas
    dadas (cols 5-14) con tela 's' — solo posible con el cuerpo alto 20x28."""
    for y in ys:
        row(g, 5, y, 'o' + 's' * 8 + 'o')


# ---------- personajes (grids idle 20x28) ----------

def vendo_capitan():
    """Capitan del dojo: gi violeta, cinturon dorado con nudo, pelo blanco
    peinado hacia atras."""
    g = grid(A.BASE_BODY)
    # pelo blanco hacia atras: puntas que sobresalen por detras (derecha)
    s(g, 14, 1, 'h'); s(g, 15, 1, 'o')
    s(g, 14, 2, 'h'); s(g, 15, 2, 'h'); s(g, 16, 2, 'o')
    s(g, 14, 3, 'h'); s(g, 15, 3, 'o')
    row(g, 6, 4, 'hhkkkkhh')                   # frente despejada, sienes marcadas
    # solapa del gi en V (blanca)
    s(g, 8, 10, 'w'); s(g, 11, 10, 'w')
    s(g, 9, 11, 'w'); s(g, 10, 11, 'w')
    # cinturon dorado en la cadera + faldon del gi + nudo colgando
    for x in range(6, 14):
        s(g, x, 17, 'G')
    falda(g, (18, 19))
    s(g, 9, 18, 'G'); s(g, 10, 18, 'G')        # nudo visible sobre el faldon
    return g


def flujo_ninja():
    """Mensajera ninja: traje rosa cenido, banda en la frente, coleta azul
    larga, bufanda al viento."""
    g = grid(A.BASE_BODY)
    # banda en la frente
    row(g, 6, 4, 'dddddddd')
    # coleta azul larga cayendo por la derecha
    s(g, 15, 1, 'o')
    for y in (2, 3, 4, 5, 6, 7, 8, 9):
        s(g, 15, y, 'h'); s(g, 16, y, 'o')
    # bufanda rosa clara: vuelta al cuello + cola al viento (izquierda)
    row(g, 8, 9, 'rrrr')
    row(g, 2, 9, 'rr')
    s(g, 1, 10, 'r'); s(g, 0, 11, 'r'); s(g, 1, 11, 'o')
    # cierres del traje
    s(g, 9, 12, 'r'); s(g, 10, 12, 'r')
    return g


def oraculo_sabio():
    """Sabio estratega: tunica verde larga, capucha a medio poner, lentes
    redondos, pergamino en la mano izquierda."""
    g = grid(A.BASE_BODY)
    # capucha verde cubriendo la mitad trasera de la cabeza
    for y in (1, 2, 3):
        row(g, 10, y, 'tttt')
    s(g, 13, 4, 't')
    # bulto de la capucha sobre el hombro derecho
    s(g, 14, 8, 't'); s(g, 15, 8, 'o')
    s(g, 14, 9, 't'); s(g, 15, 9, 'o')
    # lentes redondos lila (quedan vacios al parpadear: closed_ch='l')
    row(g, 6, 5, 'lEwllEwl')
    row(g, 6, 6, 'lEEllEEl')
    # tunica larga: faldon de 3 filas
    falda(g, (18, 19, 20))
    # pergamino enrollado en la mano izquierda (margen cols 0-2)
    row(g, 0, 12, 'ooo')
    for y in (13, 14, 15, 16):
        s(g, 0, y, 'o'); s(g, 1, y, 'w')
    s(g, 1, 14, 't')                           # cinta que ata el rollo
    row(g, 0, 17, 'ooo')
    return g


def ledger_guardian():
    """Guardian blindado: casco con cresta dorada, visor con glint,
    hombreras doradas, botas con brillo."""
    g = grid(A.BASE_BODY)
    # cresta dorada del casco (vertical, centro de la coronilla)
    for y in (0, 1, 2, 3):
        s(g, 9, y, 'G'); s(g, 10, y, 'G')
    # visor oscuro con glint lila
    row(g, 6, 5, 'vvvvvvvv')
    row(g, 6, 6, 'vvvvvvvv')
    s(g, 7, 5, 'l')
    # hombreras doradas sobre las mangas
    row(g, 3, 10, 'GG'); row(g, 15, 10, 'GG')
    row(g, 3, 11, 'GG'); row(g, 15, 11, 'GG')
    # emblema del pecho + hebilla del cinturon
    s(g, 9, 12, 'G'); s(g, 10, 12, 'G')
    s(g, 9, 17, 'G'); s(g, 10, 17, 'G')
    # botas con brillo
    s(g, 7, 26, 'w'); s(g, 12, 26, 'w')
    return g


def musa_artista():
    """Artista mistica: kimono violeta con faja rosa, mechones rosa,
    pincel gigante a la espalda."""
    g = grid(A.BASE_BODY)
    # mechones rosa sobre pelo oscuro
    s(g, 7, 2, 'b'); s(g, 12, 2, 'b')
    s(g, 6, 3, 'b'); s(g, 13, 3, 'b')
    row(g, 6, 4, 'hkkkkkkh')                   # flequillo recto
    # pincel gigante a la espalda (cols 18-19): cerdas rosa arriba + mango largo
    s(g, 18, 0, 'o')
    for y in (1, 2, 3):
        s(g, 18, y, 'b'); s(g, 19, y, 'o')
    for y in range(4, 18):
        s(g, 18, y, 'n'); s(g, 19, y, 'o')
    s(g, 18, 18, 'o')
    # cruce del kimono en V + faja rosa + faldon
    s(g, 8, 10, 'w'); s(g, 11, 10, 'w')
    s(g, 9, 11, 'w'); s(g, 10, 11, 'w')
    for x in range(6, 14):
        s(g, x, 17, 'b')
    falda(g, (18, 19))
    return g


def empatia_sanadora():
    """Sanadora: tunica clara larga, banda con cruz rosa, bob verde,
    mejillas amables."""
    g = grid(A.BASE_BODY)
    # banda blanca en la frente con cruz rosa
    row(g, 6, 4, 'wwwtwwww')
    # bob verde enmarcando la cara
    for y in (5, 6, 7):
        s(g, 6, y, 'h'); s(g, 13, y, 'h')
    # mejillas amables
    s(g, 7, 7, 'r'); s(g, 12, 7, 'r')
    # cruz rosa en el pecho de la tunica
    s(g, 9, 11, 't'); s(g, 10, 11, 't')
    row(g, 8, 12, 'tttt')
    s(g, 9, 13, 't'); s(g, 10, 13, 't')
    # tunica larga: faldon de 3 filas
    falda(g, (18, 19, 20))
    return g


def custodio_juez():
    """Juez marcial: gi formal oscuro, cintas de juez, cinturon lila,
    abanico de guerra dorado plegado en la mano derecha."""
    g = grid(A.BASE_BODY)
    # raya al medio severa
    row(g, 6, 3, 'hhhkkhhh')
    # colas de la cinta de juez (izquierda, al viento)
    s(g, 4, 3, 't'); s(g, 3, 4, 't'); s(g, 4, 4, 'o')
    # cuello blanco del gi formal en V
    s(g, 8, 10, 'w'); s(g, 11, 10, 'w')
    s(g, 9, 11, 'w'); s(g, 10, 11, 'w')
    # cinturon de juez lila + faldon del gi
    for x in range(6, 14):
        s(g, x, 17, 'b')
    falda(g, (18, 19))
    # abanico de guerra plegado (dorado) sobre la mano derecha
    s(g, 17, 11, 'o')
    for y in (12, 13, 14):
        s(g, 17, y, 'G'); s(g, 18, y, 'o')
    return g


def tesoro_alquimista():
    """Alquimista: dos buns rosa, gafas de laboratorio en la frente,
    delantal blanco con frascos."""
    g = grid(A.BASE_BODY)
    # dos monos (buns) laterales rosa
    s(g, 4, 1, 'o'); s(g, 3, 2, 'o'); s(g, 4, 2, 'h')
    s(g, 3, 3, 'o'); s(g, 4, 3, 'h'); s(g, 4, 4, 'o')
    s(g, 15, 1, 'o'); s(g, 16, 2, 'o'); s(g, 15, 2, 'h')
    s(g, 16, 3, 'o'); s(g, 15, 3, 'h'); s(g, 15, 4, 'o')
    # gafas de laboratorio en la frente (banda + dos lentes lila)
    row(g, 6, 2, 'dllddlld')
    # delantal blanco al frente con frascos (verde pocion + rosa)
    row(g, 8, 12, 'wwww')
    s(g, 8, 13, 'c'); s(g, 9, 13, 'w'); s(g, 10, 13, 'w'); s(g, 11, 13, 't')
    row(g, 8, 14, 'wwww')
    row(g, 8, 15, 'wwww')
    return g


# ---------- parpadeo especial (guardian sin ojos visibles) ----------

def _ledger_blink_special(b):
    """El guardian no muestra ojos: el glint del visor cambia de lado."""
    s(b, 7, 5, 'v'); s(b, 12, 5, 'l')
    return b


def blink(g, c):
    if c['id'] == 'ledger':
        return blink28(g, special=_ledger_blink_special)
    return blink28(g, closed_ch=c.get('closed_ch', 'k'))


# ---------- aura de energia (celebrate) — post-pass sobre los frames ----------
# Halo alrededor del cuerpo 20x28; SOLO pinta sobre pixeles vacios, asi que
# nunca pisa props, brazos alzados ni sparks. Puntos verificados libres
# contra BASE_BODY (laterales cols 0-4 / 15-19 y coronilla).

AURA28_A = [(0, 9), (1, 12), (0, 15), (1, 18), (2, 21), (1, 24), (3, 26),
            (19, 9), (18, 12), (19, 15), (18, 18), (17, 21), (18, 24), (16, 26),
            (4, 1), (15, 1)]
AURA28_B = [(1, 8), (0, 11), (1, 14), (0, 17), (2, 20), (1, 23), (0, 26),
            (18, 8), (19, 11), (18, 14), (19, 17), (17, 20), (18, 23), (19, 26),
            (4, 3), (15, 3)]


def aplicar_aura(fr, puntos):
    for i, (x, y) in enumerate(puntos):
        if fr[y][x] == '.':
            fr[y][x] = 'A' if i % 2 == 0 else 'B'
    return fr


# ---------- plantilla (orden = filas del sheet = orden de AGENTS) ----------
# prop_side: la mano/lado del prop NUNCA se balancea en walk; arms = el lado
# LIBRE que se alza en celebrate. A/B = colores del aura de energia:
# blanco/dorado en legendaries (vendo, ledger), violeta/rosa en el resto.
# Piel repartida 2-2-2-2 igual que el tema de marca:
#   C68642: vendo, empatia | 8D5524: flujo, ledger
#   F2C79B: oraculo, custodio | FFDBAC: musa, tesoro

AURA_LEGENDARY = {'A': '#FFC24D', 'B': '#EDEAF4'}
AURA_NORMAL = {'A': '#9F7BFF', 'B': '#FF4D8D'}

CHARS = [
    dict(id='vendo', name='CAPITAN DEL DOJO', build=vendo_capitan,
         pal={'k': '#C68642', 'h': '#EDEAF4', 's': '#9F7BFF', 'd': '#4B23D6',
              'p': '#4B23D6', 'z': '#17141F', 'm': '#1A1622'},
         aura=AURA_LEGENDARY, prop_side=None, arms='both'),
    dict(id='flujo', name='MENSAJERA NINJA', build=flujo_ninja,
         pal={'k': '#8D5524', 'h': '#4B23D6', 's': '#FF4D8D', 'd': '#B3134F',
              'p': '#B3134F', 'z': '#17141F', 'm': '#1A1622', 'r': '#FF9DC0'},
         aura=AURA_NORMAL, prop_side='left', arms='right'),  # bufanda a la izq
    dict(id='oraculo', name='SABIO ESTRATEGA', build=oraculo_sabio,
         pal={'k': '#F2C79B', 'h': '#9F7BFF', 's': '#2A9D8F', 'd': '#1F7468',
              'p': '#1F7468', 'z': '#17141F', 'm': '#1A1622', 't': '#2A9D8F'},
         aura=AURA_NORMAL, prop_side='left', arms='right',   # pergamino izq
         closed_ch='l'),
    dict(id='ledger', name='GUARDIAN BLINDADO', build=ledger_guardian,
         pal={'k': '#8D5524', 'h': '#3A2F52', 's': '#3A2F52', 'd': '#241E31',
              'p': '#2E2436', 'z': '#17141F', 'm': '#1A1622', 'v': '#17141F'},
         aura=AURA_LEGENDARY, prop_side=None, arms='both'),
    dict(id='musa', name='ARTISTA MISTICA', build=musa_artista,
         pal={'k': '#FFDBAC', 'h': '#2E2436', 's': '#9F7BFF', 'd': '#4B23D6',
              'p': '#4B3B66', 'z': '#17141F', 'm': '#B3134F', 'b': '#FF4D8D',
              'n': '#8A5A2B'},
         aura=AURA_NORMAL, prop_side='right', arms='left'),  # pincel a la der
    dict(id='empatia', name='SANADORA', build=empatia_sanadora,
         pal={'k': '#C68642', 'h': '#2A9D8F', 's': '#F3EFFA', 'd': '#C9BCE8',
              'p': '#C9BCE8', 'z': '#17141F', 'm': '#B3134F', 'r': '#FF9DC0',
              't': '#FF4D8D'},
         aura=AURA_NORMAL, prop_side=None, arms='both'),
    dict(id='custodio', name='JUEZ MARCIAL', build=custodio_juez,
         pal={'k': '#F2C79B', 'h': '#4B3B66', 's': '#2E2436', 'd': '#241E31',
              'p': '#241E31', 'z': '#17141F', 'm': '#1A1622', 'b': '#9F7BFF',
              't': '#FF4D8D'},
         aura=AURA_NORMAL, prop_side='right', arms='left'),  # abanico a la der
    dict(id='tesoro', name='ALQUIMISTA', build=tesoro_alquimista,
         pal={'k': '#FFDBAC', 'h': '#FF4D8D', 's': '#4B23D6', 'd': '#35189E',
              'p': '#35189E', 'z': '#17141F', 'm': '#1A1622', 't': '#FF4D8D'},
         aura=AURA_NORMAL, prop_side=None, arms='both'),
]
assert len(CHARS) == SHEET_ROWS


def char_frames(c):
    """6 frames en orden de columnas: idle-A, idle-B, walk-A, walk-B, cel-A, cel-B.
    El aura se aplica como post-pass SOLO a los frames celebrate."""
    g = c['build']()
    ia, ib = g, blink(g, c)
    wa, wb = walk28(g, c['prop_side'])
    ca, cb = celebrate28(g, c['arms'], sparks_a=[], sparks_b=[])
    ca = aplicar_aura(ca, AURA28_A)
    cb = aplicar_aura(cb, AURA28_B)
    return [ia, ib, wa, wb, ca, cb]


def build_rows():
    rows_of_frames = []
    for c in CHARS:
        colors = dict(GLOBAL)
        colors.update(c['pal'])
        colors.update(c['aura'])
        rows_of_frames.append([(fr, colors) for fr in char_frames(c)])
    return rows_of_frames


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.normpath(os.path.join(
        here, '..', 'public', 'office', 'themes', 'shonen.png'))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    png, w, h = compose_sheet(build_rows(), CELL_W, CELL_H, SHEET_COLS)
    assert (w, h) == (A.SHEET_W, A.SHEET_H), (w, h)
    with open(out, 'wb') as f:
        f.write(png)
    print('OK %s %dx%d %.1f KB' % (out, w, h, os.path.getsize(out) / 1024.0))


if __name__ == '__main__':
    main()
