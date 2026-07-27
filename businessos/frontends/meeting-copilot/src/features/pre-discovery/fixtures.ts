// Caso demo de Pre-Discovery (lead GAL): construido con el MISMO provider mock
// del pipeline — fidelidad garantizada entre fixture y fallback por construcción.

import type { CasoPreDiscovery, IntakeLead } from './types'
import { ORDEN_BLOQUES, estadoCasoDe } from './types'
import { mockBloque } from './mock'

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

const BLOQUES_GAL = {
  ...(Object.fromEntries(ORDEN_BLOQUES.map((b) => [b, mockBloque(b, INTAKE_GAL)])) as CasoPreDiscovery['bloques']),
  sitio: SITIO_GAL,
  perfil: PERFIL_GAL,
  brief: BRIEF_GAL,
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
