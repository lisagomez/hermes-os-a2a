import { describe, expect, it } from 'vitest'
import { validarAnalisisIA } from './prompt-insights'
import type { Segmento } from '@/features/domain/types'

const SEGMENTOS: Segmento[] = [
  { inicioS: 0, finS: 8, hablante: 'Victor', texto: '¿Qué se les complica hoy?', confianza: 0.85 },
  { inicioS: 8, finS: 20, hablante: 'Elisa (GAL)', texto: 'Necesitamos llevar un registro de la información.', confianza: 0.82 },
]

const DIMENSIONES_OK = [
  { dimension: 'problema', estado: 'parcial', explicacion: 'Hay necesidad sin causa.', segmentoIdx: 1 },
  { dimension: 'impacto', estado: 'faltante', explicacion: 'Sin cifras.', segmentoIdx: null },
  { dimension: 'urgencia', estado: 'faltante', explicacion: 'Sin plazo.', segmentoIdx: null },
  { dimension: 'proceso_decision', estado: 'faltante', explicacion: 'No se tocó.', segmentoIdx: null },
  { dimension: 'stakeholders', estado: 'parcial', explicacion: 'Solo Elisa.', segmentoIdx: 1 },
  { dimension: 'presupuesto', estado: 'faltante', explicacion: 'No se tocó.', segmentoIdx: null },
  { dimension: 'competencia', estado: 'faltante', explicacion: 'No se exploró.', segmentoIdx: null },
  { dimension: 'proximos_pasos', estado: 'faltante', explicacion: 'Sin acuerdo.', segmentoIdx: null },
]

describe('validarAnalisisIA — la IA propone, el contrato verifica', () => {
  it('acepta análisis válido y construye evidencia desde los segmentos reales', () => {
    const r = validarAnalisisIA(
      {
        insights: [{ categoria: 'necesidad_explicita', texto: 'Necesitan un registro centralizado.', segmentoIdx: 1 }],
        dimensiones: DIMENSIONES_OK,
      },
      'r1',
      SEGMENTOS
    )
    expect(r).not.toBeNull()
    expect(r?.insights[0].evidencia[0].segmentoIdx).toBe(1)
    expect(r?.insights[0].evidencia[0].cita).toContain('registro')
    expect(r?.descartados).toBe(0)
  })

  it('descarta insights con evidencia fuera de rango (regla de oro)', () => {
    const r = validarAnalisisIA(
      {
        insights: [
          { categoria: 'pain', texto: 'Inventado sin respaldo.', segmentoIdx: 99 },
          { categoria: 'necesidad_explicita', texto: 'Necesitan registro.', segmentoIdx: 1 },
        ],
        dimensiones: DIMENSIONES_OK,
      },
      'r1',
      SEGMENTOS
    )
    expect(r?.insights.length).toBe(1)
    expect(r?.descartados).toBe(1)
  })

  it('degrada a faltante una dimensión no-faltante sin evidencia válida', () => {
    const dims = DIMENSIONES_OK.map((d) => (d.dimension === 'problema' ? { ...d, estado: 'cubierta', segmentoIdx: null } : d))
    const r = validarAnalisisIA({ insights: [], dimensiones: dims }, 'r1', SEGMENTOS)
    expect(r?.dimensiones.find((d) => d.dimension === 'problema')?.estado).toBe('faltante')
    expect(r?.descartados).toBeGreaterThanOrEqual(1)
  })

  it('rechaza el análisis completo si faltan dimensiones o la forma no cumple', () => {
    expect(validarAnalisisIA({ insights: [], dimensiones: DIMENSIONES_OK.slice(0, 3) }, 'r1', SEGMENTOS)).toBeNull()
    expect(validarAnalisisIA({ insights: [{ categoria: 'inventada', texto: 'x', segmentoIdx: 0 }], dimensiones: DIMENSIONES_OK }, 'r1', SEGMENTOS)).toBeNull()
    expect(validarAnalisisIA('no soy json estructurado', 'r1', SEGMENTOS)).toBeNull()
  })
})
