// Motor de slots: funciones PURAS y deterministas ('ahora' siempre inyectado).
// Contrato de tiempo: instantes internos en UTC; las reglas de disponibilidad
// (HH:MM) viven en la TZ del asesor y se materializan a UTC con Intl nativo
// (sin librería de fechas — cubre DST porque el offset se calcula por instante).

import type { EstadoCita, Excepcion, ReglaDia, Slot } from './types'

/** Estados que ocupan agenda (espejo del exclusion constraint de agenda_citas). */
export const ESTADOS_QUE_BLOQUEAN: EstadoCita[] = ['solicitada', 'aprobada', 'confirmada', 'en_curso']

/** Offset (ms) de una TZ IANA en un instante dado: wall-clock reconstruido − instante. */
function offsetMs(instante: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const p = Object.fromEntries(dtf.formatToParts(instante).map((x) => [x.type, x.value]))
  const comoUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second)
  return comoUtc - instante.getTime()
}

/** Instante UTC de "fecha + HH:MM" interpretados en la TZ dada. Doble pase para
 *  que el cruce de DST resuelva con el offset vigente en el instante real. */
export function instanteUtc(fecha: string, hora: string, tz: string): Date {
  const base = new Date(`${fecha}T${hora}:00Z`)
  const primer = offsetMs(base, tz)
  const candidato = new Date(base.getTime() - primer)
  const segundo = offsetMs(candidato, tz)
  return segundo === primer ? candidato : new Date(base.getTime() - segundo)
}

/** Día de la semana (0=domingo) de una fecha calendario — independiente de TZ. */
export function diaSemanaDe(fecha: string): number {
  return new Date(`${fecha}T00:00:00Z`).getUTCDay()
}

/** Fecha calendario ('YYYY-MM-DD') de un instante, vista desde una TZ. */
export function fechaEnTz(isoUtc: string, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(isoUtc)
  )
}

/** 'HH:MM' de un instante proyectado a una TZ (para UI de cliente y asesor). */
export function fmtHoraEnTz(isoUtc: string, tz: string): string {
  return new Intl.DateTimeFormat('es-MX', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(
    new Date(isoUtc)
  )
}

/** Nombre legible de la TZ en un instante (p. ej. 'GMT-6'), para mostrarla EXPLÍCITA. */
export function etiquetaTz(tz: string, isoUtc: string): string {
  const parte = new Intl.DateTimeFormat('es-MX', { timeZone: tz, timeZoneName: 'shortOffset' })
    .formatToParts(new Date(isoUtc))
    .find((p) => p.type === 'timeZoneName')
  return parte ? `${tz.split('/').pop()?.replace(/_/g, ' ')} (${parte.value})` : tz
}

function traslapa(aInicio: number, aFin: number, bInicio: number, bFin: number): boolean {
  return aInicio < bFin && bInicio < aFin
}

export interface ParamsSlots {
  fecha: string // 'YYYY-MM-DD' en la TZ del asesor
  zonaHorariaAsesor: string
  reglas: ReglaDia[]
  excepciones: Excepcion[]
  citasOcupadas: Array<{ inicio: string; fin: string }>
  duracionMin: number
  bufferMin: number
  ahora: string // ISO — inyectado (AHORA_FIJO en mock/tests)
}

/** Slots del día: cada franja se corta en pasos de duración+buffer; un slot es
 *  disponible si no pasó, no cae en excepción y no traslapa cita ocupada
 *  (las ocupadas se expanden con el buffer por ambos lados). */
export function calcularSlots(params: ParamsSlots): Slot[] {
  const { fecha, zonaHorariaAsesor: tz, reglas, excepciones, citasOcupadas, duracionMin, bufferMin, ahora } = params
  const regla = reglas.find((r) => r.dia === diaSemanaDe(fecha))
  if (!regla || regla.franjas.length === 0) return []

  const ahoraMs = new Date(ahora).getTime()
  const durMs = duracionMin * 60_000
  const bufMs = bufferMin * 60_000
  const ocupadas = citasOcupadas.map((c) => ({
    inicio: new Date(c.inicio).getTime() - bufMs,
    fin: new Date(c.fin).getTime() + bufMs,
  }))
  const bloqueos = excepciones.map((e) => ({ inicio: new Date(e.desde).getTime(), fin: new Date(e.hasta).getTime() }))

  const slots: Slot[] = []
  for (const franja of regla.franjas) {
    const franjaInicio = instanteUtc(fecha, franja.inicio, tz).getTime()
    const franjaFin = instanteUtc(fecha, franja.fin, tz).getTime()
    for (let t = franjaInicio; t + durMs <= franjaFin; t += durMs + bufMs) {
      const fin = t + durMs
      let motivo: Slot['motivo']
      if (t <= ahoraMs) motivo = 'pasado'
      else if (bloqueos.some((b) => traslapa(t, fin, b.inicio, b.fin))) motivo = 'excepcion'
      else if (ocupadas.some((o) => traslapa(t, fin, o.inicio, o.fin))) motivo = 'ocupado'
      slots.push({
        inicio: new Date(t).toISOString(),
        fin: new Date(fin).toISOString(),
        disponible: motivo === undefined,
        ...(motivo ? { motivo } : {}),
      })
    }
  }
  return slots
}

export type Semaforo = 'inmediata' | 'proximos_dias' | 'sin_agenda'

export const ETIQUETA_SEMAFORO: Record<Semaforo, string> = {
  inmediata: 'Disponible hoy o mañana',
  proximos_dias: 'Disponible esta semana',
  sin_agenda: 'Sin agenda esta semana',
}

/** SIEMPRE derivado, jamás almacenado: primer día (0..6 desde hoy en la TZ del
 *  asesor) con al menos un slot libre decide el semáforo. */
export function semaforoDisponibilidad(params: Omit<ParamsSlots, 'fecha'>): Semaforo {
  const hoy = fechaEnTz(params.ahora, params.zonaHorariaAsesor)
  for (let d = 0; d < 7; d++) {
    const fecha = sumarDias(hoy, d)
    const libres = calcularSlots({ ...params, fecha }).filter((s) => s.disponible)
    if (libres.length > 0) return d <= 1 ? 'inmediata' : 'proximos_dias'
  }
  return 'sin_agenda'
}

/** Suma días a una fecha calendario 'YYYY-MM-DD' (aritmética pura de calendario). */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}
