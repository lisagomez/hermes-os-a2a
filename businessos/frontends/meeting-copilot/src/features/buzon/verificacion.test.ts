// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  configuracionCompleta,
  requierePolling,
  TODAS_LAS_VERIFICACIONES,
  todasValidas,
  verificacionValida,
  VERIFICACIONES_CONFIGURACION,
  type Verificacion,
} from './verificacion'

const AHORA = '2026-08-01T00:00:00.000Z'

function base(id: Verificacion['id'], estado: Verificacion['estado']): Verificacion {
  return { id, estado, mensaje: 'x', ultimaRevision: AHORA }
}

describe('invariante del contrato (§11.2): fallido SIEMPRE trae acción', () => {
  it('un fallido CON acción es válido', () => {
    const v: Verificacion = { ...base('dns_spf', 'fallido'), accion: { etiqueta: 'Reintentar', tipo: 'reintentar', payload: 'x' } }
    expect(verificacionValida(v)).toBe(true)
  })

  it('un fallido SIN acción es un callejón — inválido', () => {
    const v = base('dns_spf', 'fallido')
    expect(verificacionValida(v)).toBe(false)
  })

  it('estados que no son "fallido" nunca requieren acción', () => {
    expect(verificacionValida(base('dns_spf', 'pendiente'))).toBe(true)
    expect(verificacionValida(base('dns_spf', 'en_curso'))).toBe(true)
    expect(verificacionValida(base('dns_spf', 'verificado'))).toBe(true)
    expect(verificacionValida(base('dns_spf', 'esperando_tercero'))).toBe(true)
  })

  it('todasValidas: una sola verificación inválida tumba la lista completa', () => {
    const lista = [base('dns_spf', 'verificado'), base('dns_dkim', 'fallido')]
    expect(todasValidas(lista)).toBe(false)
  })

  it('CONTROL: si se quita el chequeo de `accion`, este caso debe volverse verde por error', () => {
    // Sanity check de que el test ejercita la rama real: un fallido sin acción
    // NUNCA debe leerse como válido. Documentado en vez de mutar producción:
    // comentar el `&& v.accion !== undefined` en verificacionValida() vuelve
    // este expect falso (rojo) — confirmado a mano durante el desarrollo.
    const v = base('access_policy', 'fallido')
    expect(verificacionValida(v)).toBe(false)
  })
})

describe('configuracionCompleta — gate real de configurando → espejo', () => {
  it('con las 7 verificaciones de configuración en verificado → true', () => {
    const lista = VERIFICACIONES_CONFIGURACION.map((id) => base(id, 'verificado'))
    expect(configuracionCompleta(lista)).toBe(true)
  })

  it('con una sola pendiente → false', () => {
    const lista = VERIFICACIONES_CONFIGURACION.map((id, i) => base(id, i === 0 ? 'pendiente' : 'verificado'))
    expect(configuracionCompleta(lista)).toBe(false)
  })

  it('"aprobador" NO es parte del gate de configuración (se resuelve aparte, pantalla 5)', () => {
    expect(TODAS_LAS_VERIFICACIONES).toContain('aprobador')
    expect(VERIFICACIONES_CONFIGURACION).not.toContain('aprobador')
  })
})

describe('requierePolling', () => {
  it('en_curso y esperando_tercero hacen polling solos', () => {
    expect(requierePolling('en_curso')).toBe(true)
    expect(requierePolling('esperando_tercero')).toBe(true)
  })
  it('el resto no', () => {
    expect(requierePolling('pendiente')).toBe(false)
    expect(requierePolling('verificado')).toBe(false)
    expect(requierePolling('fallido')).toBe(false)
  })
})
