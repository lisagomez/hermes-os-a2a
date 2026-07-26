import { describe, expect, it } from 'vitest'
import { construirUsuarioPregunta, parsearRespuestaPregunta } from './prompt-pregunta'

describe('construirUsuarioPregunta', () => {
  it('incluye dimensión, banco, contexto y preguntas previas', () => {
    const prompt = construirUsuarioPregunta({
      dimension: 'impacto',
      motivo: 'El impacto se mencionó sin cifras.',
      preguntaBanco: '¿Cuánto les cuesta este problema al mes?',
      tipoReunion: 'discovery',
      leadNombre: 'Alex (GAL)',
      contexto: [{ hablante: 'Alex (GAL)', texto: 'necesitamos llevar un registro de la información' }],
      preguntasPrevias: ['¿Qué es lo que más se les complica hoy?'],
    })
    expect(prompt).toContain('impacto')
    expect(prompt).toContain('¿Cuánto les cuesta este problema al mes?')
    expect(prompt).toContain('Alex (GAL): necesitamos llevar un registro')
    expect(prompt).toContain('NO repetir')
  })

  it('sin conversación declara que es pregunta de apertura (no inventa contexto)', () => {
    const prompt = construirUsuarioPregunta({
      dimension: 'problema',
      motivo: 'Aún no se toca.',
      preguntaBanco: '¿Qué se les complica hoy?',
      tipoReunion: 'discovery',
      leadNombre: null,
      contexto: [],
      preguntasPrevias: [],
    })
    expect(prompt).toContain('aún no hay conversación')
  })
})

describe('parsearRespuestaPregunta (defensivo)', () => {
  it('acepta JSON directo', () => {
    const r = parsearRespuestaPregunta('{"pregunta": "¿Cuánto les cuesta?", "justificacion": "Mencionaron retrabajos."}')
    expect(r?.pregunta).toBe('¿Cuánto les cuesta?')
    expect(r?.justificacion).toBe('Mencionaron retrabajos.')
  })

  it('acepta JSON embebido en texto/markdown', () => {
    const r = parsearRespuestaPregunta('Claro, aquí va:\n```json\n{"pregunta": "¿Quién autoriza?", "justificacion": "x"}\n```')
    expect(r?.pregunta).toBe('¿Quién autoriza?')
  })

  it('respuesta sin JSON válido → null (el caller cae al banco, no adivina)', () => {
    expect(parsearRespuestaPregunta('no puedo ayudarte con eso')).toBeNull()
    expect(parsearRespuestaPregunta('{"otra_cosa": 1}')).toBeNull()
  })
})
