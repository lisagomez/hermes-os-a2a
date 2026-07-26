import { describe, expect, it } from 'vitest'
import { analizarReunion, calcularScore, extraerAcciones, extraerInsights } from './engine'
import { REUNIONES_DEMO, TRANSCRIPCIONES_DEMO } from '@/features/domain/fixtures'
import { PLAYBOOKS_DEFAULT, playbookPorTipo } from '@/features/playbooks/defaults'
import type { DimensionId, EstadoDimension } from '@/features/domain/types'

const [R1, R2, R3] = REUNIONES_DEMO
const [T1, T2, T3] = TRANSCRIPCIONES_DEMO

function estados(reunionIdx: 0 | 1 | 2): Record<DimensionId, EstadoDimension> {
  const reunion = REUNIONES_DEMO[reunionIdx]
  const t = TRANSCRIPCIONES_DEMO[reunionIdx]
  const score = calcularScore(reunion, t, playbookPorTipo(reunion.tipoReunion))
  return Object.fromEntries(score.dimensiones.map((d) => [d.dimension, d.estado])) as Record<DimensionId, EstadoDimension>
}

describe('playbooks', () => {
  it('los pesos de cada playbook suman 100', () => {
    for (const p of PLAYBOOKS_DEFAULT) {
      expect(p.dimensiones.reduce((a, d) => a + d.peso, 0)).toBe(100)
    }
  })
})

describe('R1 — discovery bueno (TransLogika)', () => {
  it('estados de dimensiones esperados', () => {
    expect(estados(0)).toEqual({
      problema: 'cubierta',
      impacto: 'cubierta',
      urgencia: 'cubierta',
      proceso_decision: 'parcial',
      stakeholders: 'cubierta',
      presupuesto: 'parcial',
      competencia: 'cubierta',
      proximos_pasos: 'cubierta',
    })
  })

  it('score alto (80-90) y todo con explicación', () => {
    const score = calcularScore(R1, T1, playbookPorTipo('discovery'))
    expect(score.total).toBeGreaterThanOrEqual(80)
    expect(score.total).toBeLessThanOrEqual(90)
    for (const d of score.dimensiones) {
      expect(d.explicacion.length).toBeGreaterThan(0)
      if (d.estado !== 'faltante') expect(d.evidencia.length).toBeGreaterThan(0)
    }
  })

  it('todo insight cita evidencia (regla de oro)', () => {
    for (const i of extraerInsights(R1, T1)) {
      expect(i.evidencia.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('detecta la pregunta sin responder sobre el proceso de decisión', () => {
    const preguntas = extraerInsights(R1, T1).filter((i) => i.categoria === 'pregunta_sin_responder')
    expect(preguntas.length).toBeGreaterThanOrEqual(1)
    expect(preguntas[0].evidencia.length).toBe(2)
  })

  it('extrae acciones con responsable y fuente [mm:ss]; la propuesta lleva fecha', () => {
    const acciones = extraerAcciones(R1, T1)
    expect(acciones.length).toBeGreaterThanOrEqual(2)
    const propuesta = acciones.find((a) => a.tarea.includes('propuesta'))
    expect(propuesta?.responsable).toBe('Valeria')
    expect(propuesta?.fechaTexto).toContain('jueves')
    for (const a of acciones) expect(a.fuente).toMatch(/\[\d+:\d{2}\]/)
  })

  it('los huecos son solo las dimensiones no cubiertas, con pregunta y justificación', () => {
    const score = calcularScore(R1, T1, playbookPorTipo('discovery'))
    expect(score.huecos.map((h) => h.dimension).sort()).toEqual(['presupuesto', 'proceso_decision'])
    for (const h of score.huecos) {
      expect(h.preguntaSugerida.length).toBeGreaterThan(0)
      expect(h.justificacion).toContain(':')
    }
  })
})

describe('R2 — discovery superficial (Kapital RH)', () => {
  it('estados de dimensiones esperados', () => {
    expect(estados(1)).toEqual({
      problema: 'parcial',
      impacto: 'faltante',
      urgencia: 'parcial',
      proceso_decision: 'faltante',
      stakeholders: 'parcial',
      presupuesto: 'faltante',
      competencia: 'cubierta',
      proximos_pasos: 'parcial',
    })
  })

  it('score bajo (30-45)', () => {
    const score = calcularScore(R2, T2, playbookPorTipo('discovery'))
    expect(score.total).toBeGreaterThanOrEqual(30)
    expect(score.total).toBeLessThanOrEqual(45)
  })

  it('la conducta registra el segmento inaudible y el desequilibrio de habla', () => {
    const score = calcularScore(R2, T2, playbookPorTipo('discovery'))
    expect(score.conducta.segmentosInaudibles).toBe(1)
    expect(score.conducta.ratioHablaInterno).toBeGreaterThan(0.45)
  })

  it('riesgo de discovery incompleto presente', () => {
    const { riesgos } = analizarReunion(R2, T2, playbookPorTipo('discovery'))
    expect(riesgos.some((r) => r.tipo === 'discovery_incompleto' && r.severidad === 'alta')).toBe(true)
  })
})

describe('R3 — demo con objeciones (Andamex)', () => {
  it('estados de dimensiones esperados', () => {
    expect(estados(2)).toEqual({
      problema: 'cubierta',
      impacto: 'parcial',
      urgencia: 'faltante',
      proceso_decision: 'parcial',
      stakeholders: 'parcial',
      presupuesto: 'parcial',
      competencia: 'cubierta',
      proximos_pasos: 'parcial',
    })
  })

  it('score medio (55-70)', () => {
    const score = calcularScore(R3, T3, playbookPorTipo('demo'))
    expect(score.total).toBeGreaterThanOrEqual(55)
    expect(score.total).toBeLessThanOrEqual(70)
  })

  it('detecta las dos objeciones y el competidor activo', () => {
    const { insights, riesgos } = analizarReunion(R3, T3, playbookPorTipo('demo'))
    expect(insights.filter((i) => i.categoria === 'objecion').length).toBe(2)
    expect(insights.some((i) => i.categoria === 'competidor' && i.texto.includes('Odoo'))).toBe(true)
    expect(riesgos.some((r) => r.tipo === 'objecion_sin_respuesta' && r.severidad === 'alta')).toBe(true)
    expect(riesgos.some((r) => r.tipo === 'sin_urgencia')).toBe(true)
  })

  it('las señales de compra citan al cliente', () => {
    const senales = extraerInsights(R3, T3).filter((i) => i.categoria === 'senal_compra')
    expect(senales.length).toBeGreaterThanOrEqual(2)
  })
})

describe('determinismo', () => {
  it('mismo input produce el mismo score', () => {
    const a = calcularScore(R1, T1, playbookPorTipo('discovery'))
    const b = calcularScore(R1, T1, playbookPorTipo('discovery'))
    expect(a).toEqual(b)
  })
})
