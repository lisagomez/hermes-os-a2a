// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { resumenHilo, resumenHilos } from './hilos'
import { ENTRANTES_DEMO, SALIENTES_DEMO } from './fixtures'

describe('resumenHilos — agrupación pura por hiloId', () => {
  it('un hilo por cada hiloId distinto entre entrantes y salientes', () => {
    const hiloIds = new Set([...ENTRANTES_DEMO.map((e) => e.hiloId), ...SALIENTES_DEMO.map((s) => s.hiloId)])
    const resumenes = resumenHilos(ENTRANTES_DEMO, SALIENTES_DEMO)
    expect(resumenes).toHaveLength(hiloIds.size)
  })

  it('ordena por último movimiento, más reciente primero', () => {
    const resumenes = resumenHilos(ENTRANTES_DEMO, SALIENTES_DEMO)
    for (let i = 1; i < resumenes.length; i++) {
      expect(resumenes[i - 1].ultimoMovimiento >= resumenes[i].ultimoMovimiento).toBe(true)
    }
  })

  it('el hilo con el saliente pendiente_aprobacion en verde cuenta 1 pendiente', () => {
    const hilo = resumenHilo('hilo-bienvenida', ENTRANTES_DEMO, SALIENTES_DEMO)
    expect(hilo?.pendientes).toBe(1)
    expect(hilo?.estado).toBe('input_required')
  })

  it('el hilo de inyección queda marcado intentoInyeccion=true y sin pendientes', () => {
    const hilo = resumenHilo('hilo-inyeccion', ENTRANTES_DEMO, SALIENTES_DEMO)
    expect(hilo?.intentoInyeccion).toBe(true)
    expect(hilo?.pendientes).toBe(0)
  })

  it('el hilo con saliente en borrador (gates aún no corridos) no aparece como pendiente', () => {
    const hilo = resumenHilo('hilo-recordatorio', ENTRANTES_DEMO, SALIENTES_DEMO)
    expect(hilo?.pendientes).toBe(0)
    expect(hilo?.estado).toBe('working')
  })

  it('un hiloId inexistente devuelve null', () => {
    expect(resumenHilo('hilo-no-existe', ENTRANTES_DEMO, SALIENTES_DEMO)).toBeNull()
  })
})
