// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { CorreoSaliente, EstadoCorreo, EventoCorreo, ResultadoGate } from './types'
import {
  ESTADO_POR_EVENTO,
  GATES_BUZON,
  TRANSICIONES_CORREO,
  aplicarTransicion,
  estadoHilo,
  gateCriticoEnRojo,
  politicaValida,
  puedeTransicionar,
} from './types'
import { AHORA_FIJO, mockSalientes } from './mock'

const ESTADOS: EstadoCorreo[] = [
  'borrador',
  'rechazado_gates',
  'pendiente_aprobacion',
  'aprobado',
  'enviado',
  'rechazado_humano',
  'reportado_inyeccion',
]

function gatesVerdes(): ResultadoGate[] {
  return GATES_BUZON.map((g) => ({ gate: g.gate, paso: true, severidad: g.severidad, evidencia: 'ok' }))
}

function correoEn(estado: EstadoCorreo, extra?: Partial<CorreoSaliente>): CorreoSaliente {
  return {
    id: 'correo-test',
    buzonId: 'buzon-asesoria',
    hiloId: 'hilo-test',
    enRespuestaA: null,
    destinatarios: { to: ['cliente@ejemplo.mx'], cc: [] },
    asunto: 'Asunto de prueba',
    cuerpo: 'Cuerpo de prueba',
    clase: 'agendamiento',
    automatico: true,
    estado,
    gates: gatesVerdes(),
    sha256: 'sha256:test',
    politica: { modo: 'cerrado', clase: 'agendamiento', cuotaHora: 10, cuotaHilo: 5 },
    historial: [],
    creadoAt: AHORA_FIJO,
    ...extra,
  }
}

describe('máquina de estados del saliente — matriz EXHAUSTIVA', () => {
  it('toda transición no listada se rechaza (7×7 estados)', () => {
    for (const de of ESTADOS) {
      for (const a of ESTADOS) {
        expect(puedeTransicionar(de, a)).toBe(TRANSICIONES_CORREO[de].includes(a))
      }
    }
  })

  it('los terminales no tienen salida', () => {
    for (const terminal of ['rechazado_gates', 'enviado', 'rechazado_humano', 'reportado_inyeccion'] as EstadoCorreo[]) {
      expect(TRANSICIONES_CORREO[terminal]).toEqual([])
    }
  })

  it('transiciones VÁLIDAS con el actor correcto pasan', () => {
    expect(aplicarTransicion(correoEn('borrador'), 'gates_aprueban', 'buzon_a2a', AHORA_FIJO).ok).toBe(true)
    expect(
      aplicarTransicion(correoEn('borrador', { gates: gatesVerdes().map((g, i) => (i === 0 ? { ...g, paso: false } : g)) }), 'gates_rechazan', 'buzon_a2a', AHORA_FIJO).ok
    ).toBe(true)
    expect(aplicarTransicion(correoEn('pendiente_aprobacion'), 'aprobar', 'aprobador', AHORA_FIJO).ok).toBe(true)
    expect(aplicarTransicion(correoEn('pendiente_aprobacion'), 'rechazar', 'aprobador', AHORA_FIJO).ok).toBe(true)
    expect(aplicarTransicion(correoEn('pendiente_aprobacion'), 'reportar_inyeccion', 'aprobador', AHORA_FIJO).ok).toBe(true)
    expect(aplicarTransicion(correoEn('aprobado'), 'enviar', 'enviar_salientes', AHORA_FIJO).ok).toBe(true)
  })

  it('transiciones INVÁLIDAS por la matriz se rechazan', () => {
    const r1 = aplicarTransicion(correoEn('rechazado_gates'), 'gates_aprueban', 'buzon_a2a', AHORA_FIJO)
    expect(r1.ok).toBe(false)
    const r2 = aplicarTransicion(correoEn('enviado'), 'enviar', 'enviar_salientes', AHORA_FIJO)
    expect(r2.ok).toBe(false)
    const r3 = aplicarTransicion(correoEn('borrador'), 'aprobar', 'aprobador', AHORA_FIJO)
    expect(r3.ok).toBe(false)
  })

  it('evento de auditoría (fallo_envio) NUNCA cambia el estado, solo deja rastro', () => {
    const correo = correoEn('aprobado')
    const r = aplicarTransicion(correo, 'fallo_envio', 'enviar_salientes', AHORA_FIJO, 'SMTP timeout')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.correo.estado).toBe('aprobado')
      const ultimo = r.correo.historial.at(-1)
      expect(ultimo).toMatchObject({ de: 'aprobado', a: 'aprobado', evento: 'fallo_envio', actor: 'enviar_salientes', detalle: 'SMTP timeout' })
    }
  })

  it('todo evento con destino respeta la máquina vía aplicarTransicion', () => {
    const eventos = Object.keys(ESTADO_POR_EVENTO) as EventoCorreo[]
    const actorValido: Record<EventoCorreo, 'buzon_a2a' | 'aprobador' | 'enviar_salientes'> = {
      redactar: 'buzon_a2a',
      gates_aprueban: 'buzon_a2a',
      gates_rechazan: 'buzon_a2a',
      aprobar: 'aprobador',
      rechazar: 'aprobador',
      reportar_inyeccion: 'aprobador',
      enviar: 'enviar_salientes',
      fallo_envio: 'enviar_salientes',
    }
    for (const de of ESTADOS) {
      for (const evento of eventos) {
        const destino = ESTADO_POR_EVENTO[evento]
        // Gates rojas/verdes ajustadas para que gates_aprueban/gates_rechazan sean legítimos.
        const gates = evento === 'gates_rechazan' ? gatesVerdes().map((g, i) => (i === 0 ? { ...g, paso: false } : g)) : gatesVerdes()
        const r = aplicarTransicion(correoEn(de, { gates }), evento, actorValido[evento], AHORA_FIJO)
        if (destino === null) {
          expect(r.ok).toBe(true)
          if (r.ok) expect(r.correo.estado).toBe(de)
        } else if (!puedeTransicionar(de, destino)) {
          expect(r.ok).toBe(false)
        } else {
          expect(r.ok).toBe(true)
          if (r.ok) expect(r.correo.estado).toBe(destino)
        }
      }
    }
  })
})

describe('regla dura: un gate CRÍTICO en rojo jamás llega a pendiente_aprobacion', () => {
  it('gates_aprueban se rechaza si hay un CRÍTICO en rojo', () => {
    const gates = gatesVerdes().map((g) => (g.gate === 'canario_ausente' ? { ...g, paso: false } : g))
    const r = aplicarTransicion(correoEn('borrador', { gates }), 'gates_aprueban', 'buzon_a2a', AHORA_FIJO)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.motivo).toMatch(/CRÍTICO en rojo/)
  })

  it('gates_aprueban pasa si solo hay ALTA/MEDIA en rojo (nunca CRÍTICA)', () => {
    const gates = gatesVerdes().map((g) => (g.gate === 'urls_de_dominio' ? { ...g, paso: false } : g))
    expect(aplicarTransicion(correoEn('borrador', { gates }), 'gates_aprueban', 'buzon_a2a', AHORA_FIJO).ok).toBe(true)
  })

  it('gates_rechazan exige al menos un CRÍTICO en rojo (si no, no es rechazado_gates)', () => {
    const r = aplicarTransicion(correoEn('borrador', { gates: gatesVerdes() }), 'gates_rechazan', 'buzon_a2a', AHORA_FIJO)
    expect(r.ok).toBe(false)
  })

  it('gateCriticoEnRojo detecta severidad CRITICA en paso=false, ignora ALTA/MEDIA', () => {
    expect(gateCriticoEnRojo(gatesVerdes())).toBe(false)
    expect(gateCriticoEnRojo(gatesVerdes().map((g) => (g.severidad === 'ALTA' ? { ...g, paso: false } : g)))).toBe(false)
    expect(gateCriticoEnRojo(gatesVerdes().map((g) => (g.severidad === 'CRITICA' ? { ...g, paso: false } : g)))).toBe(true)
  })
})

describe('firma exclusiva de A5 (el agente jamás decide su propia aprobación)', () => {
  it('aprobar/rechazar/reportar_inyeccion fallan si el actor no es "aprobador"', () => {
    expect(aplicarTransicion(correoEn('pendiente_aprobacion'), 'aprobar', 'buzon_a2a', AHORA_FIJO).ok).toBe(false)
    expect(aplicarTransicion(correoEn('pendiente_aprobacion'), 'rechazar', 'enviar_salientes', AHORA_FIJO).ok).toBe(false)
    expect(aplicarTransicion(correoEn('pendiente_aprobacion'), 'reportar_inyeccion', 'buzon_a2a', AHORA_FIJO).ok).toBe(false)
  })

  it('enviar falla si el actor no es "enviar_salientes" (ni la UI ni el agente envían)', () => {
    expect(aplicarTransicion(correoEn('aprobado'), 'enviar', 'aprobador', AHORA_FIJO).ok).toBe(false)
    expect(aplicarTransicion(correoEn('aprobado'), 'enviar', 'buzon_a2a', AHORA_FIJO).ok).toBe(false)
  })
})

describe('toda transición aplicada deja rastro en historial', () => {
  it('timestamp + actor + de/a quedan en el último elemento', () => {
    const r = aplicarTransicion(correoEn('pendiente_aprobacion'), 'aprobar', 'aprobador', AHORA_FIJO, 'ok')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.correo.historial.at(-1)).toMatchObject({ de: 'pendiente_aprobacion', a: 'aprobado', evento: 'aprobar', actor: 'aprobador', at: AHORA_FIJO })
    }
  })
})

describe('política de contrapartes: modo abierto exige firma completa', () => {
  it('cerrado y abierto_cuarentena no requieren firma', () => {
    expect(politicaValida({ modoContraparte: 'cerrado' })).toBe(true)
    expect(politicaValida({ modoContraparte: 'abierto_cuarentena' })).toBe(true)
  })

  it('abierto SIN firma completa es inválido', () => {
    expect(politicaValida({ modoContraparte: 'abierto' })).toBe(false)
    expect(politicaValida({ modoContraparte: 'abierto', riesgoFirmadoPor: 'CEO' })).toBe(false)
  })

  it('abierto CON firma completa es válido', () => {
    expect(politicaValida({ modoContraparte: 'abierto', riesgoFirmadoPor: 'CEO', riesgoFirmadoEn: AHORA_FIJO })).toBe(true)
  })
})

describe('estado del hilo — SIEMPRE derivado del último saliente', () => {
  it('sin salientes → submitted (solo entrante recibido)', () => {
    expect(estadoHilo([])).toBe('submitted')
  })

  it('pendiente_aprobacion → input_required', () => {
    expect(estadoHilo([correoEn('pendiente_aprobacion')])).toBe('input_required')
  })

  it('enviado → completed', () => {
    expect(estadoHilo([correoEn('enviado')])).toBe('completed')
  })

  it('toma el ÚLTIMO saliente por creadoAt, no el primero de la lista', () => {
    const viejo = correoEn('enviado', { id: 'c1', creadoAt: '2026-01-01T00:00:00.000Z' })
    const nuevo = correoEn('pendiente_aprobacion', { id: 'c2', creadoAt: '2026-06-01T00:00:00.000Z' })
    expect(estadoHilo([nuevo, viejo])).toBe('input_required')
    expect(estadoHilo([viejo, nuevo])).toBe('input_required')
  })
})

describe('fixtures del buzón: cubren TODOS los estados alcanzables, construidos por transiciones', () => {
  it('mockSalientes() toca los 7 estados', () => {
    const estados = new Set(mockSalientes().map((c) => c.estado))
    for (const e of ESTADOS) expect(estados.has(e)).toBe(true)
  })

  it('todo saliente evaluado trae exactamente los 11 gates canónicos', () => {
    for (const correo of mockSalientes()) {
      if (correo.estado === 'borrador') continue // aún no corren los gates
      expect(correo.gates.map((g) => g.gate)).toEqual(GATES_BUZON.map((g) => g.gate))
    }
  })

  it('ningún saliente en pendiente_aprobacion (ni más adelante en el ciclo) tiene un CRÍTICO en rojo', () => {
    for (const correo of mockSalientes()) {
      if (['pendiente_aprobacion', 'aprobado', 'enviado', 'rechazado_humano', 'reportado_inyeccion'].includes(correo.estado)) {
        expect(gateCriticoEnRojo(correo.gates)).toBe(false)
      }
    }
  })

  it('el saliente rechazado_gates SÍ tiene un CRÍTICO en rojo', () => {
    const rechazado = mockSalientes().find((c) => c.estado === 'rechazado_gates')
    expect(rechazado).toBeDefined()
    if (rechazado) expect(gateCriticoEnRojo(rechazado.gates)).toBe(true)
  })
})
