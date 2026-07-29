// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { construirNotificaciones, fusionarNotificaciones, idNotificacion } from './notificaciones'
import { AHORA_FIJO, PROCEDENCIA_MOCK, mockAsesores, mockCitas } from './mock'

const cita = mockCitas().find((c) => c.id === 'cita-demo-solicitada')!
const ana = mockAsesores().find((a) => a.id === 'asesor-ana')!

describe('construirNotificaciones — contrato de cola (host-job)', () => {
  it('SIEMPRE devuelve el par [email, whatsapp] en estado pendiente', () => {
    const n = construirNotificaciones(cita, ana, 'confirmacion_cita', AHORA_FIJO, PROCEDENCIA_MOCK)
    expect(n.map((x) => x.canal)).toEqual(['email', 'whatsapp'])
    expect(n.every((x) => x.estado === 'pendiente' && x.intentos === 0)).toBe(true)
    expect(n[0].destinatario).toBe(cita.cliente.email)
    expect(n[1].destinatario).toBe(cita.cliente.telefono)
  })

  it('el cuerpo es determinista e incluye el mínimo del contrato: nombres, TZ explícita, tipo de sesión y enlace', () => {
    const [n1] = construirNotificaciones(cita, ana, 'confirmacion_cita', AHORA_FIJO, PROCEDENCIA_MOCK)
    const [n2] = construirNotificaciones(cita, ana, 'confirmacion_cita', AHORA_FIJO, PROCEDENCIA_MOCK)
    expect(n1.cuerpo).toBe(n2.cuerpo)
    expect(n1.cuerpo).toContain(cita.cliente.nombre)
    expect(n1.cuerpo).toContain(ana.nombre)
    expect(n1.cuerpo).toContain('GMT-6') // TZ explícita (Mexico_City)
    expect(n1.cuerpo).toContain('Discovery') // tipo de sesión
    expect(n1.cuerpo).toContain(`/reservar/cita/${cita.id}`) // enlace de reprogramar/cancelar
  })

  it('la clave de idempotencia es (cita, canal, plantilla) y la fusión REEMPLAZA, no duplica', () => {
    const primera = construirNotificaciones(cita, ana, 'confirmacion_cita', AHORA_FIJO, PROCEDENCIA_MOCK)
    const repetida = construirNotificaciones(cita, ana, 'confirmacion_cita', AHORA_FIJO, PROCEDENCIA_MOCK)
    const fusion = fusionarNotificaciones(primera, repetida)
    expect(fusion).toHaveLength(2)
    expect(idNotificacion(cita.id, 'email', 'confirmacion_cita')).toBe(`${cita.id}:email:confirmacion_cita`)
  })
})
