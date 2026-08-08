// Provider MOCK determinista de Pre-Discovery: mismo input → mismo output.
// Genera contenido plausible parametrizado por el intake (giro/empresa), con la
// separación hecho/hipótesis/recomendación respetada: en mock casi todo es
// HIPÓTESIS (no hubo observación real) salvo lo que viene del propio intake.

import type {
  Bloque,
  BloqueId,
  DatosBrief,
  DatosCompetencia,
  DatosDiferenciacion,
  DatosEnriquecimiento,
  DatosFoda,
  DatosPerfil,
  DatosSitio,
  DatosTecnologia,
  IntakeLead,
  Item,
} from './types'
import { mockEvaluacionGrafo, type DimensionGrafo, type EvaluacionGrafo } from './grafo'

const AHORA_FIJO = '2026-07-26T12:00:00.000Z' // determinista (fixtures estables)

function hip(texto: string): Item {
  return { texto, naturaleza: 'hipotesis' }
}
function hecho(texto: string, evidencia: string): Item {
  return { texto, naturaleza: 'hecho', evidencia }
}
function rec(texto: string): Item {
  return { texto, naturaleza: 'recomendacion' }
}

function esLogistica(intake: IntakeLead): boolean {
  return /(carga|freight|forwarder|log[ií]stica|transporte|aduana|embarque)/i.test(intake.giro + ' ' + intake.notas)
}

function bloqueListo<T>(datos: T, fuente: string, requiereValidacion: string[] = []): Bloque<T> {
  return {
    estado: 'listo',
    datos,
    confianza: 'media', // mock nunca reclama confianza alta
    procedencia: { metodo: 'mock', fuente },
    requiereValidacion,
    error: null,
    generadoAt: AHORA_FIJO,
  }
}

export function mockPerfil(intake: IntakeLead): Bloque<DatosPerfil> {
  const logistica = esLogistica(intake)
  return bloqueListo<DatosPerfil>(
    {
      empresaNormalizada: intake.web ? intake.web.replace(/^https?:\/\/(www\.)?/, '').split('/')[0].split('.')[0].toUpperCase() : intake.giro,
      descripcion: logistica
        ? `Empresa de ${intake.giro} (${intake.tamano} personas, ${intake.pais}): coordina embarques y trámites para clientes importadores/exportadores.`
        : `Empresa de ${intake.giro} (${intake.tamano} personas, ${intake.pais}).`,
      industria: logistica ? 'Logística y transporte de carga' : intake.giro,
      orientacion: 'servicios',
      resumenEjecutivo: logistica
        ? 'Freight forwarder mediano con operación establecida; señales de procesos manuales en cotización y seguimiento — perfil típico de digitalización temprana con dolor operativo real.'
        : `Negocio de ${intake.giro} con perfil de digitalización temprana; validar procesos núcleo en la entrevista.`,
    },
    'perfil demo derivado del intake',
    ['Confirmar tamaño real del equipo y cobertura geográfica en la entrevista']
  )
}

export function mockSitio(intake: IntakeLead): Bloque<DatosSitio> {
  const logistica = esLogistica(intake)
  if (!logistica) {
    return bloqueListo<DatosSitio>(
      {
        servicios: [hip(`Servicios principales de ${intake.giro} (por confirmar contra el sitio real)`)],
        propuestaValor: hip('Propuesta de valor no observada (análisis demo sin sitio real)'),
        claims: [],
        segmentosObjetivo: [hip(`Clientes de ${intake.giro} en ${intake.pais}`)],
        madurezDigital: { nivel: 'baja', senales: [hip('Sin señales observadas — análisis demo')] },
        vacios: [hip('Posicionamiento sin diferenciador explícito (patrón común del giro; validar)')],
      },
      'análisis demo sin fetch del sitio',
      ['Todo este bloque requiere el análisis real del sitio']
    )
  }
  return bloqueListo<DatosSitio>(
    {
      servicios: [
        hecho('Flete marítimo y aéreo internacional (FCL/LCL)', 'declarado en el intake/giro del lead'),
        hip('Agenciamiento aduanal a través de socios'),
        hip('Transporte terrestre nacional puerta a puerta'),
        hip('Seguro de carga como servicio complementario'),
      ],
      propuestaValor: hip('Atención personalizada y seguimiento cercano del embarque (propuesta típica del segmento; validar la real)'),
      claims: [hip('«Cobertura global» y «respuesta rápida» — claims genéricos del giro, por verificar en su sitio')],
      segmentosObjetivo: [hip('PyMEs importadoras/exportadoras'), hip('Manufactura con cadena de suministro internacional')],
      madurezDigital: {
        nivel: 'baja',
        senales: [hip('Cotización por correo/WhatsApp y seguimiento manual (patrón dominante en forwarders medianos MX)')],
      },
      vacios: [
        hip('Sin tracking en línea visible para el cliente final'),
        hip('Propuesta de valor indiferenciada frente a forwarders grandes'),
      ],
    },
    'plantilla demo del giro logística (sin fetch real)',
    ['Verificar servicios y claims contra el sitio real', 'Confirmar si existe portal de tracking']
  )
}

export function mockCompetencia(intake: IntakeLead): Bloque<DatosCompetencia> {
  const logistica = esLogistica(intake)
  if (!logistica) {
    return {
      estado: 'no_concluyente',
      datos: null,
      confianza: 'baja',
      procedencia: { metodo: 'mock', fuente: 'análisis demo' },
      requiereValidacion: ['Identificar competidores con el análisis real o añadirlos a mano'],
      error: null,
      generadoAt: AHORA_FIJO,
    }
    // Honestidad: competencia no identificada con confianza suficiente — no se inventa.
  }
  return bloqueListo<DatosCompetencia>(
    {
      competidores: [
        {
          nombre: 'Forwarder regional consolidado (tipo Nowports)',
          url: null,
          posicionamiento: 'Digital-first: cotización en línea, tracking y financiamiento de carga',
          servicios: ['Flete internacional', 'Tracking en línea', 'Financiamiento'],
          diferenciadores: ['Plataforma tecnológica propia', 'Velocidad de cotización'],
          madurez: 'alta',
          confianza: 'media',
        },
        {
          nombre: 'Agencias tradicionales locales',
          url: null,
          posicionamiento: 'Relación personal y precio; operación manual',
          servicios: ['Flete', 'Aduanas'],
          diferenciadores: ['Trato directo con el dueño'],
          madurez: 'baja',
          confianza: 'media',
        },
      ],
      comparativa: [
        { dimension: 'posicionamiento', lead: 'Servicio cercano, sin diferenciador digital', lectura: 'El lead compite hoy en el mismo terreno que las agencias tradicionales; el flanco digital lo tienen los consolidados.' },
        { dimension: 'servicios', lead: 'Portafolio completo pero sin capa digital visible', lectura: 'La brecha no es de portafolio sino de EXPERIENCIA del cliente (visibilidad del embarque).' },
        { dimension: 'madurez', lead: 'Baja (procesos manuales)', lectura: 'Digitalizar cotización/tracking lo separa del montón sin pelear contra los grandes en precio.' },
      ],
    },
    'benchmark demo del segmento forwarders MX',
    ['Confirmar competidores directos reales con el lead en la entrevista']
  )
}

export function mockDiferenciacion(intake: IntakeLead): Bloque<DatosDiferenciacion> {
  void intake
  return bloqueListo<DatosDiferenciacion>(
    {
      oportunidades: [
        { titulo: 'Visibilidad del embarque como producto', gapCompetitivo: 'Las agencias tradicionales no dan tracking; los consolidados sí pero sin trato cercano', linea: 'Combinar el trato personal con un portal simple de estatus — el híbrido que ninguno de los dos extremos ofrece', naturaleza: 'recomendacion' },
        { titulo: 'Especialización por vertical de carga', gapCompetitivo: 'Competidores generalistas', linea: 'Foco en 1–2 industrias (p. ej. perecederos o automotriz) con expertise regulatorio demostrable', naturaleza: 'recomendacion' },
        { titulo: 'Cotización en horas, no días', gapCompetitivo: 'El ciclo de cotización manual del segmento tarda días', linea: 'Automatizar el catálogo de tarifas para responder el mismo día', naturaleza: 'recomendacion' },
      ],
    },
    'lectura demo del benchmark'
  )
}

export function mockFoda(intake: IntakeLead): Bloque<DatosFoda> {
  return bloqueListo<DatosFoda>(
    {
      fortalezas: [hecho(`Operación establecida en ${intake.pais} con equipo de ${intake.tamano}`, 'intake del lead'), hip('Relaciones personales con clientes actuales')],
      oportunidades: [hip('Digitalizar cotización y seguimiento antes que sus pares directos'), hip('Nearshoring: crecimiento de flujos de carga hacia México')],
      debilidades: [hip('Procesos manuales en cotización/seguimiento'), hip('Sin diferenciador visible frente a competidores')],
      amenazas: [hip('Forwarders digitales bajando precios con eficiencia'), hip('Concentración de clientes (por validar)')],
    },
    'FODA demo derivado del intake y benchmark',
    ['Validar concentración de clientes y dependencia de tarifas en la entrevista']
  )
}

export function mockRegulatorio(intake: IntakeLead): Bloque<EvaluacionGrafo> {
  const conceptos = esLogistica(intake)
    ? [`Servicios de agencia de carga y transporte internacional (${intake.giro})`, 'Venta de seguro de carga al cliente final como intermediario']
    : [`Operación de ${intake.giro} en ${intake.pais}`]
  const evaluacion = mockEvaluacionGrafo(conceptos, 'regulatorio' satisfies DimensionGrafo)
  return {
    estado: evaluacion.estado === 'dudoso' ? 'no_concluyente' : 'listo',
    datos: evaluacion,
    confianza: 'media',
    procedencia: { metodo: 'mock', fuente: 'mock fiel del grafo regulatorio (fail-safe y citas del seed)' },
    requiereValidacion: ['Todo tema regulatorio marcado dudoso requiere revisión posterior con el grafo real y un especialista'],
    error: null,
    generadoAt: AHORA_FIJO,
  }
}

/** El enriquecimiento NO tiene modo demo, y es deliberado: inventar el correo o
 *  el teléfono de una empresa real es exactamente el fallo que ese servicio
 *  existe para evitar. Cuando no está disponible se DECLARA, con cero hallazgos. */
export function mockEnriquecimiento(intake: IntakeLead): Bloque<DatosEnriquecimiento> {
  return {
    estado: 'no_concluyente',
    datos: {
      leadId: '',
      hallazgos: [],
      bloqueos: [],
      gate69b: null,
      costoUsd: 0,
      persistido: false,
      fuentes: [],
      disclaimer:
        'El enriquecimiento no corrió: no hay datos de contacto verificados para ' +
        `${intake.giro}. Este bloque nunca inventa un correo ni un teléfono.`,
    },
    confianza: 'baja',
    procedencia: { metodo: 'mock', fuente: 'enriquecimiento no disponible (sin datos inventados)' },
    requiereValidacion: ['El waterfall de enriquecimiento no está disponible en este entorno: los datos de contacto siguen sin verificar'],
    error: null,
    generadoAt: AHORA_FIJO,
  }
}

export function mockTecnologia(intake: IntakeLead): Bloque<DatosTecnologia> {
  const logistica = esLogistica(intake)
  return bloqueListo<DatosTecnologia>(
    {
      stackVisible: [hip('Sin señales de stack observadas (análisis demo sin sitio real)')],
      madurezDigital: 'baja',
      herramientasProbables: logistica
        ? [hip('Excel + correo para cotizaciones'), hip('WhatsApp para seguimiento con clientes'), hip('Sistema aduanal de terceros (SAAI/ventanilla)')]
        : [hip(`Herramientas ofimáticas genéricas del giro ${intake.giro}`)],
      oportunidadesAutomatizacion: [
        rec('Cotizador con catálogo de tarifas centralizado'),
        rec('Portal/notificaciones de estatus del embarque'),
        rec('Captura única de datos del cliente (hoy probablemente re-captura por trámite)'),
      ],
    },
    'inferencia demo por tipo de operación',
    ['Confirmar herramientas reales en la entrevista']
  )
}

export function mockBrief(intake: IntakeLead): Bloque<DatosBrief> {
  const logistica = esLogistica(intake)
  return bloqueListo<DatosBrief>(
    {
      resumen: logistica
        ? `${intake.giro} en ${intake.pais}, ${intake.tamano} personas. Perfil de digitalización temprana con dolor probable en cotización y visibilidad de embarques. Entrar por operación, no por tecnología.`
        : `${intake.giro} en ${intake.pais}. Análisis demo: validar el proceso núcleo y su costo en la entrevista.`,
      angulos: [
        hip('El costo oculto del seguimiento manual (horas del equipo respondiendo "¿dónde va mi carga?")'),
        hip('Cotizaciones que se pierden por tardar días en responder'),
      ],
      hipotesis: [
        hip('El seguimiento de embarques consume horas diarias del equipo'),
        hip('Pierden cotizaciones por tiempo de respuesta'),
        hip('No hay visibilidad del margen por embarque en tiempo real'),
      ],
      riesgos: [hip('Decisor puede no estar en la primera llamada (estructura familiar típica del giro)'), hip('Sensibilidad alta al precio si se posiciona como "software" y no como operación')],
      preguntasRecomendadas: [
        '¿Cuánto tiempo le toma hoy al equipo armar una cotización completa?',
        '¿Cómo se entera el cliente del estatus de su embarque y cuántas veces les preguntan al día?',
        '¿Qué cotizaciones recuerdan haber perdido por responder tarde?',
        '¿Quién decidiría una inversión en digitalizar la operación y cómo?',
      ],
      temasSensibles: [hip('Comparaciones con forwarders digitales grandes pueden leerse como amenaza — enfocar en SU operación')],
      siguientePaso: 'Entrevista de discovery con el operador principal presente; llevar 2 preguntas de impacto cuantificado.',
    },
    'brief demo derivado de los bloques anteriores'
  )
}

export function mockBloque(bloque: BloqueId, intake: IntakeLead): Bloque<unknown> {
  switch (bloque) {
    case 'perfil':
      return mockPerfil(intake)
    case 'sitio':
      return mockSitio(intake)
    case 'competencia':
      return mockCompetencia(intake)
    case 'diferenciacion':
      return mockDiferenciacion(intake)
    case 'foda':
      return mockFoda(intake)
    case 'regulatorio':
      return mockRegulatorio(intake)
    case 'enriquecimiento':
      return mockEnriquecimiento(intake)
    case 'tecnologia':
      return mockTecnologia(intake)
    case 'brief':
      return mockBrief(intake)
  }
}
