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
    razon: 'Autotransporte federal de carga: permiso de la Secretaria, alcance, responsabilidad y garantia',
    fuente: {
      clave: 'MX-LCPAF-8-50-66-68-AUTOTRANSPORTE',
      cita: 'Ley de Caminos, Puentes y Autotransporte Federal, Arts. 8o. fracciones I, IV y XI, 50, 66 y 68 (texto vigente, ultima reforma de la Ley DOF 14-11-2025)',
      url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LCPAF.pdf',
      vigencia: { desde: '1993-12-23', hasta: null },
    },
    banderas: [
      'El permisionario responde de perdidas y danos desde que recibe la carga hasta que la entrega, salvo las cinco excepciones del Art. 66',
      'Si el usuario no declara el valor, la responsabilidad se limita a 15 dias de salario minimo por tonelada (Art. 66, fraccion V); la referencia es anterior a la UMA',
      'El complemento Carta Porte del CFDI es una obligacion FISCAL distinta del permiso: vive en la RMF y las RGCE, fuera de este grafo',
    ],
    checklist: [
      'Permiso de la Secretaria para operacion y explotacion del autotransporte federal de carga (Art. 8o., fraccion I)',
      'Permiso para paqueteria y mensajeria (Art. 8o., fraccion IV) y para transporte privado de carga (fraccion XI)',
      'Permiso especial para objetos voluminosos o de gran peso (Art. 50)',
      'Garantizar los danos a terceros en los terminos que autorice la Secretaria (Art. 68)',
    ],
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
    razon: 'Carga aerea: el contrato de transporte debe constar en carta de porte o guia de carga aerea',
    fuente: {
      clave: 'MX-LAC-55-56-CARGA-AEREA',
      cita: 'Ley de Aviacion Civil, Arts. 55 y 56 (texto vigente, ultima reforma de la Ley DOF 14-11-2025)',
      url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LAC.pdf',
      vigencia: { desde: '1995-05-13', hasta: null },
    },
    banderas: [
      'El formato lo fija una norma oficial mexicana que NO esta sembrada en este grafo: que una guia ELECTRONICA (e-AWB) satisfaga el requisito de forma del Art. 55 debe cotejarse contra esa NOM',
      'La Resolucion 672 de IATA y el Acuerdo Multilateral e-AWB son estandar SECTORIAL, no exigencia de autoridad mexicana: acreditan practica de la industria, no cumplimiento del Art. 55',
      'En transporte aereo internacional rigen ademas los tratados (Convenio de Montreal), fuera de este grafo',
      'La informacion anticipada de carga ante la autoridad aduanera es una obligacion PARALELA: vive en la Ley Aduanera y las RGCE',
    ],
    checklist: [
      'Documentar el contrato en carta de porte o guia de carga aerea expedida al embarcador al recibir la mercancia (Art. 55)',
      'Sujetar el formato a la norma oficial mexicana respectiva (Art. 55)',
      'El embarcador responde por la exactitud de las declaraciones consignadas (Art. 55)',
      'Verificar que el prestador cuente con la concesion o permiso del tipo de servicio (Art. 11)',
    ],
  },
  {
    // Vocabulario del tratado, NO de la exportacion en general: el grafo real solo
    // clasifica en T-MEC cuando el texto lo nombra (o nombra su certificacion).
    patron: /(t-?mec|usmca|trato arancelario preferencial|certificaci[oó]n de origen)/i,
    dimension: 'regulatorio',
    categoria: 'TMEC_TRATO_PREFERENCIAL',
    estado: 'permitido',
    razon: 'T-MEC: obligaciones del importador que solicita trato arancelario preferencial',
    fuente: {
      clave: 'MX-TMEC-5.4-OBLIGACIONES-IMPORTADOR',
      cita: 'T-MEC, Capitulo 5 (Procedimientos de Origen), Art. 5.4 (Obligaciones Referentes a las Importaciones), parrafos 1 a 3 — texto final publicado por la Secretaria de Economia; promulgado por decreto DOF 29-06-2020, en vigor el 01-07-2020',
      url: 'https://www.gob.mx/cms/uploads/attachment/file/465786/05ESPProcedimientosdeorigen.pdf',
      vigencia: { desde: '2020-07-01', hasta: null },
    },
    banderas: [
      'El trato preferencial NO es automatico por ser mercancia de la region: depende de que la mercancia califique como originaria conforme al Capitulo 4 y de que exista certificacion valida',
      'Las reglas de origen ESPECIFICAS POR PRODUCTO (Anexo 4-B) no estan sembradas: si una mercancia concreta califica se responde dudoso, nunca se adivina',
      'El T-MEC no tiene certificado de origen de formato oficial como el TLCAN: quien exija el formato viejo pide un documento que el tratado ya no contempla',
    ],
    checklist: [
      'Hacer la declaracion de que la mercancia califica como originaria, como parte de la documentacion de importacion (Art. 5.4.1(a))',
      'Tener en su poder una certificacion de origen valida AL MOMENTO de hacer la declaracion, no despues (Art. 5.4.1(b))',
      'Entregar copia de la certificacion de origen a la administracion aduanera cuando la requiera (Art. 5.4.1(c))',
      'Conservar la documentacion por al menos cinco anos desde la importacion (Art. 5.8.1)',
    ],
  },
  {
    patron: /(\blegal\b|abogad|bufete|law ?firm|attorney|lawyer|servicios legales|despacho jur[ií]dico|litig)/i,
    dimension: 'regulatorio',
    categoria: 'SERVICIOS_LEGALES',
    estado: 'permitido',
    razon: 'Ejercicio de la abogacia: titulo registrado y patente de ejercicio (cedula); la materia es local — cotejar la ley de profesiones de la entidad',
    fuente: {
      clave: 'MX-LRART5-24-26-EJERCICIO-PROFESIONAL',
      cita: 'Ley Reglamentaria del Articulo 5o. Constitucional (CDMX), Arts. 24-26',
      url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf_mov/Ley_Reglamentaria_del_Articulo_5o-ejercicio-profesiones-Ciudad_de_Mexico.pdf',
      vigencia: { desde: '2018-01-19', hasta: null },
    },
    banderas: [
      'Si el despacho prepara o ejecuta operaciones del Art. 17-XI LFPIORPI por cuenta de clientes (inmuebles, cuentas, constitucion de sociedades), es Actividad Vulnerable: obligaciones de identificacion y Aviso (LFPIORPI Arts. 17-XI y 18)',
    ],
    checklist: ['Cedula profesional (patente de ejercicio) de los abogados que ejercen', 'Evaluacion PLD: determinar si realiza actividades del Art. 17-XI LFPIORPI'],
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
