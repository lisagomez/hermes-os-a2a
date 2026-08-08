// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { actorInfo, ICONO_ACTOR } from './actores'

describe('contrato de actores del canal auditado', () => {
  it('distingue humano y agente por prefijo', () => {
    expect(actorInfo('humano:elisa@ejemplo.mx')).toEqual({ tipo: 'humano', nombre: 'elisa@ejemplo.mx' })
    expect(actorInfo('agente:calificador-crm')).toEqual({ tipo: 'agente', nombre: 'calificador-crm' })
  })

  it('un actor sin prefijo conocido NO se disfraza de humano ni de agente', () => {
    expect(actorInfo('script-viejo').tipo).toBe('desconocido')
  })

  it('cada tipo tiene icono (contrato de la UI 👤/🤖)', () => {
    expect(ICONO_ACTOR.humano).toBe('👤')
    expect(ICONO_ACTOR.agente).toBe('🤖')
    expect(ICONO_ACTOR.desconocido).toBeTruthy()
  })
})
