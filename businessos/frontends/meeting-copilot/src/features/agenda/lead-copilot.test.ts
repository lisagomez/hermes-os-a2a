import { describe, expect, it } from 'vitest'
import { filaLeadCopilot, leadIdCopilot } from './lead-copilot'
import type { SolicitudReservaValidada } from './contratos'

const SOLICITUD: SolicitudReservaValidada = {
  slug: 'a2a',
  asesorId: 'asesor-1',
  servicioId: null,
  inicio: '2026-08-12T16:00:00-06:00',
  cliente: { nombre: 'Ana Prueba', email: 'Ana@Ejemplo.Test', telefono: '+52 55 1234 5678' },
  sessionDepth: 'quick',
  brief: null,
  token: null,
}

describe('leadIdCopilot', () => {
  it('es determinista y normaliza mayúsculas/espacios (upsert idempotente)', () => {
    const a = leadIdCopilot('Ana@Ejemplo.Test')
    const b = leadIdCopilot('  ana@ejemplo.test ')
    expect(a).toBe(b)
    expect(a).toMatch(/^copilot-[0-9a-f]{16}$/)
  })

  it('emails distintos JAMÁS comparten fila', () => {
    expect(leadIdCopilot('a@x.test')).not.toBe(leadIdCopilot('b@x.test'))
  })
})

describe('filaLeadCopilot', () => {
  it('arma la fila del contrato de public.leads con origen copilot', () => {
    const fila = filaLeadCopilot(SOLICITUD)
    expect(fila.lead_id).toBe(leadIdCopilot('ana@ejemplo.test'))
    expect(fila.origen).toBe('copilot')
    expect(fila.canal).toBe('agenda')
    expect(fila.contacto).toContain('Ana Prueba <Ana@Ejemplo.Test>')
    expect(fila.mensaje).toContain('quick')
  })

  it('NO viaja etapa: el default cubre la fila nueva y el upsert no resetea etapas avanzadas', () => {
    expect('etapa' in filaLeadCopilot(SOLICITUD)).toBe(false)
  })

  it('el brief de discovery viaja dentro de datos', () => {
    const conBrief = {
      ...SOLICITUD,
      sessionDepth: 'discovery' as const,
      brief: [{ pregunta: '¿Qué proceso quieres automatizar?', respuesta: 'automatizar cobros' }] as SolicitudReservaValidada['brief'],
    }
    const datos = filaLeadCopilot(conBrief).datos as Record<string, unknown>
    expect(datos.brief).toEqual(conBrief.brief)
    expect(datos.sessionDepth).toBe('discovery')
  })
})
