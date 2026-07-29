// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { LIMITE_BRIEF_BYTES, esquemaSolicitudReserva } from './contratos'

const valida = {
  slug: 'ana-torres',
  asesorId: 'asesor-ana',
  servicioId: null,
  inicio: '2026-07-30T16:00:00.000Z',
  cliente: { nombre: 'Marta Villa', email: 'marta@ejemplo.mx', telefono: '525511112222' },
  sessionDepth: 'quick' as const,
  brief: null,
  token: null,
}

describe('esquemaSolicitudReserva — la profundidad manda sobre el brief', () => {
  it('acepta quick sin brief y discovery con brief', () => {
    expect(esquemaSolicitudReserva.safeParse(valida).success).toBe(true)
    expect(
      esquemaSolicitudReserva.safeParse({
        ...valida,
        sessionDepth: 'discovery',
        brief: [{ pregunta: '¿Giro?', respuesta: 'Logística' }],
      }).success
    ).toBe(true)
  })

  it('rechaza quick CON brief y discovery SIN brief (o vacío)', () => {
    expect(esquemaSolicitudReserva.safeParse({ ...valida, brief: [{ pregunta: 'x', respuesta: 'y' }] }).success).toBe(false)
    expect(esquemaSolicitudReserva.safeParse({ ...valida, sessionDepth: 'discovery' }).success).toBe(false)
    expect(esquemaSolicitudReserva.safeParse({ ...valida, sessionDepth: 'discovery', brief: [] }).success).toBe(false)
  })
})

describe('esquemaSolicitudReserva — límites duros (superficie pública)', () => {
  it('rechaza campos sobredimensionados', () => {
    expect(esquemaSolicitudReserva.safeParse({ ...valida, cliente: { ...valida.cliente, nombre: 'x'.repeat(121) } }).success).toBe(false)
    expect(esquemaSolicitudReserva.safeParse({ ...valida, cliente: { ...valida.cliente, telefono: '1'.repeat(21) } }).success).toBe(false)
    expect(esquemaSolicitudReserva.safeParse({ ...valida, cliente: { ...valida.cliente, email: 'no-es-correo' } }).success).toBe(false)
  })

  it('rechaza un brief que excede el límite en bytes', () => {
    const gordo = Array.from({ length: 10 }, (_, i) => ({ pregunta: `p${i} ${'x'.repeat(190)}`, respuesta: 'y'.repeat(590) }))
    expect(JSON.stringify(gordo).length).toBeGreaterThan(LIMITE_BRIEF_BYTES)
    expect(esquemaSolicitudReserva.safeParse({ ...valida, sessionDepth: 'discovery', brief: gordo }).success).toBe(false)
  })

  it('rechaza campos obligatorios vacíos y fechas no ISO', () => {
    expect(esquemaSolicitudReserva.safeParse({ ...valida, cliente: { ...valida.cliente, nombre: '' } }).success).toBe(false)
    expect(esquemaSolicitudReserva.safeParse({ ...valida, inicio: '30/07/2026 10:00' }).success).toBe(false)
  })
})
