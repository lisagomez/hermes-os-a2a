// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { completarBloques } from './store'
import { ORDEN_BLOQUES } from './types'
import { INTAKE_GAL } from './fixtures'
import type { CasoPreDiscovery } from './types'

// Un caso tal como quedó en localStorage ANTES de que existiera el bloque
// 'enriquecimiento': su mapa de bloques no lo tiene. La vista accede a
// `caso.bloques.<id>.datos` sin red de seguridad, así que abrirlo reventaba.
const VIEJO = {
  id: 'caso-viejo',
  leadId: 'lead-viejo',
  intake: INTAKE_GAL,
  estado: 'parcial',
  bloques: {
    perfil: { estado: 'listo', datos: { x: 1 }, confianza: 'alta', procedencia: null, requiereValidacion: [], error: null, generadoAt: null },
  },
  activoId: null,
  creadoAt: '',
  actualizadoAt: '',
} as unknown as CasoPreDiscovery

describe('completarBloques — sumar un bloque no rompe lo ya guardado', () => {
  it('rellena TODOS los bloques que falten', () => {
    const caso = completarBloques(VIEJO)
    for (const id of ORDEN_BLOQUES) expect(caso.bloques[id], `falta el bloque ${id}`).toBeTruthy()
    expect(caso.bloques.enriquecimiento.estado).toBe('pendiente')
  })

  it('no pisa el trabajo que el caso ya tenía', () => {
    const caso = completarBloques(VIEJO)
    expect(caso.bloques.perfil.estado).toBe('listo')
    expect(caso.bloques.perfil.datos).toEqual({ x: 1 })
  })

  it('tolera un caso sin mapa de bloques', () => {
    const caso = completarBloques({ ...VIEJO, bloques: undefined } as unknown as CasoPreDiscovery)
    expect(Object.keys(caso.bloques).sort()).toEqual([...ORDEN_BLOQUES].sort())
  })
})
