// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { calcularSlots, diaSemanaDe, fmtHoraEnTz, instanteUtc, semaforoDisponibilidad, sumarDias } from './slots'
import type { Excepcion, ReglaDia } from './types'

const TZ_MX = 'America/Mexico_City' // UTC-6 fijo (sin DST desde 2022)
const TZ_CO = 'America/Bogota' // UTC-5 fijo
const TZ_NY = 'America/New_York' // CON DST (cambia 2026-03-08)

const AHORA = '2026-07-27T00:00:00.000Z'
// 2026-07-28 es martes
const MARTES = '2026-07-28'

const reglasMartes = (inicio: string, fin: string): ReglaDia[] => [{ dia: 2, franjas: [{ inicio, fin }] }]

const base = {
  fecha: MARTES,
  zonaHorariaAsesor: TZ_MX,
  reglas: reglasMartes('09:00', '11:00'),
  excepciones: [] as Excepcion[],
  citasOcupadas: [] as Array<{ inicio: string; fin: string }>,
  duracionMin: 30,
  bufferMin: 0,
  ahora: AHORA,
}

describe('calcularSlots — franjas y buffer', () => {
  it('corta la franja en pasos de duración (09:00–11:00 MX = 4 slots de 30)', () => {
    const slots = calcularSlots(base)
    expect(slots).toHaveLength(4)
    // 09:00 en CDMX (UTC-6) = 15:00Z
    expect(slots[0].inicio).toBe('2026-07-28T15:00:00.000Z')
    expect(slots.every((s) => s.disponible)).toBe(true)
  })

  it('el buffer separa slots (30+15 → solo 3 caben en 2 h)', () => {
    const slots = calcularSlots({ ...base, bufferMin: 15 })
    expect(slots).toHaveLength(3)
  })

  it('día sin reglas → []', () => {
    expect(calcularSlots({ ...base, fecha: '2026-07-29' })).toEqual([]) // miércoles sin regla
  })

  it('slots en el pasado se marcan (no se ofrecen)', () => {
    const slots = calcularSlots({ ...base, ahora: '2026-07-28T15:20:00.000Z' })
    expect(slots[0]).toMatchObject({ disponible: false, motivo: 'pasado' })
    expect(slots[1].disponible).toBe(true)
  })

  it('una cita ocupada parte el hueco (y el buffer la expande)', () => {
    const ocupada = { inicio: '2026-07-28T15:30:00.000Z', fin: '2026-07-28T16:00:00.000Z' } // 09:30–10:00 MX
    const sinBuffer = calcularSlots({ ...base, citasOcupadas: [ocupada] })
    expect(sinBuffer.map((s) => s.disponible)).toEqual([true, false, true, true])
    expect(sinBuffer[1].motivo).toBe('ocupado')
  })

  it('una excepción bloquea sus slots', () => {
    const exc: Excepcion = {
      id: 'e1',
      asesorId: 'x',
      tipo: 'bloqueo',
      desde: '2026-07-28T16:00:00.000Z',
      hasta: '2026-07-28T17:00:00.000Z', // 10:00–11:00 MX
      motivo: 'comité',
    }
    const slots = calcularSlots({ ...base, excepciones: [exc] })
    expect(slots.map((s) => s.disponible)).toEqual([true, true, false, false])
    expect(slots[2].motivo).toBe('excepcion')
  })
})

describe('calcularSlots — zonas horarias (UTC interno, reglas en TZ del asesor)', () => {
  it('la MISMA regla 09:00 produce instantes UTC distintos según la TZ del asesor', () => {
    const mx = calcularSlots(base)
    const co = calcularSlots({ ...base, zonaHorariaAsesor: TZ_CO })
    expect(mx[0].inicio).toBe('2026-07-28T15:00:00.000Z') // 09:00 UTC-6
    expect(co[0].inicio).toBe('2026-07-28T14:00:00.000Z') // 09:00 UTC-5
    // Proyección al cliente: el instante de CO visto desde MX es las 08:00
    expect(fmtHoraEnTz(co[0].inicio, TZ_MX)).toBe('08:00')
  })

  it('DST: la regla 09:00 NY cambia de offset al cruzar el 2026-03-08', () => {
    // Sábado 2026-03-07 (EST, UTC-5) vs lunes 2026-03-09 (EDT, UTC-4)
    const reglas: ReglaDia[] = [
      { dia: 6, franjas: [{ inicio: '09:00', fin: '10:00' }] },
      { dia: 1, franjas: [{ inicio: '09:00', fin: '10:00' }] },
    ]
    const antes = calcularSlots({ ...base, zonaHorariaAsesor: TZ_NY, reglas, fecha: '2026-03-07', ahora: '2026-03-01T00:00:00.000Z' })
    const despues = calcularSlots({ ...base, zonaHorariaAsesor: TZ_NY, reglas, fecha: '2026-03-09', ahora: '2026-03-01T00:00:00.000Z' })
    expect(antes[0].inicio).toBe('2026-03-07T14:00:00.000Z') // 09:00 EST
    expect(despues[0].inicio).toBe('2026-03-09T13:00:00.000Z') // 09:00 EDT
  })

  it('instanteUtc y diaSemanaDe son coherentes', () => {
    expect(instanteUtc('2026-07-28', '09:00', TZ_MX).toISOString()).toBe('2026-07-28T15:00:00.000Z')
    expect(diaSemanaDe('2026-07-28')).toBe(2)
    expect(sumarDias('2026-07-31', 1)).toBe('2026-08-01')
  })
})

describe('semaforoDisponibilidad (siempre derivado)', () => {
  const semana: ReglaDia[] = [1, 2, 3, 4, 5].map((dia) => ({ dia: dia as 1 | 2 | 3 | 4 | 5, franjas: [{ inicio: '09:00', fin: '12:00' }] }))

  it('slot libre hoy/mañana → inmediata (2026-07-27 es lunes)', () => {
    expect(
      semaforoDisponibilidad({ ...base, reglas: semana, ahora: '2026-07-27T10:00:00.000Z' })
    ).toBe('inmediata')
  })

  it('sin franjas → sin_agenda', () => {
    expect(semaforoDisponibilidad({ ...base, reglas: [], ahora: AHORA })).toBe('sin_agenda')
  })

  it('semana llena de citas → sin_agenda (no miente disponibilidad)', () => {
    const ocupadas: Array<{ inicio: string; fin: string }> = []
    for (let d = 0; d < 8; d++) {
      const fecha = sumarDias('2026-07-27', d)
      ocupadas.push({ inicio: `${fecha}T00:00:00.000Z`, fin: `${fecha}T23:59:00.000Z` })
    }
    expect(
      semaforoDisponibilidad({ ...base, reglas: semana, citasOcupadas: ocupadas, ahora: '2026-07-27T10:00:00.000Z' })
    ).toBe('sin_agenda')
  })
})
