# -*- coding: utf-8 -*-
"""Generador del sprite sheet del tema "Oficina Retro" (id: retro) — v2, 20x28.

Oficina noventera casual con CUERPO COMPLETO estilo "profesiones pixel"
(cabeza ~1/3, brazos diferenciados, manos 2x2 que sostienen el prop,
piernas separadas, calzado oscuro). Ropa de calle relajada (camisas
remangadas, chalecos, overoles, cardigans), paleta apagada/calida
(beige, azul jean, verde oliva, mostaza, ladrillo, gris). Nada de neon.

Como regenerar:
    python scripts/gen_theme_retro.py
  -> escribe public/office/themes/retro.png (120x224, RGBA, fondo transparente)

Layout del sheet (sin padding, celda exacta 20x28 — ver anatomy.py):
  8 FILAS  (orden de AGENTS): vendo, flujo, oraculo, ledger, musa, empatia, custodio, tesoro
  6 COLUMNAS: idle-A, idle-B(parpadeo), walk-A, walk-B, celebrate-A, celebrate-B

Solo stdlib via anatomy/spritelib. Cada letra del grid es 1 pixel; '.' = transparente.
"""
import os

import anatomy as A
from anatomy import grid, s, row, blink28, walk28, celebrate28, compose_sheet

CELL_W, CELL_H = A.CELL_W, A.CELL_H
SHEET_COLS, SHEET_ROWS = A.SHEET_COLS, A.SHEET_ROWS

# Paleta global (outline compartido con los demas temas de la oficina)
GLOBAL = {
    'o': '#1A1622',  # outline
    'E': '#1A1622',  # ojos
    'w': '#EDEAF4',  # blanco / glint
    'G': '#FFC24D',  # dorado (destello legendary)
    'c': '#28C840',  # verde exito (destello comun)
    'l': '#B9A6FF',  # lila (se sobreescribe por personaje si hace falta)
}

# Tonos del tema retro (referencia):
#   beige #C8B08A  jean #5A6E8C  oliva #7A8450  mostaza #C9A227
#   ladrillo #A65846  gris #8C8A94


# ---------- personajes (grids idle 20x28) ----------

def vendo():
    """Vendedor noventero: camisa beige con botones remangada, corbata
    floja ladrillo ladeada, headset gris."""
    g = grid(A.BASE_BODY)
    row(g, 6, 1, 'hkhhhhhh')                   # raya lateral en el peinado
    # headset: pad fuera de la cara + brazo del micro + capsula
    s(g, 3, 5, 'o'); s(g, 3, 6, 'o')
    s(g, 4, 5, 'g'); s(g, 4, 6, 'g')
    s(g, 4, 7, 'o'); s(g, 4, 8, 'g')
    # cuello abierto + corbata floja que se ladea a la derecha
    s(g, 9, 10, 'w'); s(g, 10, 10, 'w')
    s(g, 9, 11, 't'); s(g, 10, 11, 't')        # nudo flojo
    s(g, 10, 12, 't'); s(g, 11, 13, 't'); s(g, 11, 14, 't')
    # botones de la camisa (columna de placket)
    s(g, 8, 12, 'o'); s(g, 8, 14, 'o')
    # mangas remangadas: antebrazos de piel sobre la manga
    for y in (13, 14):
        s(g, 3, y, 'k'); s(g, 4, y, 'k')
        s(g, 15, y, 'k'); s(g, 16, y, 'k')
    return g


def flujo():
    """Repartidora: gorra oliva con visera, coleta, chaleco mostaza con
    bolsillos sobre camisa gris, paquete de carton bajo el brazo."""
    g = grid(A.BASE_BODY)
    row(g, 6, 1, 'CCCCCCCC')                   # copa de la gorra
    row(g, 6, 2, 'CCCCCCCC')
    s(g, 2, 3, 'o'); s(g, 3, 3, 'C'); s(g, 4, 3, 'C')   # visera a la izquierda
    s(g, 3, 4, 'o'); s(g, 4, 4, 'o')
    # coleta saliendo de la gorra (lado derecho)
    s(g, 15, 1, 'o')
    for y in (2, 3, 4):
        s(g, 15, y, 'h'); s(g, 16, y, 'o')
    s(g, 15, 5, 'o')
    # chaleco mostaza: paneles laterales + bolsillos
    for y in (11, 12, 13, 14):
        s(g, 6, y, 'v'); s(g, 7, y, 'v')
        s(g, 12, y, 'v'); s(g, 13, y, 'v')
    s(g, 6, 14, 'o'); s(g, 13, 14, 'o')        # bolsillos del chaleco
    # paquete de carton en la mano izquierda (margen cols 0-2)
    row(g, 0, 12, 'ooo')
    for y in (13, 14, 15, 16):
        s(g, 0, y, 'o'); s(g, 1, y, 'g')
    s(g, 1, 14, 'y')                           # cinta de embalar
    row(g, 0, 17, 'ooo')
    return g


def oraculo():
    """Analista: despeinado, lentes de pasta gruesos, sueter oliva de
    rombos mostaza, taza de cafe."""
    g = grid(A.BASE_BODY)
    s(g, 8, 0, '.'); s(g, 8, 1, 'o')           # silueta dentada (despeinado)
    s(g, 11, 0, '.'); s(g, 11, 1, 'o')
    row(g, 6, 5, 'lEwllEwl')                   # lentes de pasta gruesos
    row(g, 6, 6, 'lEEllEEl')
    # rombos mostaza del sueter (diagonal argyle)
    s(g, 7, 11, 'y'); s(g, 10, 11, 'y'); s(g, 13, 11, 'y')
    s(g, 6, 13, 'y'); s(g, 9, 13, 'y'); s(g, 12, 13, 'y')
    s(g, 8, 15, 'y'); s(g, 11, 15, 'y')
    # taza de cafe en la mano derecha (margen cols 17-19)
    s(g, 18, 11, 'w')                          # vapor
    s(g, 17, 13, 'o'); s(g, 18, 13, 'o')
    s(g, 17, 14, 'w'); s(g, 18, 14, 'w'); s(g, 19, 14, 'o')
    s(g, 17, 15, 'w'); s(g, 18, 15, 'w'); s(g, 19, 15, 'o')
    s(g, 17, 16, 'o'); s(g, 18, 16, 'o')
    return g


def ledger():
    """Contador: visera verde clasica de ala ancha, canas, chaleco gris
    con bolsillos sobre camisa blanca, maletin de cuero."""
    g = grid(A.BASE_BODY)
    row(g, 6, 3, 'nnnnnnnn')                   # banda de la visera
    row(g, 4, 4, 'o' + 'n' * 10 + 'o')         # ala mas ancha que la cara
    # camisa blanca al centro del chaleco
    s(g, 9, 10, 'w'); s(g, 10, 10, 'w')
    for y in (11, 12, 13, 14):
        s(g, 9, y, 'w'); s(g, 10, y, 'w')
    s(g, 8, 12, 'o'); s(g, 8, 14, 'o')         # botones del chaleco
    s(g, 6, 15, 'd'); s(g, 7, 15, 'd')         # bolsillos del chaleco
    s(g, 12, 15, 'd'); s(g, 13, 15, 'd')
    # maletin de cuero colgando de la mano derecha
    s(g, 16, 17, 'o'); s(g, 17, 17, 'o')       # asa
    row(g, 15, 18, 'oooo')
    s(g, 15, 19, 'o'); s(g, 16, 19, 'a'); s(g, 17, 19, 'a'); s(g, 18, 19, 'o')
    s(g, 15, 20, 'o'); s(g, 16, 20, 'y'); s(g, 17, 20, 'a'); s(g, 18, 20, 'o')
    row(g, 15, 21, 'oooo')
    return g


def musa():
    """Creativa: melena amplia ladrillo, overol jean de pintora con peto,
    tirantes y manchas, pincel en mano."""
    g = grid(A.BASE_BODY)
    # melena rizada amplia
    for y in (1, 2, 3, 4):
        s(g, 3, y, 'o'); s(g, 4, y, 'h')
        s(g, 15, y, 'h'); s(g, 16, y, 'o')
    s(g, 4, 0, 'o'); s(g, 15, 0, 'o')
    s(g, 4, 5, 'o'); s(g, 15, 5, 'o')
    # overol jean: tirantes visibles + peto
    s(g, 7, 10, 'd'); s(g, 12, 10, 'd')
    s(g, 7, 11, 'd'); s(g, 12, 11, 'd')
    for y in (12, 13, 14, 15, 16):
        row(g, 7, y, 'dddddd')
    s(g, 9, 14, 'w'); s(g, 10, 14, 'w')        # bolsillo del peto
    # manchas de pintura (peto y pantalon)
    s(g, 8, 13, 'r'); s(g, 11, 15, 'y')
    s(g, 7, 19, 'y'); s(g, 12, 21, 'r')
    # pincel vertical en la mano izquierda
    s(g, 2, 12, 'r')                           # punta con pintura
    s(g, 2, 13, 'o')                           # virola
    s(g, 2, 14, 'g'); s(g, 2, 15, 'g'); s(g, 2, 16, 'g')  # mango
    return g


def empatia():
    """Recepcionista: bob enmarcando la cara, diadema telefonica, cardigan
    ladrillo con botones sobre blusa clara, portapapeles."""
    g = grid(A.BASE_BODY)
    for y in (5, 6, 7):                        # bob
        s(g, 6, y, 'h'); s(g, 13, y, 'h')
    # diadema: pad fuera de la cara + micro
    s(g, 3, 5, 'o'); s(g, 3, 6, 'o')
    s(g, 4, 5, 'g'); s(g, 4, 6, 'g')
    s(g, 4, 7, 'o'); s(g, 4, 8, 'w')
    # blusa clara al centro del cardigan + botones
    s(g, 9, 10, 'w'); s(g, 10, 10, 'w')
    for y in (11, 12, 13, 14):
        s(g, 9, y, 'w'); s(g, 10, y, 'w')
    s(g, 8, 12, 'o'); s(g, 8, 14, 'o')         # botones del cardigan
    # portapapeles en la mano derecha (clip mostaza)
    s(g, 18, 11, 'y')
    row(g, 17, 12, 'ooo')
    for y in (13, 14, 15, 16):
        s(g, 18, y, 'w'); s(g, 19, y, 'o')
    row(g, 17, 17, 'ooo')
    return g


def custodio():
    """Abogado: calvicie con canas laterales, camisa blanca, tirantes
    oscuros, corbatin ladrillo, carpeta de expedientes."""
    g = grid(A.BASE_BODY)
    row(g, 7, 1, 'kkkkkk')                     # coronilla calva (canas a los lados)
    row(g, 7, 2, 'kkkkkk')
    # corbatin ladrillo
    s(g, 8, 11, 'r'); s(g, 9, 11, 'o'); s(g, 10, 11, 'o'); s(g, 11, 11, 'r')
    # tirantes oscuros
    for y in (12, 13, 14, 15):
        s(g, 7, y, 'j'); s(g, 12, y, 'j')
    # carpeta de expedientes mostaza en la mano izquierda
    row(g, 0, 12, 'ooo')
    for y in (13, 14, 15, 16):
        s(g, 0, y, 'o'); s(g, 1, y, 'y')
    s(g, 1, 13, 'w')                           # papel asomando
    row(g, 0, 17, 'ooo')
    return g


def tesoro():
    """Cajera: mono lateral, lentes media luna mostaza con cadena, lapiz
    en la oreja, blusa jean, libreta contable."""
    g = grid(A.BASE_BODY)
    # mono lateral
    s(g, 15, 0, 'o')
    s(g, 15, 1, 'h'); s(g, 16, 1, 'o')
    s(g, 15, 2, 'h'); s(g, 16, 2, 'o')
    s(g, 15, 3, 'o')
    # lentes media luna (bajo la pupila superior)
    s(g, 7, 6, 'y'); s(g, 8, 6, 'y'); s(g, 11, 6, 'y'); s(g, 12, 6, 'y')
    # cadena de los lentes colgando a ambos lados
    s(g, 4, 7, 'y'); s(g, 4, 8, 'y')
    s(g, 15, 7, 'y'); s(g, 15, 8, 'y')
    # lapiz en la oreja
    s(g, 2, 4, 'o'); s(g, 3, 4, 'y'); s(g, 4, 4, 'y')
    # cuello de la blusa + botones
    s(g, 9, 10, 'w'); s(g, 10, 10, 'w')
    s(g, 10, 12, 'w'); s(g, 10, 14, 'w')
    # libreta contable ladrillo en la mano izquierda
    row(g, 0, 12, 'ooo')
    for y in (13, 14, 15, 16):
        s(g, 0, y, 'o'); s(g, 1, y, 'r')
    s(g, 1, 15, 'w')                           # canto de las hojas
    row(g, 0, 17, 'ooo')
    return g


def blink(g, c):
    return blink28(g, closed_ch=c.get('closed_ch', 'k'))


# ---------- plantilla (orden = filas del sheet = orden de AGENTS) ----------
# prop_side: la mano que sostiene el prop no se balancea en walk ni se alza
# en celebrate (arms = el lado LIBRE). Piel repartida 2-2-2-2 como siempre:
#   C68642: vendo, empatia | 8D5524: flujo, ledger
#   F2C79B: oraculo, custodio | FFDBAC: musa, tesoro

CHARS = [
    dict(id='vendo', build=vendo,
         pal={'k': '#C68642', 'h': '#3B2A1E', 's': '#C8B08A', 'd': '#8A755A',
              'p': '#5A6E8C', 'z': '#3F4A63', 'm': '#1A1622', 't': '#A65846',
              'g': '#8C8A94'},
         prop_side=None, arms='both', spark='G'),   # legendary -> dorado
    dict(id='flujo', build=flujo,
         pal={'k': '#8D5524', 'h': '#241A14', 's': '#8C8A94', 'd': '#6B6975',
              'p': '#5A6E8C', 'z': '#3F4A63', 'm': '#1A1622', 'C': '#7A8450',
              'v': '#C9A227', 'g': '#B08D57', 'y': '#C9A227'},
         prop_side='left', arms='right', spark='c'),  # paquete en mano izq
    dict(id='oraculo', build=oraculo,
         pal={'k': '#F2C79B', 'h': '#6B4226', 's': '#7A8450', 'd': '#5C6340',
              'p': '#8C8A94', 'z': '#5C5A66', 'm': '#1A1622', 'y': '#C9A227',
              'l': '#4A4A55'},
         prop_side='right', arms='left', spark='c', closed_ch='l'),  # taza der
    dict(id='ledger', build=ledger,
         pal={'k': '#8D5524', 'h': '#B9B6BD', 's': '#6E6C78', 'd': '#4A4855',
              'p': '#3A3642', 'z': '#17141F', 'm': '#1A1622', 'n': '#3F7A4A',
              'y': '#C9A227', 'a': '#6B4A32'},
         prop_side='right', arms='left', spark='G'),  # legendary; maletin der
    dict(id='musa', build=musa,
         pal={'k': '#FFDBAC', 'h': '#A65846', 's': '#C8B08A', 'd': '#5A6E8C',
              'p': '#5A6E8C', 'z': '#3F4A63', 'm': '#1A1622', 'r': '#A65846',
              'y': '#C9A227', 'g': '#8A6642'},
         prop_side='left', arms='right', spark='c'),  # pincel en mano izq
    dict(id='empatia', build=empatia,
         pal={'k': '#C68642', 'h': '#4A3020', 's': '#A65846', 'd': '#7A4030',
              'p': '#8C8A94', 'z': '#5C5A66', 'm': '#1A1622', 'g': '#8C8A94',
              'y': '#C9A227'},
         prop_side='right', arms='left', spark='c'),  # portapapeles der
    dict(id='custodio', build=custodio,
         pal={'k': '#F2C79B', 'h': '#8C8A94', 's': '#F0EDE4', 'd': '#D8D4C8',
              'p': '#3A3642', 'z': '#17141F', 'm': '#1A1622', 'r': '#A65846',
              'y': '#C9A227', 'j': '#3A3642'},
         prop_side='left', arms='right', spark='c'),  # carpeta en mano izq
    dict(id='tesoro', build=tesoro,
         pal={'k': '#FFDBAC', 'h': '#3B2A1E', 's': '#5A6E8C', 'd': '#3F4A63',
              'p': '#8C8A94', 'z': '#5C5A66', 'm': '#1A1622', 'y': '#C9A227',
              'r': '#A65846'},
         prop_side='left', arms='right', spark='c'),  # libreta en mano izq
]
assert len(CHARS) == SHEET_ROWS


def char_frames(c):
    """6 frames en orden de columnas: idle-A, idle-B, walk-A, walk-B, cel-A, cel-B."""
    g = c['build']()
    ia, ib = g, blink(g, c)
    wa, wb = walk28(g, c['prop_side'])
    ca, cb = celebrate28(g, c['arms'], c['spark'])
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
    assert (w, h) == (A.SHEET_W, A.SHEET_H), (w, h)
    with open(out, 'wb') as f:
        f.write(png)
    print('OK %s %dx%d %.1f KB' % (out, w, h, os.path.getsize(out) / 1024.0))


if __name__ == '__main__':
    main()
