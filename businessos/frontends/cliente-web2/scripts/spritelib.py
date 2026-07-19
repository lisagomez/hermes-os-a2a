# -*- coding: utf-8 -*-
"""Libreria compartida de generacion de sprite sheets pixel-art (RGBA PNG).

Solo stdlib (zlib + struct + os). Sin dependencias externas.

Provee:
  - hex2rgb, save_png_rgba: emision PNG cruda.
  - grid, s, row, clone, swap: helpers de manipulacion de grids ASCII.
  - blink: parpadeo generico de ojos (fila 6/7 del grid).
  - walk_frames: piernas alternadas A/B, personalizable via parametros de
    zona de piernas (filas/columnas/colores) para temas futuros (p.ej.
    futbolistas con short+media+boton) sin forkear la funcion.
  - celebrate_frames: brazos arriba + destello alternante.
  - compose_sheet: compone un sheet completo (N filas de personajes x M
    columnas de frames) a partir de una lista de "specs" -> bytes PNG.

Cada letra del grid es 1 pixel; '.' = transparente.
"""
import struct
import zlib


# ---------- helpers de grid ----------

def grid(rows):
    return [list(r) for r in rows]


def s(g, x, y, ch):
    g[y][x] = ch


def row(g, x, y, txt):
    for i, ch in enumerate(txt):
        g[y][x + i] = ch


def clone(g):
    return [r[:] for r in g]


def swap(g, x, y1, y2):
    g[y1][x], g[y2][x] = g[y2][x], g[y1][x]


# ---------- frames genericos ----------

def blink(g, eye_row=6, lid_row=7, eye_chars=('E', 'w'), closed_ch='k',
          special=None):
    """idle-B generico: parpadeo. Cierra los pixeles de eye_row donde
    lid_row tiene 'E' (o el char de ojo dado), reemplazandolos por closed_ch.

    special: callback opcional (b) -> b para personajes cuyo parpadeo no
    sigue el patron estandar (p.ej. LEDGER-X: el glint del visor cambia de
    lado en vez de cerrar ojos). Si se da, se usa en vez de la logica
    default y se retorna directo.
    """
    b = clone(g)
    if special is not None:
        return special(b)
    w = len(b[0])
    for x in range(w):
        if b[eye_row][x] in eye_chars and b[lid_row][x] == 'E':
            b[eye_row][x] = closed_ch
        if b[eye_row][x] == 'E':
            b[eye_row][x] = closed_ch
    return b


def walk_frames(g, swing_x=None,
                 leg_a_x=9, leg_a_row1=17, leg_a_row2=18, leg_a_len=4,
                 leg_b_x=3, leg_b_row1=17, leg_b_row2=18, leg_b_len=4,
                 leg_fill_ch='o', leg_clear_ch='.',
                 swing_rows=(12, 13)):
    """walk-A/B: piernas alternadas; swing_x = columna del brazo libre que
    sube en A (None = sin vaiven; el prop en la otra mano se mantiene
    intacto).

    Zona de piernas parametrizable (default = comportamiento original de
    A2A) para que temas futuros (p.ej. futbolistas con short+media+boton)
    puedan personalizar filas/columnas/colores de las piernas sin forkear
    esta funcion:
      - leg_a_x/leg_a_row1/leg_a_row2/leg_a_len: pierna que se recoge en
        el frame A (fila row1 se rellena con leg_fill_ch, fila row2 se
        limpia con leg_clear_ch).
      - leg_b_x/leg_b_row1/leg_b_row2/leg_b_len: idem para el frame B.
      - swing_rows: filas donde se intercambia el pixel en swing_x (vaiven
        de brazo).
    """
    a = clone(g); b = clone(g)
    row(a, leg_a_x, leg_a_row1, leg_fill_ch * leg_a_len)
    row(a, leg_a_x, leg_a_row2, leg_clear_ch * leg_a_len)
    row(b, leg_b_x, leg_b_row1, leg_fill_ch * leg_b_len)
    row(b, leg_b_x, leg_b_row2, leg_clear_ch * leg_b_len)
    if swing_x is not None:
        y1, y2 = swing_rows
        swap(a, swing_x, y1, y2)
    return a, b


def celebrate_frames(g, arms, spark_ch, sparks_a, sparks_b, pose_fn=None):
    """celebrate-A/B: brazo(s) arriba + destello alternante.
    arms: 'both' | 'left' | 'right' (single-arm = la otra mano conserva su
    prop). spark_ch: caracter de color del destello.
    pose_fn: callback opcional pose_fn(gr, arms) que aplica la pose
    (default: usa _arm_up_left/_arm_up_right/_mouth_open estandar de A2A).
    """
    def default_pose(gr, arms):
        if arms in ('both', 'left'):
            _arm_up_left(gr)
        if arms in ('both', 'right'):
            _arm_up_right(gr)
        _mouth_open(gr)
        return gr

    fn = pose_fn or default_pose
    a = fn(clone(g), arms); b = fn(clone(g), arms)
    for x, y in sparks_a:
        s(a, x, y, spark_ch)
    for x, y in sparks_b:
        s(b, x, y, spark_ch)
    return a, b


def _mouth_open(gr):
    row(gr, 6, 8, 'mmm')  # boca abierta feliz


def _arm_up_left(gr):
    for y in (11, 12, 13):
        s(gr, 2, y, '.'); s(gr, 3, y, 'o')
    s(gr, 2, 9, 's'); s(gr, 2, 10, 's'); s(gr, 2, 8, 'k')
    for y in (8, 9, 10):
        s(gr, 1, y, 'o')
    s(gr, 2, 7, 'o')


def _arm_up_right(gr):
    for y in (11, 12, 13):
        s(gr, 12, y, 'o'); s(gr, 13, y, '.')
    s(gr, 13, 9, 's'); s(gr, 13, 10, 's'); s(gr, 13, 8, 'k')
    for y in (8, 9, 10):
        s(gr, 14, y, 'o')
    s(gr, 13, 7, 'o')


# Posiciones de destello reutilizables (pixeles libres verificados contra
# el grid BASE de A2A: 16x20, personaje centrado).
SPARKS_L_A = [(0, 4), (1, 5), (2, 3)]
SPARKS_L_B = [(0, 6), (1, 2), (2, 5)]
SPARKS_R_A = [(13, 3), (14, 5), (15, 4)]
SPARKS_R_B = [(13, 6), (14, 4), (15, 2)]


# ---------- emision PNG (RGBA, stdlib puro) ----------

def hex2rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def save_png_rgba(path, px, w, h):
    raw = b''.join(
        b'\x00' + b''.join(bytes(p) for p in rowpx) for rowpx in px
    )

    def chunk(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)


def compose_sheet(rows_of_frames, cell_w, cell_h, cols):
    """Compone un sheet a partir de una lista de filas; cada fila es una
    lista de (frame_grid, colors_dict) en orden de columnas.

    rows_of_frames: [[(frame, colors), ...] , ...]  (una lista por fila de
    personaje, cada una con `cols` tuplas frame/colors).
    Retorna (png_bytes, w, h).
    """
    w = cols * cell_w
    h = len(rows_of_frames) * cell_h
    px = [[(0, 0, 0, 0)] * w for _ in range(h)]
    for r, frames_row in enumerate(rows_of_frames):
        for col, (fr, colors) in enumerate(frames_row):
            ox, oy = col * cell_w, r * cell_h
            for y in range(cell_h):
                for x in range(cell_w):
                    ch = fr[y][x]
                    if ch == '.':
                        continue
                    if ch not in colors:
                        raise KeyError('letra sin color %r en fila %d col %d (%d,%d)'
                                       % (ch, r, col, x, y))
                    px[oy + y][ox + x] = hex2rgb(colors[ch]) + (255,)
    raw = b''.join(
        b'\x00' + b''.join(bytes(p) for p in rowpx) for rowpx in px
    )

    def chunk(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    return png, w, h
