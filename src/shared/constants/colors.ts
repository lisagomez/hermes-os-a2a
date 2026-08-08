/**
 * Paleta del dashboard (skin ejecutiva, tema dual light/dark).
 * Entidades y estados validados con dataviz/validate_palette.js: PASS
 * completo, ΔE adyacente 41.3. El color sigue a la ENTIDAD (vertical),
 * nunca a su posición o rank — idéntico en ambos temas.
 */
export const VERTICAL_COLOR: Record<string, string> = {
  personal: '#3987e5', // slot 1 azul
  negocio: '#199e70', // slot 2 aqua
  clientes: '#c98500', // slot 3 amarillo
}

export const SERIE_COLOR = '#3987e5'

// Estado (reservados, jamás como serie): bien / alerta (>=80%) / crítico (>=100%)
export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  critical: '#d03b3b',
} as const

// El CHROME del chart (grid/axis/labels/halo) sí depende del tema: se
// resuelve vía CSS vars (globals.css define los valores light y .dark).
// Los charts son SVG con estos valores en style/attrs — var() funciona ahí.
export const CHROME = {
  grid: 'var(--viz-grid)', // hairline recesivo
  axis: 'var(--viz-axis)',
  muted: 'var(--viz-muted)', // labels
  surface: 'var(--surface)', // fondo de card, halo de puntos en charts
} as const

/**
 * Color + alpha (0..1). Hex de 6 dígitos → `rgba(...)`; cualquier otro valor
 * CSS (p. ej. `var(--viz-muted)`, necesario desde el tema dual) →
 * `color-mix(in srgb, <color> N%, transparent)`, que el navegador resuelve
 * con el valor vigente del tema. Nunca devuelve CSS inválido por concatenación.
 */
export function conAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color)
  if (!m) return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${alpha})`
}
