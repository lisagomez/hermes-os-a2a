// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { Cita, EstadoCita, EventoCita } from './types'
import {
  ESTADO_POR_EVENTO,
  ETIQUETA_ESTADO_CITA,
  TENANT_DEFAULT,
  TRANSICIONES_CITA,
  aplicarTransicion,
  puedeTransicionar,
} from './types'
import { AHORA_FIJO, PROCEDENCIA_MOCK, crearCitaBase, mockCitas } from './mock'

const ESTADOS: EstadoCita[] = ['solicitada', 'aprobada', 'rechazada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_show']

function citaEn(estado: EstadoCita, extra?: Partial<Cita>): Cita {
  const base = crearCitaBase(
    {
      slug: 'ana-torres',
      asesorId: 'asesor-ana',
      servicioId: null,
      inicio: '2026-07-30T16:00:00.000Z',
      cliente: { nombre: 'Test', email: 'test@x.mx', telefono: '525500000000' },
      sessionDepth: 'quick',
      brief: null,
      token: null,
    },
    'cita-test',
    AHORA_FIJO,
    PROCEDENCIA_MOCK
  )
  return { ...base, estado, ...extra }
}

describe('máquina de estados — matriz EXHAUSTIVA', () => {
  it('toda transición no listada se rechaza (8×8 estados)', () => {
    for (const de of ESTADOS) {
      for (const a of ESTADOS) {
        expect(puedeTransicionar(de, a)).toBe(TRANSICIONES_CITA[de].includes(a))
      }
    }
  })

  it('los terminales no tienen salida', () => {
    for (const terminal of ['rechazada', 'completada', 'cancelada', 'no_show'] as EstadoCita[]) {
      expect(TRANSICIONES_CITA[terminal]).toEqual([])
    }
  })

  it('todo evento con destino respeta la máquina vía aplicarTransicion', () => {
    const eventos = Object.keys(ESTADO_POR_EVENTO) as EventoCita[]
    for (const de of ESTADOS) {
      for (const evento of eventos) {
        const destino = ESTADO_POR_EVENTO[evento]
        const r = aplicarTransicion(citaEn(de), evento, 'asesor', AHORA_FIJO)
        if (destino === null) {
          expect(r.ok).toBe(true) // auditoría: nunca cambia estado
          if (r.ok) expect(r.cita.estado).toBe(de)
        } else if (!puedeTransicionar(de, destino) || (de === 'confirmada' && destino === 'solicitada' && evento !== 'reprogramar')) {
          expect(r.ok).toBe(false)
        } else {
          expect(r.ok).toBe(true)
          if (r.ok) expect(r.cita.estado).toBe(destino)
        }
      }
    }
  })

  it('toda transición aplicada deja rastro en historial (timestamp + actor)', () => {
    const r = aplicarTransicion(citaEn('solicitada'), 'aprobar', 'asesor', AHORA_FIJO, 'ok')
    expect(r.ok).toBe(true)
    if (r.ok) {
      const ultimo = r.cita.historial.at(-1)
      expect(ultimo).toMatchObject({ de: 'solicitada', a: 'aprobada', evento: 'aprobar', actor: 'asesor', at: AHORA_FIJO })
    }
  })
})

describe('regla ortogonal de pago (dimensión paralela, no estado)', () => {
  it('pago pendiente BLOQUEA aprobar', () => {
    const r = aplicarTransicion(citaEn('solicitada', { pagoEstado: 'pendiente' }), 'aprobar', 'asesor', AHORA_FIJO)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.motivo).toMatch(/pago pendiente/)
  })

  it('pagada o sin pago requerido se aprueba normal', () => {
    expect(aplicarTransicion(citaEn('solicitada', { pagoEstado: 'pagado' }), 'aprobar', 'asesor', AHORA_FIJO).ok).toBe(true)
    expect(aplicarTransicion(citaEn('solicitada'), 'aprobar', 'asesor', AHORA_FIJO).ok).toBe(true)
  })

  it('pago pendiente NO bloquea rechazar', () => {
    expect(aplicarTransicion(citaEn('solicitada', { pagoEstado: 'pendiente' }), 'rechazar', 'asesor', AHORA_FIJO).ok).toBe(true)
  })
})

describe('reprogramación y reasignación como eventos', () => {
  it('confirmada→solicitada SOLO vía reprogramar (reasignar desde confirmada se rechaza)', () => {
    expect(aplicarTransicion(citaEn('confirmada'), 'reprogramar', 'cliente', AHORA_FIJO).ok).toBe(true)
    expect(aplicarTransicion(citaEn('confirmada'), 'reasignar', 'asesor', AHORA_FIJO).ok).toBe(false)
  })

  it('reasignar mantiene la cita viva en solicitada', () => {
    const r = aplicarTransicion(citaEn('solicitada'), 'reasignar', 'asesor', AHORA_FIJO, 'de ana a luis')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.cita.estado).toBe('solicitada')
  })
})

describe('fixtures y multi-tenant', () => {
  it('los demos cubren TODOS los estados alcanzables, construidos por transiciones', () => {
    const estados = new Set(mockCitas().map((c) => c.estado))
    for (const e of ESTADOS) expect(estados.has(e)).toBe(true)
  })

  it('toda cita lleva tenant y las de otro tenant no se mezclan al filtrar', () => {
    const citas = mockCitas()
    expect(citas.every((c) => c.tenantId === TENANT_DEFAULT)).toBe(true)
    const ajena = { ...citas[0], id: 'cita-otro-tenant', tenantId: 'cliente-x' }
    const todas = [...citas, ajena]
    const delTenant = todas.filter((c) => c.tenantId === TENANT_DEFAULT)
    expect(delTenant).toHaveLength(citas.length)
    expect(delTenant.some((c) => c.id === 'cita-otro-tenant')).toBe(false)
  })

  it('las 8 etiquetas UI proyectan los estados internos', () => {
    for (const e of ESTADOS) expect(ETIQUETA_ESTADO_CITA[e].length).toBeGreaterThan(0)
    expect(ETIQUETA_ESTADO_CITA.solicitada).toBe(ETIQUETA_ESTADO_CITA.aprobada) // ambas 'Agendada'
  })
})
