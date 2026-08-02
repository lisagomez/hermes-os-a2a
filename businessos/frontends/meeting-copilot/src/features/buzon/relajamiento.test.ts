// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  debeRevertirRelajamiento,
  proponeRelajamiento,
  rachaSinEdicion,
  RACHA_MINIMA_RELAJAMIENTO,
  DIAS_MINIMOS_ACTIVO_RELAJAMIENTO,
  RECHAZOS_PARA_REVERSION,
  type DecisionAprobacion,
} from './relajamiento'

function limpia(n: number): DecisionAprobacion[] {
  return Array.from({ length: n }, () => ({ editado: false, verificacionCriticaDisparada: false }))
}

describe('proponeRelajamiento (§11.9) — regla determinista', () => {
  it('24 aprobaciones consecutivas, 30 días activo → NO propone', () => {
    expect(proponeRelajamiento(limpia(24), 30)).toBe(false)
  })

  it('25 aprobaciones consecutivas, 30 días activo → SÍ propone', () => {
    expect(proponeRelajamiento(limpia(25), 30)).toBe(true)
  })

  it('25 aprobaciones con una edición EN MEDIO → NO propone (la racha se corta)', () => {
    const decisiones = [
      ...limpia(12),
      { editado: true, verificacionCriticaDisparada: false },
      ...limpia(12), // solo 12 tras la edición: racha final = 12 < 25
    ]
    expect(decisiones.length).toBe(25)
    expect(proponeRelajamiento(decisiones, 30)).toBe(false)
  })

  it('29 días activo con racha de 25 → NO propone (faltan días)', () => {
    expect(proponeRelajamiento(limpia(25), 29)).toBe(false)
  })

  it('30 días activo con racha de 25 → SÍ propone (umbral exacto)', () => {
    expect(proponeRelajamiento(limpia(25), DIAS_MINIMOS_ACTIVO_RELAJAMIENTO)).toBe(true)
  })

  it('racha de 25 pero con una verificación CRÍTICA disparada dentro de la racha → NO propone', () => {
    const decisiones = [...limpia(24), { editado: false, verificacionCriticaDisparada: true }]
    expect(decisiones.length).toBe(25)
    expect(proponeRelajamiento(decisiones, 30)).toBe(false)
  })

  it('constante documentada: el mínimo es 25', () => {
    expect(RACHA_MINIMA_RELAJAMIENTO).toBe(25)
  })
})

describe('rachaSinEdicion', () => {
  it('sin decisiones → racha 0', () => {
    expect(rachaSinEdicion([])).toEqual({ racha: 0, verificacionCriticaEnRacha: false })
  })

  it('la racha se cuenta desde el final hacia atrás, se detiene en el primer editado', () => {
    const decisiones = [
      { editado: false, verificacionCriticaDisparada: false },
      { editado: true, verificacionCriticaDisparada: false },
      { editado: false, verificacionCriticaDisparada: false },
      { editado: false, verificacionCriticaDisparada: false },
    ]
    expect(rachaSinEdicion(decisiones)).toEqual({ racha: 2, verificacionCriticaEnRacha: false })
  })
})

describe('debeRevertirRelajamiento — reversión automática', () => {
  it('1 rechazo → no revierte', () => {
    expect(debeRevertirRelajamiento(1)).toBe(false)
  })
  it('2 rechazos → revierte', () => {
    expect(debeRevertirRelajamiento(RECHAZOS_PARA_REVERSION)).toBe(true)
  })
  it('más de 2 también revierte', () => {
    expect(debeRevertirRelajamiento(5)).toBe(true)
  })
})
