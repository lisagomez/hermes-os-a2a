// Caso demo de Pre-Discovery (lead GAL): construido con el MISMO provider mock
// del pipeline — fidelidad garantizada entre fixture y fallback por construcción.

import type { CasoPreDiscovery, DatosSitio, IntakeLead } from './types'
import { ORDEN_BLOQUES, estadoCasoDe } from './types'
import { mockBloque } from './mock'
import { mockEvaluacionGrafo } from './grafo'
import { escaneoRegulatorio } from './escaneo-regulatorio'
import { escaneoTecnologico } from './escaneo-tecnologico'
import type { DatosTecnologia } from './types'

export const INTAKE_GAL: IntakeLead = {
  telefono: '',
  email: '',
  web: 'https://galmexico.com/',
  tamano: '11-50',
  giro: 'Agencia de carga / logística (freight forwarder)',
  pais: 'México',
  notas:
    'LinkedIn empresa: https://www.linkedin.com/company/galogisticsmex/ · ' +
    'Fundadores: Adán Reyes García (https://www.linkedin.com/in/adan-reyesgracia/) y ' +
    'Rogelio Betancourt (https://www.linkedin.com/in/rogelio-betancourt-8a7891108/).',
}

// ─── Compilación REAL de las fuentes de GAL (hecha el 2026-07-26) ───────────
// galmexico.com y el LinkedIn de empresa se LEYERON de verdad; los perfiles de
// los fundadores los bloquea LinkedIn sin sesión (HTTP 999) y así se declara.
// Todo "hecho" cita el texto observado; lo demás queda como hipótesis.

const PROCEDENCIA_GAL = {
  metodo: 'observado' as const,
  fuente: 'compilación 2026-07-26: galmexico.com + LinkedIn de empresa (fundadores bloqueados por LinkedIn)',
}

const FUENTES_GAL = [
  { url: 'https://galmexico.com/', estado: 'leida' as const, detalle: 'sitio corporativo (en inglés) — servicios, valores agregados y contacto' },
  { url: 'https://www.linkedin.com/company/galogisticsmex/', estado: 'leida' as const, detalle: '65 followers; misma propuesta "Efficiency & High Standards"' },
  { url: 'https://www.linkedin.com/in/adan-reyesgracia/', estado: 'bloqueada' as const, detalle: 'HTTP 999: LinkedIn exige sesión para perfiles personales' },
  { url: 'https://www.linkedin.com/in/rogelio-betancourt-8a7891108/', estado: 'bloqueada' as const, detalle: 'HTTP 999: LinkedIn exige sesión para perfiles personales' },
]

const SITIO_GAL = {
  estado: 'listo' as const,
  confianza: 'alta' as const,
  procedencia: PROCEDENCIA_GAL,
  requiereValidacion: [
    'Validar si el "Personalized Tracking" y la "Control operation tower" son sistema propio o proceso manual detrás',
    'Perfiles de fundadores no compilados (LinkedIn bloquea sin sesión): revisarlos a mano antes de la entrevista',
  ],
  error: null,
  generadoAt: '2026-07-26T18:00:00.000Z',
  datos: {
    fuentes: FUENTES_GAL,
    servicios: [
      { texto: 'Hand Carry (courier a bordo): un profesional viaja con la mercancía en el primer vuelo disponible — emergencias y abasto a líneas de producción', naturaleza: 'hecho' as const, evidencia: 'A solution from GAL designed to carry out small shippment in hand… supplies to production lines' },
      { texto: 'Express Service urgente 24/7/365: carga reservada en el siguiente vuelo disponible, aéreo/charter, terrestre o courier a bordo, con monitoreo a destino', naturaleza: 'hecho' as const, evidencia: 'Your urgent cargo is reserved on the next available flight… We are open 24 hours a day, 365 days a year' },
      { texto: 'Carga aérea (air freight): importación/exportación en 230 países y toda la República Mexicana, de embarques ligeros a pesados', naturaleza: 'hecho' as const, evidencia: 'Import and export in 230 countries with Express Service and throughout the Mexican Republic' },
      { texto: 'Servicios especiales adicionales anunciados: Charter y Parcel', naturaleza: 'hecho' as const, evidencia: 'logistics solutions in special services like Hand Carry, Charter, Parcel and Express Freight Services (LinkedIn de empresa)' },
    ],
    propuestaValor: { texto: 'Logística time-critical de servicios especiales con eficiencia y altos estándares: "transportamos tu carga a cualquier parte del mundo"', naturaleza: 'hecho' as const, evidencia: 'Efficiency and high standards — We help transport your cargo anywhere in the world' },
    claims: [
      { texto: 'Cobertura de importación/exportación en 230 países', naturaleza: 'hecho' as const, evidencia: 'Import and export in 230 countries' },
      { texto: 'Operación 24 horas, 365 días del año', naturaleza: 'hecho' as const, evidencia: 'We are open 24 hours a day, 365 days a year' },
      { texto: 'Torre de control de operación y de precios, tracking personalizado y reportes a la medida', naturaleza: 'hecho' as const, evidencia: 'Personalized Tracking and Monitoring · Control operation tower · Control price tower · Customized Reports' },
      { texto: 'AWB electrónica y recolecciones remotas en el extranjero', naturaleza: 'hecho' as const, evidencia: 'Scheduling remote pick ups in foreign countries · Elaborate Electronics AWB for you' },
    ],
    segmentosObjetivo: [
      { texto: 'Empresas con cadenas de suministro críticas (abasto a líneas de producción, emergencias industriales)', naturaleza: 'hecho' as const, evidencia: 'supplies to production lines, to solve specific problems… without your business is affected' },
      { texto: 'Manufactura de exportación del noreste MX (sede en San Pedro Garza García, NL)', naturaleza: 'hipotesis' as const },
    ],
    madurezDigital: {
      nivel: 'media' as const,
      senales: [
        { texto: 'Anuncian tracking personalizado, torre de control y soluciones de automatización', naturaleza: 'hecho' as const, evidencia: 'Personalized Tracking and Monitoring · Control operation tower · Automation Solutions' },
        { texto: 'No se observa portal de cliente ni cotizador en línea en el sitio (contacto por teléfono/correo)', naturaleza: 'hecho' as const, evidencia: 'CONTACT +52 818 656 7016 · comercial@galmexico.com (sin login ni cotizador visibles)' },
        { texto: 'Presencia digital pequeña: 65 seguidores en LinkedIn de empresa', naturaleza: 'hecho' as const, evidencia: 'GAL México | 65 followers on LinkedIn' },
      ],
    },
    vacios: [
      { texto: 'Sitio únicamente en inglés para operar en México: posible fricción con clientes locales', naturaleza: 'hecho' as const, evidencia: 'todo el contenido de galmexico.com está en inglés' },
      { texto: 'El "tracking personalizado" no muestra portal self-service: probablemente se entrega por atención humana (por validar)', naturaleza: 'hipotesis' as const },
      { texto: 'Sin precios, tiempos ni cotización en línea para un servicio que compite por velocidad', naturaleza: 'hipotesis' as const },
    ],
  },
}

const PERFIL_GAL = {
  estado: 'listo' as const,
  confianza: 'alta' as const,
  procedencia: PROCEDENCIA_GAL,
  requiereValidacion: ['Confirmar tamaño real del equipo y volumen mensual por servicio en la entrevista'],
  error: null,
  generadoAt: '2026-07-26T18:00:00.000Z',
  datos: {
    empresaNormalizada: 'GAL (GAL México / galogisticsmex)',
    descripcion: 'Freight forwarder de SERVICIOS ESPECIALES time-critical con sede en San Pedro Garza García, NL: Hand Carry (courier a bordo), Express Service 24/7, carga aérea a 230 países, Charter y Parcel. Fundadores: Adán Reyes García y Rogelio Betancourt.',
    industria: 'Logística — servicios especiales / carga urgente (time-critical)',
    orientacion: 'servicios' as const,
    resumenEjecutivo: 'No es un forwarder generalista: GAL vive del embarque URGENTE (hand carry, next-flight-out, 24/7). Anuncia torre de control y tracking personalizado pero sin portal visible — la conversación de descubrimiento debe validar cuánta de esa operación crítica corre sobre procesos manuales y teléfono.',
  },
}

const BRIEF_GAL = {
  estado: 'listo' as const,
  confianza: 'alta' as const,
  procedencia: PROCEDENCIA_GAL,
  requiereValidacion: [],
  error: null,
  generadoAt: '2026-07-26T18:00:00.000Z',
  datos: {
    resumen: 'GAL (San Pedro Garza García, NL) es especialista en carga URGENTE: hand carry, next-flight-out y aéreo a 230 países, operando 24/7. Venden velocidad y control ("torre de control", "tracking personalizado") sin portal visible — el ángulo es la operación crítica: cuánto cuesta coordinar urgencias a mano las 24 horas.',
    angulos: [
      { texto: 'El costo de coordinar hand carry/next-flight-out por teléfono y correo a las 3 AM (su promesa es 24/7/365)', naturaleza: 'hipotesis' as const },
      { texto: 'La "torre de control" como producto: si hoy es gente + hojas, digitalizarla ES su diferenciador vendible', naturaleza: 'hipotesis' as const },
      { texto: 'Clientes de líneas de producción exigen visibilidad en tiempo real: dárselas sin llamadas es valor directo', naturaleza: 'hecho' as const, evidencia: 'supplies to production lines… Personalized Tracking and Monitoring' },
    ],
    hipotesis: [
      { texto: 'El tracking "personalizado" se entrega por WhatsApp/llamadas, no por sistema self-service', naturaleza: 'hipotesis' as const },
      { texto: 'Cotizar un servicio urgente (vuelos + courier + aduana) les toma horas de coordinación manual', naturaleza: 'hipotesis' as const },
      { texto: 'La operación 24/7 depende de pocas personas clave (fundadores incluidos) — riesgo de escala', naturaleza: 'hipotesis' as const },
      { texto: 'El sitio solo en inglés sugiere foco en corporativos/manufactura extranjera; el mercado local puede estar sub-atendido', naturaleza: 'hipotesis' as const },
    ],
    riesgos: [
      { texto: 'Empresa de 2 fundadores visibles: la decisión probablemente es de Adán/Rogelio en corto — pero sin ellos no hay deal', naturaleza: 'hipotesis' as const },
      { texto: 'Posicionados en servicio premium: sensibles a propuestas que suenen a "software genérico" y no a operación', naturaleza: 'hipotesis' as const },
    ],
    preguntasRecomendadas: [
      '¿Cómo opera hoy la torre de control en un embarque urgente de madrugada — quién coordina y con qué herramientas?',
      '¿Cuántos hand carry / next-flight-out mueven al mes y cuánto tardan en cotizar uno?',
      '¿Qué sistema respalda el "Personalized Tracking" — el cliente lo consulta solo o les llama/escribe?',
      '¿Cómo capturan y facturan la AWB electrónica y los reportes a la medida: sistema o manualmente?',
      '¿Entre Adán y Rogelio, quién decide una inversión en digitalizar la operación y qué necesitarían ver?',
    ],
    temasSensibles: [
      { texto: 'No criticar el sitio en inglés ni la presencia digital pequeña: es su carta de presentación con corporativos — enfocar en la OPERACIÓN', naturaleza: 'recomendacion' as const },
    ],
    siguientePaso: 'Entrevista de discovery con al menos uno de los fundadores presente; abrir por la operación de urgencias 24/7, no por tecnología.',
  },
}


const PROCEDENCIA_RESEARCH = {
  metodo: 'observado' as const,
  fuente: 'deep research 2026-07-26: sitios de competidores leídos y verificados (timecritical.com.mx, onboardcourier.com, logisticsplus.mx) + búsqueda del sector time-critical MX',
}

const COMPETENCIA_GAL = {
  estado: 'listo' as const,
  confianza: 'alta' as const,
  procedencia: PROCEDENCIA_RESEARCH,
  requiereValidacion: [
    'Confirmar con GAL contra quiénes pierden/ganan deals en la práctica (la lista observada es del sector, no de su pipeline)',
  ],
  error: null,
  generadoAt: '2026-07-26T19:00:00.000Z',
  datos: {
    competidores: [
      {
        nombre: 'Time Critical Logistics (Guadalajara, MX)',
        url: 'https://www.timecritical.com.mx/',
        posicionamiento: 'Especialista mexicano en urgencias: hand carry/OBC, charter y courier internacional, 24/7/365, para automotriz, aeroespacial y hi-tech — el espejo más directo de GAL en México',
        servicios: ['Hand carry / on-board courier', 'Charter', 'International courier', 'Time critical'],
        diferenciadores: ['20+ años de especialistas declarados', 'Base en el corredor industrial de GDL'],
        madurez: 'baja' as const,
        confianza: 'alta' as const,
      },
      {
        nombre: 'Chapman Freeborn OBC (global)',
        url: 'https://onboardcourier.com/',
        posicionamiento: 'El estándar premium global del OBC: couriers propios con visas en todo el mundo, cotización en 15 minutos, booking en línea y tracking en tiempo real; ISO 9001',
        servicios: ['On-board courier', 'Next Flight Out', 'Charter (grupo Chapman Freeborn)'],
        diferenciadores: ['Cotización en 15 min', 'Booking y tracking online', 'Red global de couriers con visas'],
        madurez: 'alta' as const,
        confianza: 'alta' as const,
      },
      {
        nombre: 'Logistics Plus México (Monterrey, global)',
        url: 'https://logisticsplus.mx/',
        posicionamiento: 'Forwarder global con oficina en MTY (+52 81…): charter, Next Flight Out y hand carry como LÍNEAS de un portafolio amplio (forwarding + aduanas) — compite por el mismo cliente con más red y menos especialización',
        servicios: ['Charter', 'Next Flight Out', 'Hand carry (OBC)', 'Freight forwarding', 'Aduanas'],
        diferenciadores: ['Red global', 'Ventanilla única logística'],
        madurez: 'media' as const,
        confianza: 'alta' as const,
      },
      {
        nombre: 'Grandes forwarders con plaza en Monterrey (AIT, Crane, Omni, Scan Global)',
        url: 'https://www.aitworldwide.com/locations/monterrey-mexico/',
        posicionamiento: 'Los globales instalados en MTY sirven automotriz/industrial con servicio urgente como línea (Scan Global incluso ofrece OBC): pelean por los mismos clientes del noreste con marca y capacidad, sin ser especialistas del urgente',
        servicios: ['Air freight', 'Expedited / OBC (algunos)', 'Aduanas', '3PL'],
        diferenciadores: ['Marca global', 'Capacidad y cobertura', 'Relaciones corporativas'],
        madurez: 'alta' as const,
        confianza: 'media' as const,
      },
    ],
    comparativa: [
      {
        dimension: 'posicionamiento',
        lead: 'Especialista time-critical local (Hand Carry, Express 24/7, aéreo 230 países) con trato directo',
        lectura: 'GAL compite en un sector con tres frentes reales: el especialista MX (Time Critical Logistics), el premium global (Chapman OBC) y los generalistas con plaza en MTY. Su terreno defendible es el urgente ESPECIALIZADO con cercanía — ninguno de los grandes da trato de fundador.',
      },
      {
        dimension: 'servicios',
        lead: 'Mismo menú del sector (hand carry, NFO, charter, aéreo) — el portafolio NO diferencia',
        lectura: 'Los cuatro competidores verificados ofrecen esencialmente lo mismo: en este sector el portafolio es commodity; se gana por velocidad de respuesta, confiabilidad demostrable y experiencia del cliente.',
      },
      {
        dimension: 'madurez digital',
        lead: 'Anuncia torre de control y tracking personalizado, sin portal visible',
        lectura: 'La vara la pone Chapman OBC: cotización en 15 min, booking y tracking online. Su espejo directo (Time Critical Logistics) sigue en teléfono/correo, igual que GAL: EL PRIMERO de los especialistas MX que digitalice cotización y visibilidad se queda el diferenciador del segmento.',
      },
      {
        dimension: 'cliente objetivo',
        lead: 'Líneas de producción y emergencias industriales (observado en su sitio)',
        lectura: 'Automotriz/aeroespacial del noreste es exactamente donde AIT/Crane/Omni concentran su oficina de MTY: GAL necesita defender esas cuentas con especialización y velocidad antes de que el urgente se vuelva una línea más del 3PL grande.',
      },
    ],
  },
}

const DIFERENCIACION_GAL = {
  estado: 'listo' as const,
  confianza: 'alta' as const,
  procedencia: PROCEDENCIA_RESEARCH,
  requiereValidacion: [],
  error: null,
  generadoAt: '2026-07-26T19:00:00.000Z',
  datos: {
    oportunidades: [
      {
        titulo: 'Igualar la vara digital del premium global',
        gapCompetitivo: 'Chapman OBC cotiza en 15 min con booking/tracking online; el especialista MX directo (Time Critical Logistics) sigue en teléfono — GAL también',
        linea: 'Digitalizar cotización de urgencias y visibilidad del embarque ANTES que Time Critical Logistics: quedarse el título de "especialista MX con experiencia digital premium"',
        naturaleza: 'recomendacion' as const,
      },
      {
        titulo: 'La torre de control como producto vendible',
        gapCompetitivo: 'GAL ya ANUNCIA torre de control y tracking personalizado (observado); los generalistas de MTY venden capacidad, no visibilidad dedicada',
        linea: 'Convertir la promesa en portal/notificaciones reales para clientes de líneas de producción — es la defensa natural contra AIT/Crane/Omni',
        naturaleza: 'recomendacion' as const,
      },
      {
        titulo: 'Especialización vertical declarada',
        gapCompetitivo: 'Los grandes de MTY sirven automotriz/industrial de forma genérica; el sitio de GAL ya habla de líneas de producción',
        linea: 'Empaquetar el hand carry/NFO por vertical (automotriz noreste, aeroespacial) con SLAs y casos — foco que el 3PL grande no va a construir',
        naturaleza: 'recomendacion' as const,
      },
    ],
  },
}


// Marco regulatorio derivado QUIRÚRGICAMENTE de lo observado en las fuentes:
// el claim "Elaborate Electronics AWB" dispara el marco e-AWB (Convenio de
// Montreal 1999 Art. 4 + IATA Res. 672/MeA + EDI + info anticipada aduanas MX).
const REGULATORIO_GAL = (() => {
  const evaluacion = mockEvaluacionGrafo(
    [
      'Servicios de agencia de carga y transporte internacional (Hand Carry, Express Service, Air Freight — observados en galmexico.com)',
      'Venta de seguro de carga al cliente final como intermediario',
      'Emisión de guía aérea electrónica (e-AWB) — claim observado: «Elaborate Electronics AWB for you»',
    ],
    'regulatorio'
  )
  // Hermes-Regulatory-Scan: cruce declarado-vs-esperado sobre lo observado en GAL.
  const escaneo = escaneoRegulatorio(INTAKE_GAL, SITIO_GAL.datos as DatosSitio, evaluacion)
  return {
    estado: (evaluacion.estado === 'dudoso' ? 'no_concluyente' : 'listo') as 'listo' | 'no_concluyente',
    datos: { ...evaluacion, escaneo },
    confianza: 'alta' as const,
    procedencia: {
      metodo: 'observado' as const,
      fuente: 'conceptos derivados de los servicios y claims OBSERVADOS en galmexico.com; dictamen del mock fiel del grafo (fuentes citadas)',
    },
    requiereValidacion: [
      'Confirmar con GAL su adhesión vigente al Multilateral e-AWB Agreement (Res. 672) y su capacidad EDI (FWB/FHL Cargo-IMP o Cargo-XML)',
      'Cotejar con su agente aduanal la regla RGCE vigente de información anticipada de carga aérea',
      'Todo tema marcado dudoso requiere revisión posterior con el grafo real y un especialista',
    ],
    error: null,
    generadoAt: '2026-07-27T00:00:00.000Z',
  }
})()

// Marco tecnológico con el cruce declarado-vs-esperado sobre lo OBSERVADO:
// "tracking personalizado" y "Electronics AWB" son claims (hipótesis: declarado
// por el lead, por validar), y el portal/cotizador ausente queda como vacío —
// la oportunidad de automatización que ancla el pitch.
const TECNOLOGIA_GAL = (() => {
  const base = mockBloque('tecnologia', INTAKE_GAL)
  const escaneo = escaneoTecnologico(INTAKE_GAL, SITIO_GAL.datos as DatosSitio, base.datos as DatosTecnologia)
  return {
    ...base,
    datos: { ...(base.datos as DatosTecnologia), escaneo },
    requiereValidacion: [
      ...base.requiereValidacion,
      ...escaneo.matriz.filter((m) => m.estado === 'hipotesis').map((m) => `Capacidad declarada sin sistema observable: ${m.capacidad} — validar en entrevista sobre qué corre`),
    ],
  }
})()

const BLOQUES_GAL = {
  ...(Object.fromEntries(ORDEN_BLOQUES.map((b) => [b, mockBloque(b, INTAKE_GAL)])) as CasoPreDiscovery['bloques']),
  sitio: SITIO_GAL,
  perfil: PERFIL_GAL,
  brief: BRIEF_GAL,
  competencia: COMPETENCIA_GAL,
  diferenciacion: DIFERENCIACION_GAL,
  regulatorio: REGULATORIO_GAL,
  tecnologia: TECNOLOGIA_GAL,
} as CasoPreDiscovery['bloques']

export const CASO_DEMO_GAL: CasoPreDiscovery = {
  id: 'caso-gal',
  leadId: 'lead-gal',
  intake: INTAKE_GAL,
  estado: estadoCasoDe(BLOQUES_GAL),
  bloques: BLOQUES_GAL,
  activoId: 'act-loc-demo-1',
  creadoAt: '2026-07-26T12:00:00.000Z',
  actualizadoAt: '2026-07-26T12:00:00.000Z',
}

export const CASOS_DEMO: CasoPreDiscovery[] = [CASO_DEMO_GAL]
