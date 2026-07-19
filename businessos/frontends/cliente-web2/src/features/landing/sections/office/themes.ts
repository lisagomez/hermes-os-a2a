/**
 * Registro de TEMAS de personajes para la sección "La Oficina A2A".
 *
 * Cada tema cambia ÚNICAMENTE el sprite sheet (la url de `backgroundImage`).
 * Todos los sheets comparten la MISMA geometría del contrato en `sprites.ts`
 * (96×160 px, 8 filas × 6 columnas). El resto del render (posiciones, tick,
 * chip glyph, pausas) es idéntico entre temas.
 *
 * Unión discriminada por `kind`:
 *  - 'original': tema propio de A2A, sin metadatos de licencia.
 *  - 'derived' : tema derivado de una fuente externa; obliga a declarar
 *                `license` y `credit` (los 4 temas actuales NO lo son).
 */

import type { Lang } from '@/shared/i18n/strings';

type OfficeThemeBase = {
  id: string;
  label: Record<Lang, string>;
  sheet: string;
};

export type OfficeTheme = OfficeThemeBase &
  ({ kind: 'original' } | { kind: 'derived'; license: string; credit: string });

export const OFFICE_THEMES: readonly OfficeTheme[] = [
  {
    id: 'a2a',
    kind: 'original',
    label: { es: 'A2A Original', en: 'A2A Original' },
    sheet: '/office/sprites.png',
  },
  {
    id: 'retro',
    kind: 'original',
    label: { es: 'Oficina Retro', en: 'Retro Office' },
    sheet: '/office/themes/retro.png',
  },
  {
    id: 'shonen',
    kind: 'original',
    label: { es: 'Guerreros Anime', en: 'Anime Warriors' },
    sheet: '/office/themes/shonen.png',
  },
  {
    id: 'futbol',
    kind: 'original',
    label: { es: 'Once Ideal', en: 'Dream Team' },
    sheet: '/office/themes/futbol.png',
  },
] as const;

export const DEFAULT_THEME_ID = 'a2a';

/** Clave de persistencia en localStorage (validada contra OFFICE_THEMES). */
export const THEME_STORAGE_KEY = 'a2a-office-theme';

/** Devuelve el tema por id, o `undefined` si el id no existe en el registro. */
export function themeById(id: string): OfficeTheme | undefined {
  return OFFICE_THEMES.find((t) => t.id === id);
}
