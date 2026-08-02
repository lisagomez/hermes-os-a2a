// Modo espejo — la pantalla que vende la activación (SPEC-buzon-a2a §11.8).
// Durante los primeros DIAS_MINIMOS_ESPEJO días el agente lee correo real y
// redacta, pero NUNCA envía. Estos contadores son la evidencia que se muestra
// tal cual en la pantalla de firma: la activación deja de ser un salto de fe.

import { DIAS_MINIMOS_ESPEJO, puedeListo } from './onboarding'

export interface VerificacionBloqueada {
  motivo: string
  cantidad: number
}

export interface MetricasEspejo {
  buzonId: string
  borradoresGenerados: number
  sinCambios: number
  conEdicion: number
  rechazados: number
  verificacionesBloqueadas: VerificacionBloqueada[]
}

/** Día N de 7 (o más allá de 7 si el cliente tarda en revisar la evidencia). */
export function diaEspejo(espejoDesde: string, ahora: string): number {
  const dias = Math.floor((new Date(ahora).getTime() - new Date(espejoDesde).getTime()) / (24 * 60 * 60 * 1000)) + 1
  return Math.max(1, dias)
}

export function pctSinCambios(m: MetricasEspejo): number {
  if (m.borradoresGenerados === 0) return 0
  return Math.round((m.sinCambios / m.borradoresGenerados) * 100)
}

/** El botón "Activar envío real" (§11.8) SOLO aparece al cumplir el mínimo —
 *  reusa el mismo gate `puedeListo` que la máquina de estados, nunca un cálculo paralelo. */
export function puedeMostrarBotonActivar(espejoDesde: string | null, m: MetricasEspejo, ahora: string): boolean {
  return puedeListo({ espejoDesde }, m.borradoresGenerados, ahora).ok
}

/** Buzón recién entrado a espejo y aún sin fixture propio: cero en todo. Esto
 *  es correcto, no un bug — sin borradores reales todavía no puede activarse,
 *  que es exactamente la regla que no se puede saltar. */
export function metricasVacias(buzonId: string): MetricasEspejo {
  return { buzonId, borradoresGenerados: 0, sinCambios: 0, conEdicion: 0, rechazados: 0, verificacionesBloqueadas: [] }
}

export function metricasDe(lista: MetricasEspejo[], buzonId: string): MetricasEspejo {
  return lista.find((m) => m.buzonId === buzonId) ?? metricasVacias(buzonId)
}

export { DIAS_MINIMOS_ESPEJO }
