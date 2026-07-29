// @vitest-environment node
// Sin red en tests: nada del pipeline mock debe tocar fetch; si algo lo hace,
// truena y el test lo delata (patrón pre-discovery/pipeline.test.ts).
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AHORA_FIJO } from './mock'
import {
  aprobarCita,
  enviarSolicitudReserva,
  rechazarCita,
  reasignarCita,
  reprogramarCita,
  slotsDeAsesor,
  validarEnlace,
} from './pipeline'
import { useAgendaStore } from './store'
import type { SolicitudReserva } from './types'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red en tests')))
  useAgendaStore.setState(useAgendaStore.getInitialState(), true)
})

function solicitudEn(inicio: string, extra?: Partial<SolicitudReserva>): SolicitudReserva {
  return {
    slug: 'ana-torres',
    asesorId: 'asesor-ana',
    servicioId: null,
    inicio,
    cliente: { nombre: 'Marta Villa', email: 'marta@ejemplo.mx', telefono: '525511112222' },
    sessionDepth: 'quick',
    brief: null,
    token: null,
    ...extra,
  }
}

function primerSlotLibre(fecha: string, duracionMin?: number): string {
  const slots = slotsDeAsesor({ asesorId: 'asesor-ana', fecha, ahora: AHORA_FIJO, duracionMin })
  const libre = slots.find((s) => s.disponible)
  expect(libre).toBeDefined()
  return libre!.inicio
}

describe('enviarSolicitudReserva (mock declarado)', () => {
  it('crea la cita en solicitada con procedencia mock y MOTIVO del fallback', async () => {
    const r = await enviarSolicitudReserva(solicitudEn(primerSlotLibre('2026-08-03')), { ahora: AHORA_FIJO })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.cita.estado).toBe('solicitada')
      expect(r.cita.procedencia.metodo).toBe('mock')
      expect(r.cita.procedencia.fuente).toContain('motivo:')
      expect(r.cita.historial[0]).toMatchObject({ de: null, a: 'solicitada', actor: 'cliente' })
    }
  })

  it('un slot recién tomado deja de ofrecerse y una segunda solicitud se rechaza', async () => {
    const inicio = primerSlotLibre('2026-08-03')
    await enviarSolicitudReserva(solicitudEn(inicio), { ahora: AHORA_FIJO })
    const slots = slotsDeAsesor({ asesorId: 'asesor-ana', fecha: '2026-08-03', ahora: AHORA_FIJO })
    expect(slots.find((s) => s.inicio === inicio)?.disponible).toBe(false)
    const r2 = await enviarSolicitudReserva(solicitudEn(inicio), { ahora: AHORA_FIJO })
    expect(r2.ok).toBe(false)
  })

  it('el enlace de reserva es de UN solo uso', async () => {
    expect(validarEnlace('rsv-demo')).not.toBeNull()
    const r1 = await enviarSolicitudReserva(solicitudEn(primerSlotLibre('2026-08-03'), { token: 'rsv-demo' }), { ahora: AHORA_FIJO })
    expect(r1.ok).toBe(true)
    expect(validarEnlace('rsv-demo')).toBeNull()
    const r2 = await enviarSolicitudReserva(solicitudEn(primerSlotLibre('2026-08-04'), { token: 'rsv-demo' }), { ahora: AHORA_FIJO })
    expect(r2.ok).toBe(false)
    if (!r2.ok) expect(r2.motivo).toMatch(/enlace/)
  })

  it('un servicio con pago previo produce la cita con pagoEstado pendiente', async () => {
    const inicio = primerSlotLibre('2026-08-03', 60)
    const r = await enviarSolicitudReserva(solicitudEn(inicio, { servicioId: 'srv-auditoria' }), { ahora: AHORA_FIJO })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.cita.pagoEstado).toBe('pendiente')
  })
})

describe('aprobarCita — el notificador mock simula al host-job', () => {
  it('aprueba, registra exactamente [email, whatsapp] y termina en confirmada', async () => {
    const { resultado, notificaciones } = await aprobarCita('cita-demo-solicitada', { ahora: AHORA_FIJO })
    expect(resultado.ok).toBe(true)
    if (resultado.ok) expect(resultado.cita.estado).toBe('confirmada')
    expect(notificaciones.map((n) => n.canal)).toEqual(['email', 'whatsapp'])
    expect(notificaciones.every((n) => n.estado === 'enviada' && n.enviadaAt === AHORA_FIJO)).toBe(true)
    // Idempotencia en el store: una sola pareja para esta cita/plantilla
    const registradas = useAgendaStore.getState().notificaciones.filter((n) => n.citaId === 'cita-demo-solicitada')
    expect(registradas).toHaveLength(2)
    // La confirmación la firma el sistema, no el asesor (separa decisión de comunicación)
    const cita = useAgendaStore.getState().citas.find((c) => c.id === 'cita-demo-solicitada')!
    expect(cita.historial.at(-1)).toMatchObject({ evento: 'confirmar', actor: 'sistema_notificador' })
  })

  it('un canal en error deja la cita en aprobada con evento fallo_notificacion (fallo VISIBLE)', async () => {
    const { resultado } = await aprobarCita('cita-demo-solicitada', { ahora: AHORA_FIJO, simularFalloCanal: 'whatsapp' })
    expect(resultado.ok).toBe(true)
    const cita = useAgendaStore.getState().citas.find((c) => c.id === 'cita-demo-solicitada')!
    expect(cita.estado).toBe('aprobada') // NO confirmada: el cliente pudo no enterarse
    expect(cita.historial.some((h) => h.evento === 'fallo_notificacion')).toBe(true)
    const conError = useAgendaStore.getState().notificaciones.find((n) => n.citaId === cita.id && n.canal === 'whatsapp')
    expect(conError).toMatchObject({ estado: 'error', intentos: 1 })
  })

  it('pago pendiente bloquea la aprobación', async () => {
    const { resultado } = await aprobarCita('cita-demo-pago', { ahora: AHORA_FIJO })
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.motivo).toMatch(/pago pendiente/)
  })
})

describe('reasignar / rechazar / reprogramar', () => {
  it('reasignar conserva historial, cambia asesor y la cita sigue solicitada', async () => {
    const r = await reasignarCita('cita-demo-solicitada', 'asesor-luis', { ahora: AHORA_FIJO })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.cita.estado).toBe('solicitada')
      expect(r.cita.asesorId).toBe('asesor-luis')
      expect(r.cita.reasignadaDeAsesorId).toBe('asesor-ana')
      expect(r.cita.historial.at(-1)).toMatchObject({ evento: 'reasignar', detalle: 'reasignada de asesor-ana a asesor-luis' })
    }
  })

  it('rechazar es terminal: después no se puede aprobar', async () => {
    const r = await rechazarCita('cita-demo-solicitada', { ahora: AHORA_FIJO })
    expect(r.ok).toBe(true)
    const { resultado } = await aprobarCita('cita-demo-solicitada', { ahora: AHORA_FIJO })
    expect(resultado.ok).toBe(false)
  })

  it('reprogramar respeta el margen mínimo de horas', async () => {
    // cita-demo-confirmada inicia 2026-07-31T16:00Z; a 6 h del inicio se rechaza
    const tarde = await reprogramarCita('cita-demo-confirmada', '2026-08-04T16:00:00.000Z', { ahora: '2026-07-31T10:00:00.000Z' })
    expect(tarde.ok).toBe(false)
    if (!tarde.ok) expect(tarde.motivo).toMatch(/antelación/)
  })

  it('reprogramar con margen mueve la cita a solicitada con el nuevo horario', async () => {
    const nuevo = slotsDeAsesor({ asesorId: 'asesor-ana', fecha: '2026-08-04', ahora: AHORA_FIJO, duracionMin: 45, excluirCitaId: 'cita-demo-confirmada' })
      .find((s) => s.disponible)!
    const r = await reprogramarCita('cita-demo-confirmada', nuevo.inicio, { ahora: AHORA_FIJO })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.cita.estado).toBe('solicitada') // re-aprobación del asesor
      expect(r.cita.inicio).toBe(nuevo.inicio)
      expect(r.cita.historial.at(-1)?.evento).toBe('reprogramar')
    }
  })

  it('solo una confirmada se reprograma', async () => {
    const r = await reprogramarCita('cita-demo-solicitada', '2026-08-04T16:00:00.000Z', { ahora: AHORA_FIJO })
    expect(r.ok).toBe(false)
  })
})
