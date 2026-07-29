/** [mm:ss] — mismo formato que transcripcion-a2a. */
export function fmtTiempo(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDuracion(segundos: number | null): string {
  if (segundos === null) return '—'
  const m = Math.round(segundos / 60)
  return `${m} min`
}

export function fmtFechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function fmtHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function fmtPrecio(centavos: number, moneda: string): string {
  if (centavos === 0) return 'Sin costo'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda, maximumFractionDigits: 0 }).format(centavos / 100)
}

let contador = 0
/** Id único simple (el MVP no necesita ulid; determinista dentro de la sesión). */
export function nuevoId(prefijo: string): string {
  contador += 1
  return `${prefijo}-${Date.now().toString(36)}-${contador}`
}
