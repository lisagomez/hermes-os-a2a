// El defecto que caza esta suite (caso real caso-msob7ag2-2, 2026-08-11): el
// contrato del benchmark acepta listas vacías (para que el modelo no invente),
// pero el pipeline marcaba el bloque 'listo' y la UI pintaba una tabla fantasma
// con solo encabezados en vez del aviso honesto de no-concluyente.
import { describe, expect, it } from 'vitest'
import { competenciaNoConcluyente, estadoBloqueAnalizado } from './competencia'
import type { DatosCompetencia } from './types'

const VACIA: DatosCompetencia = { competidores: [], comparativa: [] }
const CON_FILAS: DatosCompetencia = {
  competidores: [
    {
      nombre: 'OLIVARES',
      url: 'https://www.olivares.mx',
      posicionamiento: 'one-stop shop de media & entertainment law',
      servicios: ['copyright', 'derechos conexos'],
      diferenciadores: ['práctica de entretenimiento consolidada'],
      madurez: 'alta',
      confianza: 'alta',
    },
  ],
  comparativa: [],
}

describe('competenciaNoConcluyente', () => {
  it('datos null (mock honesto) → no concluyente', () => {
    expect(competenciaNoConcluyente(null)).toBe(true)
  })
  it('ambas listas vacías → no concluyente (la tabla fantasma del caso real)', () => {
    expect(competenciaNoConcluyente(VACIA)).toBe(true)
  })
  it('con al menos un competidor → concluyente', () => {
    expect(competenciaNoConcluyente(CON_FILAS)).toBe(false)
  })
  it('solo comparativa (sin nombres propios) → concluyente: hay lectura que mostrar', () => {
    expect(
      competenciaNoConcluyente({ competidores: [], comparativa: [{ dimension: 'posicionamiento', lead: 'x', lectura: 'y' }] })
    ).toBe(false)
  })
})

describe('estadoBloqueAnalizado', () => {
  it('competencia vacía → no_concluyente (dispara el aviso honesto de la UI)', () => {
    expect(estadoBloqueAnalizado('competencia', VACIA)).toBe('no_concluyente')
  })
  it('competencia con filas → listo', () => {
    expect(estadoBloqueAnalizado('competencia', CON_FILAS)).toBe('listo')
  })
  it('los demás bloques no degradan por esta regla (sus contratos ya exigen mínimos)', () => {
    expect(estadoBloqueAnalizado('sitio', null)).toBe('listo')
    expect(estadoBloqueAnalizado('perfil', {})).toBe('listo')
  })
})
