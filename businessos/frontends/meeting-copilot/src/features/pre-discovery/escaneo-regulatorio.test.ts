import { describe, expect, it } from 'vitest'
import { escaneoRegulatorio, propuestasSeed, type EscaneoRegulatorio } from './escaneo-regulatorio'
import { mockEvaluacionGrafo } from './grafo'
import { extraerEnlacesRelevantes } from './html'
import type { CasoPreDiscovery, DatosSitio, IntakeLead } from './types'
import { bloquesVacios } from './types'

const intakeForwarder: IntakeLead = {
  telefono: '',
  email: '',
  web: 'https://lead.mx',
  tamano: '11-50',
  giro: 'Agencia de carga / logística (freight forwarder)',
  pais: 'México',
  notas: '',
}

const sitioConEawb: DatosSitio = {
  fuentes: [{ url: 'https://lead.mx', estado: 'leida', detalle: '5,000 caracteres' }],
  servicios: [{ texto: 'Air freight a 230 países', naturaleza: 'hecho', evidencia: 'sitio' }],
  propuestaValor: { texto: 'Carga crítica', naturaleza: 'hecho' },
  claims: [{ texto: 'Elaborate Electronics AWB for you', naturaleza: 'hecho', evidencia: 'sitio' }],
  segmentosObjetivo: [],
  madurezDigital: { nivel: 'media', senales: [] },
  vacios: [],
}

function casoDe(intake: IntakeLead, sitio: DatosSitio | null): CasoPreDiscovery {
  const bloques = bloquesVacios()
  bloques.sitio = { ...bloques.sitio, estado: 'listo', datos: sitio }
  return { id: 'caso-t', leadId: 'lead-t', intake, estado: 'parcial', bloques, activoId: null, creadoAt: '', actualizadoAt: '' }
}

describe('escaneoRegulatorio — cruce DECLARADO vs ESPERADO (Hermes-Regulatory-Scan)', () => {
  it('con dictamen completo: las tres expectativas del sector salen con evidencia → cobertura alta', () => {
    const evaluacion = mockEvaluacionGrafo(
      ['agencia de carga y transporte', 'venta de seguro de carga como intermediario', 'guía aérea electrónica e-AWB'],
      'regulatorio'
    )
    const e = escaneoRegulatorio(intakeForwarder, sitioConEawb, evaluacion)
    expect(e.sector).toContain('Logística')
    expect(e.matriz.map((m) => m.estado)).toEqual(['evidencia', 'evidencia', 'evidencia'])
    expect(e.cobertura).toBe('alta')
    expect(e.opacidadAlta).toBe(false)
    expect(e.vacioDelGrafo).toBeNull()
  })

  it('señal de carga aérea SIN categoría e-AWB en el dictamen → hipótesis severidad alta (el hueco que se comió el e-AWB)', () => {
    const evaluacion = mockEvaluacionGrafo(['agencia de carga y transporte'], 'regulatorio')
    const e = escaneoRegulatorio(intakeForwarder, sitioConEawb, evaluacion)
    const eawb = e.matriz.find((m) => m.categoria === 'CARGA_AEREA_EAWB')
    expect(eawb?.estado).toBe('hipotesis')
    expect(eawb?.severidad).toBe('alta')
  })

  it('expectativa del sector sin señal ni dictamen → VACÍO (el vacío es el hallazgo)', () => {
    const sitioSinSeguro: DatosSitio = { ...sitioConEawb, servicios: [], claims: [] }
    const intakeTerrestre = { ...intakeForwarder, giro: 'transporte de carga terrestre' }
    const evaluacion = mockEvaluacionGrafo(['transporte de carga terrestre'], 'regulatorio')
    const e = escaneoRegulatorio(intakeTerrestre, sitioSinSeguro, evaluacion)
    const seguros = e.matriz.find((m) => m.categoria === 'AGENTES_SEGUROS')
    expect(seguros?.estado).toBe('vacio')
  })

  it('cero evidencias con expectativas activas → ALTA OPACIDAD REGULATORIA', () => {
    const evaluacion = mockEvaluacionGrafo(['tema misterioso sin regla'], 'regulatorio')
    const e = escaneoRegulatorio(intakeForwarder, sitioConEawb, evaluacion)
    expect(e.opacidadAlta).toBe(true)
    expect(e.cobertura).toBe('baja')
  })

  it('giro "Legal" (caso bufete): sector legal detectado, expectativa SERVICIOS_LEGALES con evidencia del dictamen', () => {
    const intakeLegal = { ...intakeForwarder, giro: 'Legal' }
    const evaluacion = mockEvaluacionGrafo(['Operación de Legal en México (MX)'], 'regulatorio')
    const e = escaneoRegulatorio(intakeLegal, null, evaluacion)
    expect(e.sector).toContain('legales')
    expect(e.vacioDelGrafo).toBeNull()
    const legales = e.matriz.find((m) => m.categoria === 'SERVICIOS_LEGALES')
    expect(legales?.estado).toBe('evidencia')
  })

  it('sector legal con práctica corporativa declarada y sin dictamen → hipótesis sobre CONSTITUCION_SOCIEDADES', () => {
    const intakeLegal = { ...intakeForwarder, giro: 'Bufete de abogados', notas: 'práctica de derecho corporativo' }
    const evaluacion = mockEvaluacionGrafo(['Operación de Bufete de abogados en México'], 'regulatorio')
    const e = escaneoRegulatorio(intakeLegal, null, evaluacion)
    const corp = e.matriz.find((m) => m.categoria === 'CONSTITUCION_SOCIEDADES')
    expect(corp?.estado).toBe('hipotesis')
  })

  it('frontera de palabra: "prácticas ilegales" NO dispara el sector legal (hallazgo adversarial 2026-08-08)', () => {
    const intakeOtro = { ...intakeForwarder, giro: 'comercio electrónico', notas: 'combate prácticas ilegales en su industria' }
    const e = escaneoRegulatorio(intakeOtro, null, mockEvaluacionGrafo(['x'], 'regulatorio'))
    expect(e.sector).toBeNull()
    expect(e.vacioDelGrafo).toContain('VACÍO DEL GRAFO')
  })

  it('precedencia: un forwarder que menciona su "departamento legal" sigue siendo sector Logística', () => {
    const intakeMixto = { ...intakeForwarder, notas: 'cuentan con departamento legal interno' }
    const e = escaneoRegulatorio(intakeMixto, sitioConEawb, mockEvaluacionGrafo(['agencia de carga'], 'regulatorio'))
    expect(e.sector).toContain('Logística')
  })

  it('sector sin categorías en el grafo → VACÍO DEL GRAFO, jamás se inventan marcos', () => {
    const intakeDental = { ...intakeForwarder, giro: 'clínica dental' }
    const evaluacion = mockEvaluacionGrafo(['operación de clínica dental'], 'regulatorio')
    const e = escaneoRegulatorio(intakeDental, null, evaluacion)
    expect(e.sector).toBeNull()
    expect(e.matriz).toEqual([])
    expect(e.vacioDelGrafo).toContain('VACÍO DEL GRAFO')
  })
})

describe('propuestasSeed — modo PROPUESTA hacia el seed del grafo', () => {
  it('hipótesis → nueva_senal con trazabilidad (lead, caso, evidencia, destino con gate)', () => {
    const evaluacion = mockEvaluacionGrafo(['agencia de carga y transporte'], 'regulatorio')
    const escaneo = escaneoRegulatorio(intakeForwarder, sitioConEawb, evaluacion)
    const props = propuestasSeed(casoDe(intakeForwarder, sitioConEawb), escaneo)
    const senal = props.find((p) => p.tipo === 'nueva_senal')
    expect(senal?.categoria).toBe('CARGA_AEREA_EAWB')
    expect(senal?.estado).toBe('PROPOSED')
    expect(senal?.leadId).toBe('lead-t')
    expect(senal?.evidencia[0]?.fuente).toBe('https://lead.mx')
    expect(senal?.destino).toContain('gate de procedencia')
  })

  it('VACÍO DEL GRAFO → propuesta nuevo_ambito; sin hallazgos accionables no hay propuestas', () => {
    const intakeDental = { ...intakeForwarder, giro: 'clínica dental' }
    const escaneoVacio = escaneoRegulatorio(intakeDental, null, mockEvaluacionGrafo(['x'], 'regulatorio'))
    expect(propuestasSeed(casoDe(intakeDental, null), escaneoVacio).map((p) => p.tipo)).toEqual(['nuevo_ambito'])

    const todoCubierto: EscaneoRegulatorio = { sector: 'Logística', cobertura: 'alta', opacidadAlta: false, vacioDelGrafo: null, matriz: [
      { categoria: 'CARGA_AEREA_EAWB', esperadaPor: 'x', estado: 'evidencia', severidad: 'baja', detalle: '' },
    ] }
    expect(propuestasSeed(casoDe(intakeForwarder, sitioConEawb), todoCubierto)).toEqual([])
  })
})

describe('extraerEnlacesRelevantes — escaneo quirúrgico de enlaces internos', () => {
  it('solo mismo host y paths con señal regulatoria/servicios; dedupe y cap', () => {
    const html =
      '<a href="/services/eawb">e-AWB</a><a href="/compliance">Compliance</a>' +
      '<a href="/blog/post">Blog</a><a href="https://otro.com/legal">Externo</a>' +
      '<a href="/services/eawb#top">dup</a>'
    const enlaces = extraerEnlacesRelevantes(html, 'https://lead.mx/')
    expect(enlaces).toEqual(['https://lead.mx/services/eawb', 'https://lead.mx/compliance'])
  })

  it('base inválida o sin anchors → lista vacía, sin explotar', () => {
    expect(extraerEnlacesRelevantes('<a href="/services">x</a>', 'no-es-url')).toEqual([])
    expect(extraerEnlacesRelevantes('<p>sin enlaces</p>', 'https://lead.mx')).toEqual([])
  })
})

describe('sector legal — el grafo ya tenía las categorías; el mapa las estrena', () => {
  const intakeLegal: IntakeLead = {
    telefono: '',
    email: '',
    web: 'https://firma.mx',
    tamano: '11-50',
    giro: 'Legal',
    pais: 'México (MX)',
    notas: 'Firma de abogados full-service; quieren plataforma legal especializada',
  }

  it('giro "Legal" ya NO cae en VACÍO DEL GRAFO: hay sector con expectativas', () => {
    const e = escaneoRegulatorio(intakeLegal, null, mockEvaluacionGrafo(['x'], 'regulatorio'))
    expect(e.vacioDelGrafo).toBeNull()
    expect(e.sector).toContain('legales')
    expect(e.matriz.length).toBeGreaterThanOrEqual(4)
  })

  it('servicios del sitio disparan señal (hipótesis) por área de práctica; lo no declarado queda como vacío', () => {
    const sitioFirma: DatosSitio = {
      servicios: [
        { texto: 'Derecho corporativo: constitución de sociedades y M&A', naturaleza: 'hecho', evidencia: 'sitio' },
        { texto: 'Registro de marcas y propiedad intelectual', naturaleza: 'hecho', evidencia: 'sitio' },
      ],
      propuestaValor: { texto: 'Asesoría integral', naturaleza: 'hecho' },
      claims: [],
      segmentosObjetivo: [],
      madurezDigital: { nivel: 'media', senales: [] },
      vacios: [],
    }
    const e = escaneoRegulatorio(intakeLegal, sitioFirma, mockEvaluacionGrafo(['algo sin categoría'], 'regulatorio'))
    const porCategoria = Object.fromEntries(e.matriz.map((m) => [m.categoria, m.estado]))
    expect(porCategoria.CONSTITUCION_SOCIEDADES).toBe('hipotesis')
    expect(porCategoria.MARCAS_REGISTRO).toBe('hipotesis')
    expect(porCategoria.COMPRAVENTA_INMUEBLES).toBe('vacio')
  })
})

describe('el patrón legal NO secuestra giros ajenos (falsos positivos del ataque adversarial)', () => {
  const base: IntakeLead = { telefono: '', email: '', web: '', tamano: '11-50', giro: '', pais: 'México (MX)', notas: '' }

  it('"Despacho contable" y un depto. jurídico interno NO son sector legal (van a vacío del grafo)', () => {
    const contable = escaneoRegulatorio({ ...base, giro: 'Despacho contable' }, null, mockEvaluacionGrafo(['x'], 'regulatorio'))
    expect(contable.sector).toBeNull()
    expect(contable.vacioDelGrafo).not.toBeNull()

    const manufactura = escaneoRegulatorio(
      { ...base, giro: 'Manufactura de autopartes', notas: 'Su departamento jurídico interno revisa contratos' },
      null,
      mockEvaluacionGrafo(['x'], 'regulatorio')
    )
    expect(manufactura.sector).toBeNull()
  })

  it('"despacho jurídico" y "bufete" SÍ disparan el sector', () => {
    expect(escaneoRegulatorio({ ...base, giro: 'Despacho jurídico' }, null, mockEvaluacionGrafo(['x'], 'regulatorio')).sector).toContain('legales')
    expect(escaneoRegulatorio({ ...base, giro: 'Bufete de abogados' }, null, mockEvaluacionGrafo(['x'], 'regulatorio')).sector).toContain('legales')
  })
})
