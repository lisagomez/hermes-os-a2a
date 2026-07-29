import { describe, expect, it } from 'vitest'
import { esRutaSinShell } from './rutas-sin-shell'

describe('esRutaSinShell', () => {
  it('login y la superficie pública de reserva van sin shell', () => {
    expect(esRutaSinShell('/login')).toBe(true)
    expect(esRutaSinShell('/reservar')).toBe(true)
    expect(esRutaSinShell('/reservar/ana-torres')).toBe(true)
    expect(esRutaSinShell('/reservar/cita/abc')).toBe(true)
  })

  it('las vistas internas conservan la shell (frontera de prefijo estricta)', () => {
    expect(esRutaSinShell('/')).toBe(false)
    expect(esRutaSinShell('/asesores')).toBe(false)
    expect(esRutaSinShell('/citas')).toBe(false)
    expect(esRutaSinShell('/reservado')).toBe(false)
    expect(esRutaSinShell('/loginx')).toBe(false)
  })
})
