// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { EstadoCita } from './types'
import { ESTADO_POR_EVENTO, TRANSICIONES_CITA } from './types'
import { AHORA_FIJO, mockCitas } from './mock'
import { FILTROS_TABLERO, accionesDisponibles, metricasCitas } from './metricas'

const ESTADOS: EstadoCita[] = ['solicitada', 'aprobada', 'rechazada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_show']

describe('accionesDisponibles — espejo exacto de la máquina', () => {
  it('cada acción ofrecida es una transición válida, y ninguna válida falta', () => {
    for (const estado of ESTADOS) {
      const ofrecidas = accionesDisponibles(estado).map((a) => a.evento)
      for (const evento of ofrecidas) {
        expect(TRANSICIONES_CITA[estado]).toContain(ESTADO_POR_EVENTO[evento]!)
      }
      if (estado === 'confirmada') expect(ofrecidas).toEqual(['iniciar', 'marcar_no_show', 'cancelar'])
      if (estado === 'en_curso') expect(ofrecidas).toEqual(['completar', 'cancelar'])
      if (estado === 'aprobada') expect(ofrecidas).toEqual(['cancelar'])
      if (['rechazada', 'completada', 'cancelada', 'no_show', 'solicitada'].includes(estado)) expect(ofrecidas).toEqual([])
    }
  })
})

describe('metricasCitas — derivadas del historial sobre los fixtures', () => {
  const citas = mockCitas()
  const m = metricasCitas(citas, AHORA_FIJO)

  it('cuenta pendientes, confirmadas y no-show del mes', () => {
    expect(m.pendientes).toBe(2) // solicitada + pago
    expect(m.confirmadas).toBe(1)
    expect(m.noShowMes).toBe(1) // 2026-07-22 cae en el mes de AHORA_FIJO
  })

  it('hoy excluye canceladas/rechazadas', () => {
    expect(m.hoy).toBe(1) // cita-demo-encurso (2026-07-27)
  })

  it('tiempo medio de aprobación sale del historial (mock: 0 min, no null)', () => {
    expect(m.tiempoMedioAprobacionMin).toBe(0)
    expect(metricasCitas([], AHORA_FIJO).tiempoMedioAprobacionMin).toBeNull() // sin datos no se inventa
  })
})

describe('FILTROS_TABLERO — cobertura total de estados', () => {
  it('la unión de los filtros específicos cubre los 8 estados sin traslape', () => {
    const cubiertos = FILTROS_TABLERO.flatMap((f) => f.estados ?? [])
    expect([...cubiertos].sort()).toEqual([...ESTADOS].sort())
  })
})
