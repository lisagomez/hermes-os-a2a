/**
 * Paleta del dashboard (modo oscuro único; superficie #0f172a = slate-900).
 * Validada con dataviz/validate_palette.js: PASS completo, ΔE adyacente 41.3.
 * El color sigue a la ENTIDAD (vertical), nunca a su posición o rank.
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

export const CHROME = {
  grid: '#1e293b', // slate-800, hairline recesivo
  axis: '#334155', // slate-700
  muted: '#94a3b8', // slate-400 (labels)
  surface: '#0f172a', // slate-900 (= --surface) — fondo de card, halo de puntos en charts
} as const

/**
 * `#rrggbb` + alpha (0..1) → `rgba(r, g, b, a)`. Si el input no es un hex de
 * 6 dígitos devuelve el color tal cual (sin alpha): mejor un fondo pleno
 * visible que un valor CSS inválido por concatenación.
 */
export function conAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${alpha})`
}
