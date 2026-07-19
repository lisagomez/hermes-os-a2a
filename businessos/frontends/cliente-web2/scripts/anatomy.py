# -*- coding: utf-8 -*-
"""Plantilla anatomica compartida 20x28 — cuerpo completo estilo "profesiones pixel".

Reemplaza la anatomia chibi 16x20. Los helpers de pose de spritelib.py
(blink, walk_frames, celebrate_frames, _arm_up_*, _mouth_open, SPARKS_*)
hornean coordenadas 16x20 y NO deben usarse con esta plantilla: aqui viven
sus equivalentes nativos 20x28 (blink28 / walk28 / celebrate28 / SPARKS28_*).

De spritelib se importa SOLO lo generico (grids, colores, PNG).

MAPA DE FILAS DEL CUERPO 20x28 (contrato; ajustable +-1-2px por personaje):

  filas  0-8  cabeza + pelo (~9 filas = ~1/3 de la altura)
  filas  5-6  ojos: 2px de alto, glint blanco 'w' de 1px (EYE_ROWS)
  fila     7  boca (MOUTH_ROW)
  fila     9  cuello (NECK_ROW)
  filas 10-17 torso (~8): hombros en fila 10 (SHOULDER_ROW); brazos
              DIFERENCIADOS del torso (mangas cols 3-4 y 15-16, separadas
              por outline); manos de 2x2 piel en filas 15-16 (HAND_ROWS)
  filas 18-25 piernas SEPARADAS: bloques 'oppo' en cols 5-8 y 11-14 con
              hueco transparente de 2px entre ellas (LEG_TOP..LEG_BOT)
  filas 26-27 zapatos 'z' (tono mas oscuro que el pantalon) + suela outline

  Margenes laterales (cols 0-2 / 17-19): reservados para props sostenidos
  en la mano (tablet, maletin, taza, sello...) que sobresalen del cuerpo.

Letras del BASE_BODY:
  o outline duro   h pelo   k piel   E ojo   w glint/blanco   m boca
  s camisa/torso   d manga/sombra del torso   p pantalon   z zapato
"""
from spritelib import (  # noqa: F401  (re-export para los temas)
    grid, s, row, clone, hex2rgb, save_png_rgba, compose_sheet,
)

# ---------- contrato de geometria (nunca numeros magicos sueltos) ----------

CELL_W, CELL_H = 20, 28
SHEET_COLS, SHEET_ROWS = 6, 8
SHEET_W = SHEET_COLS * CELL_W
SHEET_H = SHEET_ROWS * CELL_H
assert (SHEET_W, SHEET_H) == (120, 224), (SHEET_W, SHEET_H)

# hitos anatomicos (coordenadas del BASE_BODY de abajo)
EYE_ROWS = (5, 6)        # filas de ojos (glint arriba, pupila abajo)
MOUTH_ROW = 7
NECK_ROW = 9
SHOULDER_ROW = 10
HAND_ROWS = (15, 16)     # mano 2x2 (2 filas x 2 cols)
ARM_L_X, ARM_R_X = 3, 15  # col inicial (2px) de manga/mano izq y der
LEG_TOP, LEG_BOT = 18, 25
SHOE_ROWS = (26, 27)
LEG_L_X, LEG_R_X = 5, 11  # col inicial del bloque 'oppo' de cada pierna
FACE_X0, FACE_X1 = 6, 13  # cols interiores de la cara (para blink28)

# ---------- BASE_BODY de ejemplo (punto de partida de todos los temas) ----------
#   cols:      0123456789...        (20 de ancho)
BASE_BODY = [
    "......oooooooo......",   # 0  coronilla
    ".....ohhhhhhhho.....",   # 1  pelo
    ".....ohhhhhhhho.....",   # 2  pelo
    ".....ohhhhhhhho.....",   # 3  pelo
    ".....ohkkkkkkho.....",   # 4  flequillo + frente
    ".....okEwkkEwko.....",   # 5  ojos (glint w)
    ".....okEEkkEEko.....",   # 6  ojos (pupila)
    ".....okkkmmkkko.....",   # 7  boca
    "......okkkkkko......",   # 8  menton
    ".......okkkko.......",   # 9  cuello
    "..oddossssssssoddo..",   # 10 hombros + mangas separadas del torso
    "..oddossssssssoddo..",   # 11
    "..oddossssssssoddo..",   # 12
    "..oddossssssssoddo..",   # 13
    "..oddossssssssoddo..",   # 14
    "..okkossssssssokko..",   # 15 manos 2x2 (piel)
    "..okkossssssssokko..",   # 16 manos 2x2
    ".....oppppppppo.....",   # 17 cadera/cinturon
    ".....oppo..oppo.....",   # 18 piernas separadas (hueco 2px)
    ".....oppo..oppo.....",   # 19
    ".....oppo..oppo.....",   # 20
    ".....oppo..oppo.....",   # 21
    ".....oppo..oppo.....",   # 22
    ".....oppo..oppo.....",   # 23
    ".....oppo..oppo.....",   # 24
    ".....oppo..oppo.....",   # 25
    ".....ozzo..ozzo.....",   # 26 zapatos (mas oscuros que p)
    ".....oooo..oooo.....",   # 27 suela
]
assert all(len(r) == CELL_W for r in BASE_BODY), [len(r) for r in BASE_BODY]
assert len(BASE_BODY) == CELL_H


# ---------- poses nativas 20x28 ----------

def blink28(g, eye_rows=EYE_ROWS, closed_ch='k', special=None):
    """idle-B: parpadeo. Cierra 'E' y su glint 'w' dentro de la cara
    (cols FACE_X0..FACE_X1, filas eye_rows) reemplazandolos por closed_ch
    (piel por default; 'l' para lentes que quedan vacios, etc.).

    special: callback (b) -> b para parpadeos no estandar (p.ej. visor de
    LEDGER-X: el glint cambia de lado). Si se da, reemplaza la logica.
    """
    b = clone(g)
    if special is not None:
        return special(b)
    for y in eye_rows:
        for x in range(FACE_X0, FACE_X1 + 1):
            if b[y][x] in ('E', 'w'):
                b[y][x] = closed_ch
    return b


def _lift_leg(g, x):
    """Recoge la pierna cuyo bloque 'oppo' empieza en col x: el zapato sube
    2 filas y las filas 26-27 de ese lado quedan transparentes."""
    row(g, x, 24, 'ozzo')
    row(g, x, 25, 'oooo')
    row(g, x, 26, '....')
    row(g, x, 27, '....')


def _swing_arm(g, hand_x):
    """Vaiven de brazo 1px: la mano 2x2 sube una fila (fila 14 pasa a piel,
    la 16 vuelve a manga)."""
    row(g, hand_x, 14, 'kk')
    row(g, hand_x, 16, 'dd')


def walk28(g, prop_side=None):
    """walk-A/B: tijera de piernas separadas + vaiven del brazo OPUESTO.
    A: recoge pierna izq y balancea brazo der. B: al reves.
    prop_side ('left'/'right'/None): la mano que sostiene el prop NUNCA
    se balancea (el prop queda intacto en ambos frames)."""
    a, b = clone(g), clone(g)
    _lift_leg(a, LEG_L_X)
    _lift_leg(b, LEG_R_X)
    if prop_side != 'right':
        _swing_arm(a, ARM_R_X)
    if prop_side != 'left':
        _swing_arm(b, ARM_L_X)
    return a, b


def _clear_arm(g, xs):
    for y in range(SHOULDER_ROW, HAND_ROWS[1] + 1):
        for x in xs:
            g[y][x] = '.'


def _arm_up_left28(g):
    _clear_arm(g, (2, 3, 4))
    for y in (8, 9, 10, 11):
        s(g, 2, y, 'o'); s(g, 3, y, 'd'); s(g, 4, y, 'o')
    row(g, 2, 12, 'ooo')                      # cierre del hombro
    s(g, 2, 6, 'k'); s(g, 3, 6, 'k')          # mano 2x2 arriba
    s(g, 2, 7, 'k'); s(g, 3, 7, 'k')
    s(g, 2, 5, 'o'); s(g, 3, 5, 'o')          # outline de la mano
    s(g, 1, 6, 'o'); s(g, 1, 7, 'o')
    s(g, 4, 6, 'o'); s(g, 4, 7, 'o')


def _arm_up_right28(g):
    _clear_arm(g, (15, 16, 17))
    for y in (8, 9, 10, 11):
        s(g, 15, y, 'o'); s(g, 16, y, 'd'); s(g, 17, y, 'o')
    row(g, 15, 12, 'ooo')
    s(g, 16, 6, 'k'); s(g, 17, 6, 'k')
    s(g, 16, 7, 'k'); s(g, 17, 7, 'k')
    s(g, 16, 5, 'o'); s(g, 17, 5, 'o')
    s(g, 15, 6, 'o'); s(g, 15, 7, 'o')
    s(g, 18, 6, 'o'); s(g, 18, 7, 'o')


def _mouth_open28(g):
    s(g, 9, 8, 'm'); s(g, 10, 8, 'm')  # la boca de la fila 7 se abre hacia el menton


# Destellos en las esquinas superiores REALES del canvas de 20 (verificados
# libres contra BASE_BODY: la cabeza ocupa cols 5-14).
SPARKS28_L_A = [(0, 2), (2, 0), (1, 4)]
SPARKS28_L_B = [(1, 1), (0, 5), (3, 2)]
SPARKS28_R_A = [(19, 2), (17, 0), (18, 4)]
SPARKS28_R_B = [(18, 1), (19, 5), (16, 2)]


def celebrate28(g, arms='both', spark_ch='c', sparks_a=None, sparks_b=None):
    """celebrate-A/B: brazo(s) re-dibujados arriba en las columnas laterales,
    boca abierta en su fila nueva y sparks en las esquinas del canvas.
    arms: 'both' | 'left' | 'right' (single-arm = la otra mano conserva su
    prop intacto). sparks_a/b: lista de (x, y); default segun el lado alzado.
    """
    if sparks_a is None:
        sparks_a = (SPARKS28_L_A + SPARKS28_R_A if arms == 'both'
                    else SPARKS28_L_A if arms == 'left' else SPARKS28_R_A)
    if sparks_b is None:
        sparks_b = (SPARKS28_L_B + SPARKS28_R_B if arms == 'both'
                    else SPARKS28_L_B if arms == 'left' else SPARKS28_R_B)

    def pose(gr):
        if arms in ('both', 'left'):
            _arm_up_left28(gr)
        if arms in ('both', 'right'):
            _arm_up_right28(gr)
        _mouth_open28(gr)
        return gr

    a, b = pose(clone(g)), pose(clone(g))
    for x, y in sparks_a:
        s(a, x, y, spark_ch)
    for x, y in sparks_b:
        s(b, x, y, spark_ch)
    return a, b
