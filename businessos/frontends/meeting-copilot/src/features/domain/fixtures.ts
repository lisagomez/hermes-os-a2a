import type { Lead, Reunion, Segmento, Transcripcion } from './types'
import { UMBRAL_INAUDIBLE } from './types'
import { fmtTiempo } from '@/shared/lib/format'

// Personajes FICTICIOS (regla del PRP: cero datos de clientes reales).
// Cada fixture está diseñada para ejercitar estados distintos del score:
//  R1 discovery bueno (~88) · R2 discovery superficial (~35) · R3 demo con objeciones (~60)

function seg(inicioS: number, finS: number, hablante: string, texto: string, confianza = 0.94): Segmento {
  return { inicioS, finS, hablante, texto: confianza < UMBRAL_INAUDIBLE ? '[inaudible]' : texto, confianza }
}

export function contenidoDesdeSegmentos(segmentos: Segmento[]): string {
  return segmentos.map((s) => `[${fmtTiempo(s.inicioS)}] ${s.hablante}: ${s.texto}`).join('\n')
}

function confianzaGlobalDe(segmentos: Segmento[]): 'alta' | 'media' | 'baja' {
  const prom = segmentos.reduce((a, s) => a + s.confianza, 0) / segmentos.length
  if (prom >= 0.9) return 'alta'
  if (prom >= 0.7) return 'media'
  return 'baja'
}

function transcripcion(id: string, reunionId: string, segmentos: Segmento[]): Transcripcion {
  return {
    id,
    reunionId,
    motor: 'mock',
    confianzaGlobal: confianzaGlobalDe(segmentos),
    contenido: contenidoDesdeSegmentos(segmentos),
    segmentos,
  }
}

// ─── R1 · TransLogika MX — discovery bueno ──────────────────────────────────

const SEG_R1: Segmento[] = [
  seg(4, 16, 'Valeria', 'Marco, Lucía, gracias por el tiempo. La idea de hoy es entender su operación antes de hablar de producto. ¿Les parece?', 0.96),
  seg(17, 24, 'Marco', 'Perfecto, Valeria. Nosotros movemos unos ciento veinte embarques al mes, casi todo carga terrestre a frontera.', 0.95),
  seg(25, 33, 'Valeria', '¿Qué es lo que más se les complica hoy en la operación?', 0.97),
  seg(34, 52, 'Marco', 'El seguimiento. Perdemos embarques cada mes porque el control lo llevamos en hojas de cálculo y correos sueltos, y nadie ve el estatus completo.', 0.95),
  seg(53, 60, 'Lucía', 'Y cuando el cliente pregunta dónde va su carga, tardamos horas en armar la respuesta.', 0.93),
  seg(61, 66, 'Valeria', '¿Cuánto les cuesta cada embarque que se les cae?', 0.96),
  seg(67, 84, 'Marco', 'Cada embarque caído nos cuesta como ochenta mil pesos entre penalizaciones y reexpediciones, y son unos tres al mes.', 0.95),
  seg(85, 92, 'Valeria', 'O sea que hablamos de un cuarto de millón mensual. ¿Y qué han intentado hasta ahora?', 0.94),
  seg(93, 108, 'Marco', 'Hoy trabajamos con Excel y un sistema viejo que se llama CargoSoft, y estamos evaluando a Drivin, pero no nos convence el soporte.', 0.94),
  seg(109, 118, 'Valeria', '¿Cuál sería el objetivo del año para ustedes, más allá de tapar el hueco?', 0.95),
  seg(119, 132, 'Marco', 'Nuestro objetivo es crecer veinte por ciento los embarques sin contratar más gente de tráfico.', 0.95),
  seg(133, 141, 'Lucía', 'Sería ideal que las alertas de retraso llegaran solas al cliente, sin que nosotros marquemos.', 0.92),
  seg(142, 149, 'Valeria', '¿Para cuándo necesitan tener esto resuelto?', 0.96),
  seg(150, 163, 'Marco', 'Queremos resolverlo antes de octubre, que arranca la temporada alta. Si llegamos a temporada así como estamos, no la libramos.', 0.94),
  seg(164, 171, 'Valeria', 'Entendido. ¿Quién más participaría en la decisión?', 0.96),
  seg(172, 184, 'Marco', 'La decisión final la toma el director general, Rodrigo. Lucía y yo operamos el día a día y armamos la recomendación.', 0.94),
  seg(185, 192, 'Valeria', '¿Y cómo se decide una compra así con Rodrigo? ¿Hay comité o algún proceso formal?', 0.95),
  seg(193, 200, 'Marco', 'Uy, eso tendría que revisarlo con él, la verdad no me lo sé de memoria.', 0.93),
  seg(201, 210, 'Valeria', 'Sin problema, lo vemos juntos. ¿Tienen presupuesto contemplado para esto?', 0.95),
  seg(211, 224, 'Marco', 'Tenemos una partida aprobada para sistemas este año, aunque el monto exacto lo maneja finanzas.', 0.93),
  seg(225, 238, 'Lucía', 'Lo que sí te digo: nos preocupa que la implementación se cruce con la temporada y nos quedemos a medias.', 0.92),
  seg(239, 252, 'Valeria', 'Justo por eso proponemos arrancar por el módulo de seguimiento, que se implementa en tres semanas, y dejar el resto para noviembre.', 0.95),
  seg(253, 262, 'Marco', 'Si esto nos quita el desorden de las hojas, nos interesa. Mándanos la propuesta.', 0.95),
  seg(263, 278, 'Valeria', 'Va. Quedamos en que te mando la propuesta el jueves 30 y agendamos demo con Rodrigo la primera semana de agosto.', 0.96),
  seg(279, 286, 'Marco', 'De acuerdo. Yo le aviso a Rodrigo para que aparte el espacio.', 0.94),
  seg(287, 294, 'Valeria', 'Perfecto. Les mando también el caso de un forwarder parecido a ustedes para que lo vea antes.', 0.95),
]

// ─── R2 · Kapital RH — discovery superficial ────────────────────────────────

const SEG_R2: Segmento[] = [
  seg(3, 12, 'Diego', 'Sofía, gracias por aceptar la llamada. Vi que Kapital RH está creciendo y quería platicarte de nuestra plataforma.', 0.93),
  seg(13, 20, 'Sofía', 'Claro, aunque tengo media hora nada más.', 0.9),
  seg(21, 26, 'Diego', 'Perfecto. ¿Cómo llevan hoy los procesos de nómina?', 0.94),
  seg(27, 36, 'Sofía', 'La nómina se nos complica cada quincena, sobre todo con las incidencias.', 0.91),
  seg(37, 147, 'Diego', 'Te cuento: nuestra plataforma automatiza incidencias, prenómina y timbrado. Tenemos módulo de vacaciones, expediente digital, firma electrónica, portal del empleado, y este mes lanzamos el tablero de indicadores. Además el onboarding es guiado, la migración la hacemos nosotros, y tenemos soporte por chat. Nuestros clientes normalmente ven resultados desde el primer mes, y el módulo de reportes trae plantillas listas para IMSS e Infonavit. También integramos con contabilidad y checadores de huella.', 0.92),
  seg(148, 154, 'Sofía', 'Ah, ok. Suena completo.', 0.88),
  seg(155, 161, 'Diego', '¿Cuántas personas son en el equipo de RH?', 0.93),
  seg(162, 169, 'Sofía', 'Tendría que revisarlo, luego te digo. Entre nómina y reclutamiento somos varios.', 0.9),
  seg(170, 176, 'Diego', 'Va. ¿Y hoy con qué herramienta trabajan?', 0.93),
  seg(177, 184, 'Sofía', 'Todo lo llevamos en Excel y con un contador externo.', 0.91),
  seg(185, 191, 'Diego', '¿Les urge cambiar?', 0.92),
  seg(192, 200, 'Sofía', 'Nos urge, pero la verdad no tenemos una fecha. Ahorita traemos mucho trabajo, no sé si tengamos tiempo para implementar algo.', 0.9),
  seg(201, 207, 'Diego', 'La implementación es rapidísima, no te preocupes por eso.', 0.91),
  seg(208, 213, 'Sofía', '¿Y cuánto cuesta más o menos?', 0.89),
  seg(214, 224, 'Diego', 'Depende del número de empleados, pero es muy accesible. Te puedo armar algo cuando me pases el dato.', 0.9),
  seg(225, 231, 'Sofía', '[ruido de fondo]', 0.42),
  seg(232, 238, 'Diego', '¿Me decías?', 0.9),
  seg(239, 246, 'Sofía', 'Que eso lo vería mi jefa, ella es la que trae el tema de proveedores.', 0.9),
  seg(247, 254, 'Diego', 'Claro. Te mando un correo luego para ver si agendamos algo con ella.', 0.92),
  seg(255, 260, 'Sofía', 'Sale, gracias Diego.', 0.9),
]

// ─── R3 · Andamex Norte — demo con objeciones ───────────────────────────────

const SEG_R3: Segmento[] = [
  seg(5, 14, 'Valeria', 'Raúl, Paty, hoy les muestro el módulo de cotizaciones con su catálogo cargado. Antes, cuéntenme: ¿qué esperan ver hoy?', 0.95),
  seg(15, 30, 'Raúl', 'Que esto de verdad nos acelere. Cotizamos lento porque el catálogo vive en tres archivos distintos y cada vendedor tiene su versión.', 0.94),
  seg(31, 38, 'Paty', 'Y de sistemas nos toca reconciliar los precios cada semana, a mano.', 0.92),
  seg(39, 45, 'Valeria', '¿Qué tanto les afecta en resultados?', 0.94),
  seg(46, 53, 'Raúl', 'Nos pega bastante en ventas, la verdad, aunque no te sabría dar el número exacto.', 0.93),
  seg(54, 120, 'Valeria', 'Miren: aquí el vendedor busca el andamio, el sistema jala el precio vigente del catálogo único, aplica el descuento autorizado por volumen y genera el PDF con vigencia de quince días. Todo queda registrado y sistemas ya no reconcilia nada.', 0.95),
  seg(121, 128, 'Raúl', 'Eso se ve bien. ¿Cuánto tardaría la implementación?', 0.93),
  seg(129, 137, 'Valeria', 'Tres semanas con su catálogo actual, incluida la capacitación de los vendedores.', 0.95),
  seg(138, 148, 'Raúl', 'Oye, pero se me hace caro comparado con lo que pagamos hoy, que es prácticamente nada.', 0.92),
  seg(149, 162, 'Valeria', 'Hoy pagan poco en licencias, pero el costo está escondido en las horas de Paty y en las cotizaciones que salen con precio viejo. Eso es lo que vale la pena comparar.', 0.94),
  seg(163, 171, 'Paty', '¿Y si el equipo no lo adopta? Los vendedores llevan años con sus archivos.', 0.91),
  seg(172, 180, 'Valeria', 'Déjenme mostrarles el flujo del vendedor, que es la parte que más cuidamos.', 0.94),
  seg(181, 190, 'Paty', 'Nosotros también estamos viendo a Odoo, para que lo sepas, aunque lo vemos muy general.', 0.92),
  seg(191, 198, 'Valeria', 'Me parece bien compararlos. ¿Cómo se aprobaría algo así de su lado?', 0.94),
  seg(199, 208, 'Raúl', 'Eso lo ve corporativo, yo nada más recomiendo. Hay un tope aprobado para herramientas, pero no te sabría decir el número.', 0.92),
  seg(209, 215, 'Valeria', '¿Y en tiempos? ¿Tienen alguna fecha en mente?', 0.94),
  seg(216, 222, 'Raúl', 'Cuando se pueda, sin prisa. Primero queremos estar seguros.', 0.92),
  seg(223, 231, 'Raúl', 'Mándame la cotización formal con los dos escenarios que comentamos.', 0.93),
  seg(232, 242, 'Valeria', 'Claro. Déjame platicarlo internamente y te busco con la cotización y el comparativo contra Odoo.', 0.95),
  seg(243, 250, 'Raúl', 'Va, quedamos así.', 0.93),
]

// ─── Reuniones ──────────────────────────────────────────────────────────────

export const REUNIONES_DEMO: Reunion[] = [
  {
    id: 'r-translogika-disc',
    titulo: 'Discovery inicial — control de embarques',
    cuenta: 'TransLogika MX',
    tipoReunion: 'discovery',
    participantes: [
      { nombre: 'Valeria', rol: 'Account Executive', lado: 'interno' },
      { nombre: 'Marco', rol: 'Director de Operaciones', lado: 'cliente' },
      { nombre: 'Lucía', rol: 'Gerente de Tráfico', lado: 'cliente' },
    ],
    asesor: 'Valeria',
    fecha: '2026-07-21T16:00:00.000Z',
    duracionS: 294,
    origen: 'audio',
    leadId: 'lead-translogika',
    estado: 'analizada',
  },
  {
    id: 'r-kapitalrh-disc',
    titulo: 'Primera llamada — plataforma de RH',
    cuenta: 'Kapital RH',
    tipoReunion: 'discovery',
    participantes: [
      { nombre: 'Diego', rol: 'SDR', lado: 'interno' },
      { nombre: 'Sofía', rol: 'Coordinadora de RH', lado: 'cliente' },
    ],
    asesor: 'Diego',
    fecha: '2026-07-22T18:30:00.000Z',
    duracionS: 260,
    origen: 'texto',
    estado: 'analizada',
  },
  {
    id: 'r-andamex-demo',
    titulo: 'Demo — módulo de cotizaciones',
    cuenta: 'Andamex Norte',
    tipoReunion: 'demo',
    participantes: [
      { nombre: 'Valeria', rol: 'Account Executive', lado: 'interno' },
      { nombre: 'Raúl', rol: 'Gerente Comercial', lado: 'cliente' },
      { nombre: 'Paty', rol: 'Jefa de Sistemas', lado: 'cliente' },
    ],
    asesor: 'Valeria',
    fecha: '2026-07-24T15:00:00.000Z',
    duracionS: 250,
    origen: 'virtual',
    leadId: 'lead-andamex',
    estado: 'analizada',
  },
]

export const TRANSCRIPCIONES_DEMO: Transcripcion[] = [
  transcripcion('t-translogika', 'r-translogika-disc', SEG_R1),
  transcripcion('t-kapitalrh', 'r-kapitalrh-disc', SEG_R2),
  transcripcion('t-andamex', 'r-andamex-demo', SEG_R3),
]

/** Audio demo para el flujo de Voice Transcription (produce la transcripción R1). */
export const AUDIO_DEMO = {
  filename: 'discovery-translogika-2026-07-21.mp3',
  reunionBase: REUNIONES_DEMO[0],
  segmentos: SEG_R1,
}

// ─── Leads demo (espejo de public.leads; origen 'copilot') ──────────────────

export const LEADS_DEMO: Lead[] = [
  {
    leadId: 'lead-gal',
    empresa: 'GAL MEXICO (freight forwarder)',
    contacto: 'Alex Gallardo',
    etapa: 'calificado',
    origen: 'copilot',
    datos: { fuente: 'referido', interes: 'digitalizar cotización y seguimiento de embarques' },
    creadoAt: '2026-07-20T16:00:00.000Z',
  },
  {
    leadId: 'lead-translogika',
    empresa: 'TransLogika MX',
    contacto: 'Marco Antúnez',
    etapa: 'descubrimiento',
    origen: 'copilot',
    creadoAt: '2026-07-18T16:00:00.000Z',
  },
  {
    leadId: 'lead-andamex',
    empresa: 'Andamex Norte',
    contacto: 'Raúl Quintero',
    etapa: 'propuesta',
    origen: 'copilot',
    creadoAt: '2026-07-15T16:00:00.000Z',
  },
]
