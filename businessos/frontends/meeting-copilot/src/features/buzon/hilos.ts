// Selectores PUROS que agrupan entrantes+salientes por hilo (patrón
// agenda/metricas.ts: SIEMPRE derivado, nunca una lista paralela que se
// desalinee). La bandeja unificada (/buzon) y el detalle (/buzon/[hilo])
// consumen esto — cero estado propio de "hilo" en el store.

import type { CorreoEntrante, CorreoSaliente, EstadoHilo } from './types'
import { estadoHilo } from './types'

export interface ResumenHilo {
  hiloId: string
  buzonId: string
  estado: EstadoHilo
  remitente: string
  asunto: string
  ultimoMovimiento: string
  pendientes: number
  /** Al menos un saliente de este hilo terminó en reportado_inyeccion. */
  intentoInyeccion: boolean
  entrantes: CorreoEntrante[]
  salientes: CorreoSaliente[]
}

function ultimoMovimientoDe(entrantes: CorreoEntrante[], salientes: CorreoSaliente[]): string {
  const fechas = [...entrantes.map((e) => e.recibidoEn), ...salientes.map((s) => s.creadoAt)]
  return fechas.sort().at(-1) ?? ''
}

/** Agrupa entrantes+salientes por hiloId y arma UN resumen por hilo, ordenado
 *  por último movimiento (más reciente primero). */
export function resumenHilos(entrantes: CorreoEntrante[], salientes: CorreoSaliente[]): ResumenHilo[] {
  const hiloIds = new Set([...entrantes.map((e) => e.hiloId), ...salientes.map((s) => s.hiloId)])
  const resumenes = [...hiloIds].map((hiloId): ResumenHilo => {
    const entrantesHilo = entrantes.filter((e) => e.hiloId === hiloId).sort((a, b) => a.recibidoEn.localeCompare(b.recibidoEn))
    const salientesHilo = salientes.filter((s) => s.hiloId === hiloId).sort((a, b) => a.creadoAt.localeCompare(b.creadoAt))
    const ultimoEntrante = entrantesHilo.at(-1)
    const ultimoSaliente = salientesHilo.at(-1)
    return {
      hiloId,
      buzonId: (ultimoEntrante ?? ultimoSaliente)!.buzonId,
      estado: estadoHilo(salientesHilo),
      remitente: ultimoEntrante?.remitente ?? '—',
      asunto: ultimoEntrante?.asunto ?? ultimoSaliente?.asunto ?? '(sin asunto)',
      ultimoMovimiento: ultimoMovimientoDe(entrantesHilo, salientesHilo),
      pendientes: salientesHilo.filter((s) => s.estado === 'pendiente_aprobacion').length,
      intentoInyeccion: salientesHilo.some((s) => s.estado === 'reportado_inyeccion'),
      entrantes: entrantesHilo,
      salientes: salientesHilo,
    }
  })
  return resumenes.sort((a, b) => b.ultimoMovimiento.localeCompare(a.ultimoMovimiento))
}

export function resumenHilo(hiloId: string, entrantes: CorreoEntrante[], salientes: CorreoSaliente[]): ResumenHilo | null {
  return resumenHilos(entrantes, salientes).find((h) => h.hiloId === hiloId) ?? null
}
