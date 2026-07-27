import { describe, expect, it } from 'vitest'
import { DISCLAIMER_GRAFO, mockEvaluacionGrafo, validarRespuestaGrafo } from './grafo'
import { htmlATexto } from './html'

describe('mockEvaluacionGrafo — fiel al contrato del grafo real', () => {
  it('concepto con regla: veredicto + fuente con clave/cita/url + checklist', () => {
    const e = mockEvaluacionGrafo(['Servicios de agencia de carga y transporte internacional'], 'regulatorio')
    expect(e.estado).toBe('permitido')
    expect(e.conceptos[0].fuente?.clave).toBe('MX-LCPAF-PERMISO-SICT')
    expect(e.conceptos[0].checklist.length).toBeGreaterThan(0)
    expect(e.disclaimer).toBe(DISCLAIMER_GRAFO)
    expect(e.conexion).toBe('mock')
  })

  it('fail-safe: concepto sin regla → dudoso, sin fuente, razón exacta', () => {
    const e = mockEvaluacionGrafo(['Ajuste interno misterioso XYZ'], 'regulatorio')
    expect(e.conceptos[0].estado).toBe('dudoso')
    expect(e.conceptos[0].razon).toBe('sin regla aplicable')
    expect(e.conceptos[0].fuente).toBeNull()
  })

  it('veredictos mixtos → estado agregado dudoso (regla del grafo)', () => {
    const e = mockEvaluacionGrafo(['agencia de carga federal', 'Ajuste misterioso'], 'regulatorio')
    expect(e.estado).toBe('dudoso')
  })
})

describe('validarRespuestaGrafo — regla de oro del puente (patrón grafo-a2a)', () => {
  const base = mockEvaluacionGrafo(['agencia de carga'], 'regulatorio')

  it('acepta una respuesta con disclaimer y fuentes coherentes', () => {
    expect(validarRespuestaGrafo(base)).toBe(true)
  })

  it('rechaza sin disclaimer', () => {
    expect(validarRespuestaGrafo({ ...base, disclaimer: '' })).toBe(false)
  })

  it('rechaza fuente null fuera del fail-safe', () => {
    const rota = { ...base, conceptos: [{ ...base.conceptos[0], fuente: null, razon: 'porque sí' }] }
    expect(validarRespuestaGrafo(rota)).toBe(false)
  })
})

describe('htmlATexto', () => {
  it('extrae título, meta description y texto sin tags ni scripts', () => {
    const r = htmlATexto(
      '<html><head><title>GAL México</title><meta name="description" content="Freight forwarder"></head>' +
        '<body><script>alert(1)</script><h1>Servicios</h1><p>Flete marítimo &amp; aéreo</p></body></html>'
    )
    expect(r.titulo).toBe('GAL México')
    expect(r.descripcionMeta).toBe('Freight forwarder')
    expect(r.texto).toContain('Flete marítimo & aéreo')
    expect(r.texto).not.toContain('alert')
  })
})
