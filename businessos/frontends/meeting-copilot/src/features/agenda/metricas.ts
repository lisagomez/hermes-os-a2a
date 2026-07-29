// Métricas del tablero (M4): SIEMPRE derivadas del historial de las citas —
// el observability del addendum sin tabla extra (SPEC §19).

import type { Cita, EstadoCita, EventoCita } from './types'
import { ESTADO_POR_EVENTO, puedeTransicionar } from './types'

export interface MetricasCitas {
  hoy: number
  pendientes: number
  confirmadas: number
  noShowMes: number
  /** Minutos promedio entre crear y aprobar; null sin datos (no se inventa). */
  tiempoMedioAprobacionMin: number | null
}

export function metricasCitas(citas: Cita[], ahora: string): MetricasCitas {
  const dia = ahora.slice(0, 10)
  const mes = ahora.slice(0, 7)

  const esperas: number[] = []
  for (const c of citas) {
    const crear = c.historial.find((h) => h.evento === 'crear')
    const aprobar = c.historial.find((h) => h.evento === 'aprobar')
    if (crear && aprobar) esperas.push((new Date(aprobar.at).getTime() - new Date(crear.at).getTime()) / 60_000)
  }

  return {
    hoy: citas.filter((c) => c.inicio.slice(0, 10) === dia && !['cancelada', 'rechazada'].includes(c.estado)).length,
    pendientes: citas.filter((c) => c.estado === 'solicitada').length,
    confirmadas: citas.filter((c) => c.estado === 'confirmada').length,
    noShowMes: citas.filter((c) => c.estado === 'no_show' && c.inicio.slice(0, 7) === mes).length,
    tiempoMedioAprobacionMin: esperas.length === 0 ? null : Math.round(esperas.reduce((a, b) => a + b, 0) / esperas.length),
  }
}

/** Acciones del asesor en el tablero, DERIVADAS de la máquina (jamás una lista
 *  paralela que pueda desalinearse). solicitada se decide en la bandeja M2. */
const EVENTOS_TABLERO: { evento: EventoCita; etiqueta: string }[] = [
  { evento: 'iniciar', etiqueta: 'Iniciar' },
  { evento: 'completar', etiqueta: 'Completar' },
  { evento: 'marcar_no_show', etiqueta: 'No show' },
  { evento: 'cancelar', etiqueta: 'Cancelar' },
]

export function accionesDisponibles(estado: EstadoCita): { evento: EventoCita; etiqueta: string }[] {
  if (estado === 'solicitada') return [] // su lugar es la bandeja de solicitudes
  return EVENTOS_TABLERO.filter(({ evento }) => {
    const destino = ESTADO_POR_EVENTO[evento]
    return destino !== null && puedeTransicionar(estado, destino)
  })
}

/** Filtros del tablero por ETIQUETA de negocio (Agendada agrupa solicitada+aprobada). */
export const FILTROS_TABLERO: { id: string; etiqueta: string; estados: EstadoCita[] | null }[] = [
  { id: 'todas', etiqueta: 'Todas', estados: null },
  { id: 'agendada', etiqueta: 'Agendadas', estados: ['solicitada', 'aprobada'] },
  { id: 'confirmada', etiqueta: 'Confirmadas', estados: ['confirmada'] },
  { id: 'en_curso', etiqueta: 'En curso', estados: ['en_curso'] },
  { id: 'completada', etiqueta: 'Completadas', estados: ['completada'] },
  { id: 'cancelada', etiqueta: 'Canceladas', estados: ['cancelada'] },
  { id: 'no_show', etiqueta: 'No show', estados: ['no_show'] },
  { id: 'rechazada', etiqueta: 'Rechazadas', estados: ['rechazada'] },
]
