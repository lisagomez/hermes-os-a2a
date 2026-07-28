import { afterEach, describe, expect, it, vi } from 'vitest'
import { decidirAcceso, esRutaPublica } from './acceso'
import { isAllowed } from './allowlist'

const base = {
  pathname: '/reuniones',
  authDeshabilitada: false,
  authConfigurada: true,
  email: 'ana@equipo.com' as string | null,
  permitido: true,
}

describe('esRutaPublica', () => {
  it('deja pasar login y endpoints de auth', () => {
    expect(esRutaPublica('/login')).toBe(true)
    expect(esRutaPublica('/auth/callback')).toBe(true)
    expect(esRutaPublica('/auth/otp')).toBe(true)
    expect(esRutaPublica('/auth/signout')).toBe(true)
  })

  it('no deja pasar rutas de la app ni de la API', () => {
    expect(esRutaPublica('/')).toBe(false)
    expect(esRutaPublica('/reuniones')).toBe(false)
    expect(esRutaPublica('/api/asesor/pregunta')).toBe(false)
    // Prefijos parecidos no cuelan
    expect(esRutaPublica('/loginx')).toBe(false)
    expect(esRutaPublica('/authx')).toBe(false)
  })
})

describe('decidirAcceso', () => {
  it('usuario autenticado y permitido pasa', () => {
    expect(decidirAcceso(base)).toEqual({ tipo: 'pasar' })
  })

  it('ruta pública pasa aunque no haya usuario ni config', () => {
    expect(
      decidirAcceso({ ...base, pathname: '/login', authConfigurada: false, email: null })
    ).toEqual({ tipo: 'pasar' })
  })

  it('AUTH_DISABLED pasa sin usuario (escape de dev mock-first)', () => {
    expect(decidirAcceso({ ...base, authDeshabilitada: true, email: null })).toEqual({
      tipo: 'pasar',
    })
  })

  it('sin config es fail-closed: nadie entra', () => {
    expect(decidirAcceso({ ...base, authConfigurada: false, email: null })).toEqual({
      tipo: 'sin-config',
    })
    // Incluso "con usuario" (no debería existir sin config, pero el orden manda)
    expect(decidirAcceso({ ...base, authConfigurada: false })).toEqual({ tipo: 'sin-config' })
  })

  it('sin usuario redirige a login con next (salvo la raíz)', () => {
    expect(decidirAcceso({ ...base, email: null })).toEqual({
      tipo: 'login',
      next: '/reuniones',
    })
    expect(decidirAcceso({ ...base, pathname: '/', email: null })).toEqual({
      tipo: 'login',
      next: undefined,
    })
  })

  it('la API también exige sesión', () => {
    expect(decidirAcceso({ ...base, pathname: '/api/asesor/pregunta', email: null })).toEqual({
      tipo: 'login',
      next: '/api/asesor/pregunta',
    })
  })

  it('usuario fuera de la allowlist es denegado', () => {
    expect(decidirAcceso({ ...base, permitido: false })).toEqual({ tipo: 'denegado' })
  })
})

describe('isAllowed (fail-closed)', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('sin PANEL_ALLOWED_EMAILS nadie entra', () => {
    vi.stubEnv('PANEL_ALLOWED_EMAILS', '')
    expect(isAllowed('ana@equipo.com')).toBe(false)
  })

  it('compara case-insensitive y tolera espacios', () => {
    vi.stubEnv('PANEL_ALLOWED_EMAILS', ' Ana@Equipo.com , luis@equipo.com ')
    expect(isAllowed('ana@equipo.com')).toBe(true)
    expect(isAllowed('LUIS@EQUIPO.COM')).toBe(true)
    expect(isAllowed('otro@fuera.com')).toBe(false)
  })

  it('sin email no entra', () => {
    vi.stubEnv('PANEL_ALLOWED_EMAILS', 'ana@equipo.com')
    expect(isAllowed(null)).toBe(false)
    expect(isAllowed(undefined)).toBe(false)
  })
})
