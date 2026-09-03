import { describe, expect, it } from 'vitest'
import { DISCLAIMER_GRAFO, mockEvaluacionGrafo, validarRespuestaGrafo } from './grafo'
import { htmlATexto } from './html'

describe('mockEvaluacionGrafo — fiel al contrato del grafo real', () => {
  it('concepto con regla: veredicto + fuente con clave/cita/url + checklist', () => {
    const e = mockEvaluacionGrafo(['Servicios de agencia de carga y transporte internacional'], 'regulatorio')
    expect(e.estado).toBe('permitido')
    expect(e.conceptos[0].fuente?.clave).toBe('MX-LCPAF-8-50-66-68-AUTOTRANSPORTE')
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


  it('escaneo quirúrgico: el claim e-AWB se ancla en ley mexicana, no en IATA', () => {
    // El mock citaba IATA Res. 672 como fuente, sin anclaje nacional. La base real es
    // el Art. 55 LAC (el contrato DEBE constar en carta de porte o guia de carga aerea);
    // IATA baja a bandera como estandar sectorial. Espeja el seed del grafo (2026-09-02).
    const e = mockEvaluacionGrafo(['Emisión de guía aérea electrónica (e-AWB) — «Elaborate Electronics AWB for you»'], 'regulatorio')
    const c = e.conceptos[0]
    expect(c.categoria).toBe('CARGA_AEREA_EAWB')
    expect(c.fuente?.clave).toBe('MX-LAC-55-56-CARGA-AEREA')
    expect(c.fuente?.cita).toContain('Ley de Aviacion Civil')
    expect(c.fuente?.url).toContain('diputados.gob.mx')
    expect(c.checklist.join(' ')).toContain('carta de porte o guia de carga aerea')
    // el limite queda DECLARADO: la NOM del formato no esta sembrada y IATA no es autoridad
    expect(c.banderas.join(' ')).toContain('norma oficial mexicana')
    expect(c.banderas.join(' ')).toContain('estandar SECTORIAL')
    expect(c.banderas.join(' ')).toContain('PARALELA')
    expect(e.disclaimer).toBe(DISCLAIMER_GRAFO)
  })

  it('T-MEC: el trato preferencial se dictamina con el texto del tratado, y no se promete', () => {
    // Espeja el seed del grafo (2026-09-03): el marco de origen del T-MEC ya vive en
    // el grafo real, pero la calificacion de una mercancia concreta (Anexo 4-B) NO.
    const e = mockEvaluacionGrafo(['Importamos bajo trato arancelario preferencial del T-MEC'], 'regulatorio')
    const c = e.conceptos[0]
    expect(c.categoria).toBe('TMEC_TRATO_PREFERENCIAL')
    expect(c.fuente?.clave).toBe('MX-TMEC-5.4-OBLIGACIONES-IMPORTADOR')
    expect(c.fuente?.cita).toContain('DOF 29-06-2020')
    expect(c.fuente?.url).toContain('gob.mx')
    expect(c.checklist.join(' ')).toContain('certificacion de origen valida AL MOMENTO')
    // el limite queda DECLARADO: las reglas por producto no estan sembradas
    expect(c.banderas.join(' ')).toContain('Anexo 4-B')
    expect(c.banderas.join(' ')).toContain('NO es automatico')
    expect(e.disclaimer).toBe(DISCLAIMER_GRAFO)
  })

  it('T-MEC: exportar sin nombrar el tratado NO recibe dictamen de T-MEC', () => {
    // El mock imita al clasificador real: sin vocabulario del tratado no hay regla.
    const e = mockEvaluacionGrafo(['Exportamos autopartes a Estados Unidos'], 'regulatorio')
    expect(e.conceptos[0].categoria).toBeNull()
    expect(e.conceptos[0].estado).toBe('dudoso')
    expect(e.conceptos[0].razon).toBe('sin regla aplicable')
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
