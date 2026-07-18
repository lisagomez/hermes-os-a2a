// Layout estático de la escena de oficina, en coordenadas PORCENTAJE (0–100)
// para que escale sin media queries. TODO es determinista y puro: no hay
// Math.random() ni Date.now() aquí — el estado inicial del sim se deriva de
// estas constantes, garantizando SSR y primer paint cliente idénticos.
import { AGENTS } from '../../agents';
import type { Point, Rect, Zone } from './types';

/** Orden fijo de agentes (2 filas de 4). */
const IDS = AGENTS.map((a) => a.id);

/** Ancho/alto del box de escritorio (en % de la escena). */
export const DESK_W = 14;
export const DESK_H = 15;
/** Diámetro del orbe de agente, en px (constante visual). */
export const ORB_PX = 30;

const COLS_X = [5, 23, 41, 59]; // left % del box de escritorio por columna
const ROW_TOP = [15, 53]; // top % del box por fila
const SEAT_Y = [40, 77]; // top % del centro del orbe (silla, frente al desk)

/** Box de cada escritorio (top-left + tamaño), indexado por agent.id. */
export const DESKS: Record<string, Rect> = {};
/** Silla / posición de trabajo (centro del orbe), indexado por agent.id. */
export const SEATS: Record<string, Point> = {};
/** Glifo decorativo por escritorio (planta/impresora/servidor estilizados). */
export const DESK_DECOR: Record<string, string> = {};

const DECOR = ['⬢', '▦', '⇄', '☎', '★', '↻', '▲', '◆'];

IDS.forEach((id, i) => {
  const col = i % 4;
  const row = i < 4 ? 0 : 1;
  DESKS[id] = { x: COLS_X[col], y: ROW_TOP[row], w: DESK_W, h: DESK_H };
  SEATS[id] = { x: COLS_X[col] + DESK_W / 2, y: SEAT_Y[row] };
  DESK_DECOR[id] = DECOR[i % DECOR.length];
});

/** Pisos de zonas comunes (rectángulos absolutos). */
export const ZONE_RECTS: Record<Zone, Rect> = {
  meeting: { x: 75, y: 9, w: 22, h: 32 },
  cafe: { x: 75, y: 55, w: 22, h: 34 },
};

/** Punto destino (centro) al que camina un agente en cada zona. */
export const ZONE_POINTS: Record<Zone, Point> = {
  meeting: { x: 86, y: 25 },
  cafe: { x: 86, y: 72 },
};

/** Desfase determinista por agente para no solaparse dentro de una zona. */
export const WALK_OFFSETS: Record<string, Point> = {};
IDS.forEach((id, i) => {
  WALK_OFFSETS[id] = { x: ((i % 3) - 1) * 6, y: (Math.floor(i / 3) - 1) * 6 };
});
