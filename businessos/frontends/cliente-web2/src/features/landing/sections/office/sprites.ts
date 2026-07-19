/**
 * Contrato del sprite sheet de la oficina pixel A2A.
 *
 * Fuente de verdad de los personajes: scripts/gen_sprites.py
 * Regenerar el sheet: `python scripts/gen_sprites.py` → public/office/sprites.png
 *
 * Sheet: 120x224 px, 8 filas x 6 columnas, celda 20x28 sin padding.
 * Filas = orden de AGENTS (agents.ts). Columnas = [pose]-A / [pose]-B.
 */

export const SPRITE_SHEET = '/office/sprites.png';

// SPRITE_W/SPRITE_H: estas constantes son DOCUMENTACIÓN del sheet; la geometría
// de RENDER vive en las variables CSS de .office-sprite (globals.css, bloque
// OFFICE SIM: --sw/--sh/--k) — cambiar una exige cambiar la otra.
export const SPRITE_W = 20;
export const SPRITE_H = 28;

export const SHEET_COLS = 6;
export const SHEET_ROWS = 8;

export type SpritePose = 'idle' | 'walk' | 'celebrate';

/** Columnas [frameA, frameB] de cada pose dentro del sheet. */
export const POSE_COLS: Record<SpritePose, [number, number]> = {
  idle: [0, 1],
  walk: [2, 3],
  celebrate: [4, 5],
};

/** Fila del sheet por id de agente (ids exactos de AGENTS en agents.ts). */
export const SPRITE_ROW: Record<string, number> = {
  vendo: 0,
  flujo: 1,
  oraculo: 2,
  ledger: 3,
  musa: 4,
  empatia: 5,
  custodio: 6,
  tesoro: 7,
};
