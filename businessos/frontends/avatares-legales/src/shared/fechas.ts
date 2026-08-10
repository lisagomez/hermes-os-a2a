/**
 * Ayudantes de fecha para los módulos de fixtures.
 *
 * Regla anti-desajuste de hidratación (plan §Mock): "hoy" se calcula UNA sola
 * vez por módulo de fixtures y las fechas viajan a la UI ya FORMATEADAS como
 * texto, renderizadas solo en server components.
 */

const FORMATO = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** "12 ago 2026" */
export function formatearFecha(fecha: Date): string {
  return FORMATO.format(fecha)
}

/** Fecha desplazada `dias` respecto a una base (negativo = pasado). */
export function desplazarDias(base: Date, dias: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + dias)
}
