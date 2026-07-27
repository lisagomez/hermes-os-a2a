// Contrato del GRAFO REGULATORIO (espejo EXACTO de businessos/grafo/schemas.py)
// + mock fiel + validación de respuesta (patrón grafo-a2a: una respuesta sin
// disclaimer o sin fuentes NO es del grafo y se rechaza).

export type DimensionGrafo = 'fiscal' | 'contable' | 'contractual' | 'regulatorio'
export type EstadoGrafo = 'deducible' | 'no_deducible' | 'permitido' | 'no_permitido' | 'dudoso'

export interface FuenteGrafo {
  clave: string
  cita: string
  url: string
  vigencia: { desde: string; hasta: string | null }
}

export interface ConceptoEvaluado {
  descripcion: string
  categoria: string | null
  estado: EstadoGrafo
  razon: string
  fuente: FuenteGrafo | null // null SOLO si razon === 'sin regla aplicable'
  banderas: string[]
  checklist: string[]
}

export interface EvaluacionGrafo {
  id: string | null
  contexto: { jurisdiccion: string; dimension: DimensionGrafo; regimen: string; fecha: string }
  estado: EstadoGrafo
  conceptos: ConceptoEvaluado[]
  banderas_rojas: string[]
  checklist: string[]
  fuentes: FuenteGrafo[]
  disclaimer: string
  /** Extensión local (no viene del grafo): de dónde salió esta evaluación. */
  conexion: 'grafo' | 'mock'
}

/** Disclaimer EXACTO del grafo (businessos/grafo/evaluador.py::DISCLAIMER). */
export const DISCLAIMER_GRAFO =
  'Este dictamen es informativo y automatizado: senala riesgos y cita fuentes, NO es asesoria fiscal. ' +
  'La decision final corresponde al contribuyente y su contador. Cifras y topes pendientes de cotejo contra DOF donde se indique.'

/** Regla de oro (patrón grafo-a2a/executor.py): sin disclaimer o sin fuentes con
 *  cita, la respuesta NO se acepta como dictamen del grafo. */
export function validarRespuestaGrafo(r: unknown): r is Omit<EvaluacionGrafo, 'conexion'> {
  if (typeof r !== 'object' || r === null) return false
  const o = r as Record<string, unknown>
  if (typeof o.disclaimer !== 'string' || o.disclaimer.length === 0) return false
  if (!Array.isArray(o.conceptos) || !Array.isArray(o.fuentes)) return false
  for (const c of o.conceptos as Record<string, unknown>[]) {
    if (typeof c.estado !== 'string' || typeof c.razon !== 'string') return false
    // fuente null solo es legítima en el fail-safe:
    if (c.fuente === null && c.razon !== 'sin regla aplicable') return false
  }
  return true
}

// ─── Mock FIEL (mismo fail-safe, mismas claves de regla del seed real) ──────

const REGLAS_MOCK: { patron: RegExp; dimension: DimensionGrafo; categoria: string; estado: EstadoGrafo; razon: string; fuente: FuenteGrafo; banderas: string[]; checklist: string[] }[] = [
  {
    patron: /(agencia de carga|freight|forwarder|logistic|transporte de carga|flete)/i,
    dimension: 'regulatorio',
    categoria: 'AUTOTRANSPORTE_CARGA',
    estado: 'permitido',
    razon: 'Servicio de autotransporte federal de carga y agencia de carga (permiso SICT)',
    fuente: {
      clave: 'MX-LCPAF-PERMISO-SICT',
      cita: 'Ley de Caminos, Puentes y Autotransporte Federal, Art. 8 (permiso SICT)',
      url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LCPAF.pdf',
      vigencia: { desde: '1993-12-22', hasta: null },
    },
    banderas: ['Verificar vigencia del permiso SICT y del seguro de carga obligatorio'],
    checklist: ['Permiso de autotransporte federal (SICT)', 'Seguro de responsabilidad por la carga', 'Carta porte CFDI con complemento vigente'],
  },
  {
    patron: /(seguro|aseguradora|intermediaci[oó]n de seguros|broker de seguros|agente de seguros)/i,
    dimension: 'regulatorio',
    categoria: 'AGENTES_SEGUROS',
    estado: 'permitido',
    razon: 'Intermediacion de seguros: requiere autorizacion de la CNSF',
    fuente: {
      clave: 'MX-LISF-93-AUTORIZACION-AGENTE',
      cita: 'Ley de Instituciones de Seguros y de Fianzas, Art. 93',
      url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISF.pdf',
      vigencia: { desde: '2013-04-04', hasta: null },
    },
    banderas: ['La intermediacion sin autorizacion CNSF es sancionable'],
    checklist: ['Autorizacion CNSF vigente del agente/corredor', 'Deber de informacion al cliente (Art. 94)'],
  },
  {
    patron: /(e-?awb|awb electronica|air waybill|guia aerea electronica|electronics? awb)/i,
    dimension: 'regulatorio',
    categoria: 'CARGA_AEREA_EAWB',
    estado: 'permitido',
    razon: 'Guia aerea electronica (e-AWB): contrato de transporte por medios electronicos amparado por el Convenio de Montreal 1999 (Art. 4) e instrumentado via IATA Resolucion 672 (Multilateral e-AWB Agreement)',
    fuente: {
      clave: 'IATA-CSC-672-MEA',
      cita: 'IATA Resolution 672 CSC(35) — Form of Multilateral e-AWB Agreement (marco juridico del contrato de carga por medios electronicos, bajo Convenio de Montreal 1999 Art. 4)',
      url: 'https://www.iata.org/contentassets/783ac75f30d74e32a8eaef26af5696b6/csc-672-en-28dec2019.pdf',
      vigencia: { desde: '2019-12-28', hasta: null },
    },
    banderas: [
      'Operar e-AWB SIN adhesion al Multilateral e-AWB Agreement (MeA) deja el contrato electronico sin el marco juridico de la Res. 672',
      'La informacion anticipada de carga aerea ante aduanas mexicanas (SAT/ANAM) es requisito paralelo: cotejar la regla RGCE vigente',
    ],
    checklist: [
      'Adhesion vigente al MeA (firma unica ante IATA, Resolucion 672)',
      'Capacidad de intercambio EDI: mensajes FWB/FHL (Cargo-IMP) o Cargo-XML con las aerolineas',
      'Conservacion del registro electronico del contrato (Convenio de Montreal 1999, Art. 4)',
      'Transmision de informacion anticipada de carga a aduanas MX (validar regla RGCE aplicable con el agente aduanal)',
    ],
  },
  {
    patron: /(software|saas|plataforma|desarrollo|app|tecnolog[ií]a)/i,
    dimension: 'fiscal',
    categoria: 'MX-GASTOS-ESTRICTAMENTE-INDISPENSABLES',
    estado: 'deducible',
    razon: 'Gastos estrictamente indispensables para la actividad (servicios de tecnologia)',
    fuente: {
      clave: 'MX-LISR-27-I',
      cita: 'LISR Art. 27, fraccion I',
      url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf',
      vigencia: { desde: '2014-01-01', hasta: null },
    },
    banderas: ['CFDI con requisitos completos; pago bancarizado si excede el tope de efectivo'],
    checklist: ['CFDI vigente del proveedor', 'Materialidad del servicio documentada'],
  },
]

export function mockEvaluacionGrafo(conceptos: string[], dimension: DimensionGrafo): EvaluacionGrafo {
  const evaluados: ConceptoEvaluado[] = conceptos.map((descripcion) => {
    const regla = REGLAS_MOCK.find((r) => r.dimension === dimension && r.patron.test(descripcion))
    if (!regla) {
      // Fail-safe del grafo: sin regla aplicable → dudoso, sin fuente, jamás se adivina.
      return { descripcion, categoria: null, estado: 'dudoso', razon: 'sin regla aplicable', fuente: null, banderas: [], checklist: [] }
    }
    return {
      descripcion,
      categoria: regla.categoria,
      estado: regla.estado,
      razon: `${regla.razon} (${regla.fuente.cita})`,
      fuente: regla.fuente,
      banderas: regla.banderas,
      checklist: regla.checklist,
    }
  })

  const estados = new Set(evaluados.map((c) => c.estado))
  const estado: EstadoGrafo = estados.size === 1 ? evaluados[0].estado : 'dudoso'
  const fuentes = evaluados.flatMap((c) => (c.fuente ? [c.fuente] : []))
  const fuentesUnicas = [...new Map(fuentes.map((f) => [f.clave, f])).values()]

  return {
    id: null,
    contexto: { jurisdiccion: 'MX', dimension, regimen: dimension === 'regulatorio' ? 'GENERAL' : 'PM_TITULO_II', fecha: new Date().toISOString().slice(0, 10) },
    estado,
    conceptos: evaluados,
    banderas_rojas: [...new Set(evaluados.flatMap((c) => c.banderas))],
    checklist: [...new Set(evaluados.flatMap((c) => c.checklist))],
    fuentes: fuentesUnicas,
    disclaimer: DISCLAIMER_GRAFO,
    conexion: 'mock',
  }
}
