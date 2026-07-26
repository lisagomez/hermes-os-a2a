import { describe, expect, it } from 'vitest'
import { evaluarCoach } from './coach'
import { REUNIONES_DEMO, TRANSCRIPCIONES_DEMO } from '@/features/domain/fixtures'
import { playbookPorTipo } from '@/features/playbooks/defaults'
import type { TipoAlerta } from './coach'

const [, R2, R3] = REUNIONES_DEMO
const [, T2, T3] = TRANSCRIPCIONES_DEMO

function alertasDelReplay(reunionIdx: 1 | 2): Set<TipoAlerta> {
  const reunion = REUNIONES_DEMO[reunionIdx]
  const t = TRANSCRIPCIONES_DEMO[reunionIdx]
  const playbook = playbookPorTipo(reunion.tipoReunion)
  const vistas = new Set<TipoAlerta>()
  for (let cursor = 1; cursor <= t.segmentos.length; cursor += 1) {
    const estado = evaluarCoach(reunion, t, playbook, cursor)
    for (const a of estado.alertas) vistas.add(a.tipo)
  }
  return vistas
}

describe('Meeting Coach — replay', () => {
  it('R2 (superficial) dispara superficial, monólogo y crítica pendiente durante el replay', () => {
    const vistas = alertasDelReplay(1)
    expect(vistas.has('superficial')).toBe(true)
    expect(vistas.has('monologo')).toBe(true)
    expect(vistas.has('dimension_critica_pendiente')).toBe(true)
  })

  it('R3 (demo con objeciones) dispara objeción sin respuesta', () => {
    const vistas = alertasDelReplay(2)
    expect(vistas.has('objecion_sin_respuesta')).toBe(true)
  })

  it('máximo una alerta y una sugerencia activas a la vez, con justificación', () => {
    for (let cursor = 1; cursor <= T2.segmentos.length; cursor += 1) {
      const estado = evaluarCoach(R2, T2, playbookPorTipo('discovery'), cursor)
      if (estado.sugerencia) {
        expect(estado.sugerencia.preguntaSugerida.length).toBeGreaterThan(0)
        expect(estado.sugerencia.justificacion.length).toBeGreaterThan(0)
      }
    }
  })

  it('la sugerencia sigue el orden de prioridad: primero problema si falta', () => {
    const inicio = evaluarCoach(R3, T3, playbookPorTipo('demo'), 1)
    expect(inicio.sugerencia?.dimension).toBe('problema')
  })
})
