import { desplazarDias, formatearFecha } from '@/shared/fechas'
import type {
  AgendaMes,
  CasoLitigio,
  ChecklistCaso,
  ComunicacionCaso,
  EventoAgenda,
} from '@/features/litigio/types'

/**
 * Fixtures del Avatar de Litigio. Datos de MUESTRA con realismo MX (juzgados,
 * expedientes, prácticas); ninguna empresa, persona ni expediente es real.
 *
 * "Hoy" se calcula UNA vez al cargar el módulo. La agenda vive en el MES EN
 * CURSO: los días se anclan al día de hoy y se acotan al mes para que la
 * cuadrícula siempre muestre eventos (regla anti-hidratación del plan:
 * fechas ya formateadas, renderizadas solo en server components).
 */

const HOY = new Date()
const ANIO = HOY.getFullYear()
const MES = HOY.getMonth() + 1
const DIA_HOY = HOY.getDate()
const DIAS_EN_MES = new Date(ANIO, MES, 0).getDate()

function diaDelMes(desplazamiento: number): number {
  return Math.min(Math.max(1, DIA_HOY + desplazamiento), DIAS_EN_MES)
}

function fechaDeDia(dia: number): string {
  return formatearFecha(new Date(ANIO, MES - 1, dia))
}

function fechaEnDias(dias: number): string {
  return formatearFecha(desplazarDias(HOY, dias))
}

const NOMBRE_MES = new Intl.DateTimeFormat('es-MX', {
  month: 'long',
  year: 'numeric',
}).format(HOY)

/** Tenencia inerte (decisión C3): un solo despacho de muestra. */
const TENENCIA = { tenantId: 'despacho-demo', asociadoId: 'a2a' }

export const CASOS_LITIGIO: CasoLitigio[] = [
  {
    ...TENENCIA,
    id: 'LIT-2026-0001',
    cliente: 'Manufacturas Roble, S.A. de C.V.',
    contraparte: 'Trabajadores (14) — despido colectivo',
    practica: 'laboral',
    expediente: 'J-1482/2025',
    juzgado: 'Tribunal Laboral Federal de Asuntos Colectivos, Saltillo',
    etapa: 'juicio',
    abogado: 'R. Ibarra',
    riesgo: 'alto',
    proximaActuacion: fechaEnDias(2),
    diasParaActuacion: 2,
    resumen:
      'Audiencia de ofrecimiento y admisión de pruebas; 14 juicios acumulados por despido colectivo.',
  },
  {
    ...TENENCIA,
    id: 'LIT-2026-0002',
    cliente: 'Transportes Sierra, S.A. de C.V.',
    contraparte: 'Sindicato de la empresa',
    practica: 'laboral',
    expediente: 'CC-207/2026',
    juzgado: 'Centro Federal de Conciliación y Registro Laboral',
    etapa: 'estrategia',
    abogado: 'C. Fuentes',
    riesgo: 'medio',
    proximaActuacion: fechaEnDias(9),
    diasParaActuacion: 9,
    resumen:
      'Rescisión colectiva por reestructura de rutas; en diseño de la estrategia de conciliación previa.',
  },
  {
    ...TENENCIA,
    id: 'LIT-2026-0003',
    cliente: 'Hotelera Bahía, S.A.P.I.',
    contraparte: 'Ex gerente de operaciones',
    practica: 'laboral',
    expediente: 'J-0091/2024',
    juzgado: 'Tribunal Laboral Local de Los Cabos',
    etapa: 'ejecucion',
    abogado: 'R. Ibarra',
    riesgo: 'bajo',
    proximaActuacion: fechaEnDias(20),
    diasParaActuacion: 20,
    resumen: 'Laudo firme; en cumplimiento voluntario del convenio de pago.',
  },
  {
    ...TENENCIA,
    id: 'LIT-2026-0004',
    cliente: 'Aceros del Norte, S.A. de C.V.',
    contraparte: 'Distribuidora Poniente, S. de R.L.',
    practica: 'mercantil',
    expediente: '312/2025',
    juzgado: 'Juzgado 4º de Distrito en Materia Mercantil, Monterrey',
    etapa: 'juicio',
    abogado: 'A. Mendoza',
    riesgo: 'medio',
    proximaActuacion: fechaEnDias(4),
    diasParaActuacion: 4,
    resumen:
      'Juicio ejecutivo mercantil por 12 pagarés vencidos; desahogo de pericial contable en curso.',
  },
  {
    ...TENENCIA,
    id: 'LIT-2026-0005',
    cliente: 'Grupo Vitral, S.A. de C.V.',
    contraparte: 'Cristales Industriales del Centro',
    practica: 'mercantil',
    expediente: 'Por presentar',
    juzgado: 'Por definir (cláusula arbitral en revisión)',
    etapa: 'estrategia',
    abogado: 'A. Mendoza',
    riesgo: 'alto',
    proximaActuacion: fechaEnDias(6),
    diasParaActuacion: 6,
    resumen:
      'Incumplimiento de contrato de suministro; se evalúa arbitraje CANACO vs. vía judicial.',
  },
  {
    ...TENENCIA,
    id: 'LIT-2026-0006',
    cliente: 'Financiera Camino, S.A. de C.V., SOFOM',
    contraparte: 'Acreditado — cartera vencida',
    practica: 'mercantil',
    expediente: '887/2024',
    juzgado: 'Juzgado 2º Mercantil del Estado de Jalisco',
    etapa: 'sentencia',
    abogado: 'C. Fuentes',
    riesgo: 'medio',
    proximaActuacion: fechaEnDias(13),
    diasParaActuacion: 13,
    resumen: 'Cerrada la instrucción; en espera de sentencia definitiva.',
  },
  {
    ...TENENCIA,
    id: 'LIT-2026-0007',
    cliente: 'Naviera del Golfo, S.A.',
    contraparte: 'Operadora Portuaria de Tuxpan',
    practica: 'mercantil',
    expediente: 'Intake',
    juzgado: 'Por definir',
    etapa: 'intake',
    abogado: 'L. Serrano',
    riesgo: 'bajo',
    proximaActuacion: null,
    diasParaActuacion: null,
    resumen: 'Controversia por demoras y fletes; en integración del expediente.',
  },
  {
    ...TENENCIA,
    id: 'LIT-2026-0008',
    cliente: 'Inmobiliaria Cumbres, S.A. de C.V.',
    contraparte: 'Arrendatario local comercial A-12',
    practica: 'civil',
    expediente: '1544/2025',
    juzgado: 'Juzgado 9º Civil de la CDMX',
    etapa: 'juicio',
    abogado: 'L. Serrano',
    riesgo: 'medio',
    proximaActuacion: fechaEnDias(11),
    diasParaActuacion: 11,
    resumen:
      'Rescisión de arrendamiento y cobro de rentas vencidas; desahogo de pruebas.',
  },
  {
    ...TENENCIA,
    id: 'LIT-2026-0009',
    cliente: 'Sucesión testamentaria García Peña',
    contraparte: 'Coherederos',
    practica: 'civil',
    expediente: '203/2026',
    juzgado: 'Juzgado 3º Familiar de Zapopan',
    etapa: 'estrategia',
    abogado: 'L. Serrano',
    riesgo: 'bajo',
    proximaActuacion: fechaEnDias(25),
    diasParaActuacion: 25,
    resumen: 'Juicio sucesorio testamentario; inventario y avalúos en preparación.',
  },
  {
    ...TENENCIA,
    id: 'LIT-2026-0010',
    cliente: 'Constructora Meseta, S.A. de C.V.',
    contraparte: 'Ayuntamiento de Ramos Arizpe',
    practica: 'administrativo',
    expediente: 'TCA-455/2025',
    juzgado: 'Tribunal de Justicia Administrativa de Coahuila',
    etapa: 'juicio',
    abogado: 'C. Fuentes',
    riesgo: 'alto',
    proximaActuacion: fechaEnDias(1),
    diasParaActuacion: 1,
    resumen:
      'Impugnación de rescisión administrativa de contrato de obra pública; vence contestación a la ampliación.',
  },
  {
    ...TENENCIA,
    id: 'LIT-2026-0011',
    cliente: 'Distribuidora Farmacéutica Norte, S.A.',
    contraparte: 'COFEPRIS',
    practica: 'administrativo',
    expediente: 'RA-102/2025',
    juzgado: 'Sala Regional del TFJA, Monterrey',
    etapa: 'sentencia',
    abogado: 'R. Ibarra',
    riesgo: 'medio',
    proximaActuacion: fechaEnDias(17),
    diasParaActuacion: 17,
    resumen:
      'Nulidad de clausura temporal de almacén; alegatos presentados, en espera de sentencia.',
  },
  {
    ...TENENCIA,
    id: 'LIT-2026-0012',
    cliente: 'Grupo Altiplano, S.A. de C.V.',
    contraparte: 'Ex proveedor de logística',
    practica: 'penal',
    expediente: 'CI-2026-8812',
    juzgado: 'Fiscalía General del Estado de México',
    etapa: 'intake',
    abogado: 'A. Mendoza',
    riesgo: 'medio',
    proximaActuacion: null,
    diasParaActuacion: null,
    resumen:
      'Querella por fraude en facturación de servicios; carpeta de investigación por integrar.',
  },
]

const EVENTOS_AGENDA: EventoAgenda[] = [
  {
    ...TENENCIA,
    id: 'AGE-001',
    dia: diaDelMes(1),
    fecha: fechaDeDia(diaDelMes(1)),
    hora: '10:00',
    tipo: 'vencimiento',
    titulo: 'Vence contestación a ampliación — Constructora Meseta',
    casoId: 'LIT-2026-0010',
    cliente: 'Constructora Meseta, S.A. de C.V.',
    abogado: 'C. Fuentes',
    riesgo: 'alto',
  },
  {
    ...TENENCIA,
    id: 'AGE-002',
    dia: diaDelMes(2),
    fecha: fechaDeDia(diaDelMes(2)),
    hora: '09:30',
    tipo: 'audiencia',
    titulo: 'Audiencia de pruebas — Manufacturas Roble',
    casoId: 'LIT-2026-0001',
    cliente: 'Manufacturas Roble, S.A. de C.V.',
    abogado: 'R. Ibarra',
    riesgo: 'alto',
  },
  {
    ...TENENCIA,
    id: 'AGE-003',
    dia: diaDelMes(4),
    fecha: fechaDeDia(diaDelMes(4)),
    hora: '12:00',
    tipo: 'audiencia',
    titulo: 'Desahogo de pericial contable — Aceros del Norte',
    casoId: 'LIT-2026-0004',
    cliente: 'Aceros del Norte, S.A. de C.V.',
    abogado: 'A. Mendoza',
    riesgo: 'medio',
  },
  {
    ...TENENCIA,
    id: 'AGE-004',
    dia: diaDelMes(6),
    fecha: fechaDeDia(diaDelMes(6)),
    hora: '17:00',
    tipo: 'vencimiento',
    titulo: 'Decisión arbitraje vs. vía judicial — Grupo Vitral',
    casoId: 'LIT-2026-0005',
    cliente: 'Grupo Vitral, S.A. de C.V.',
    abogado: 'A. Mendoza',
    riesgo: 'medio',
  },
  {
    ...TENENCIA,
    id: 'AGE-005',
    dia: diaDelMes(-3),
    fecha: fechaDeDia(diaDelMes(-3)),
    hora: '11:00',
    tipo: 'promocion',
    titulo: 'Presentada promoción de alegatos — Farmacéutica Norte',
    casoId: 'LIT-2026-0011',
    cliente: 'Distribuidora Farmacéutica Norte, S.A.',
    abogado: 'R. Ibarra',
  },
  {
    ...TENENCIA,
    id: 'AGE-006',
    dia: diaDelMes(9),
    fecha: fechaDeDia(diaDelMes(9)),
    hora: '10:00',
    tipo: 'audiencia',
    titulo: 'Conciliación prejudicial — Transportes Sierra',
    casoId: 'LIT-2026-0002',
    cliente: 'Transportes Sierra, S.A. de C.V.',
    abogado: 'C. Fuentes',
  },
  {
    ...TENENCIA,
    id: 'AGE-007',
    dia: diaDelMes(11),
    fecha: fechaDeDia(diaDelMes(11)),
    hora: '13:30',
    tipo: 'audiencia',
    titulo: 'Testimoniales — Inmobiliaria Cumbres',
    casoId: 'LIT-2026-0008',
    cliente: 'Inmobiliaria Cumbres, S.A. de C.V.',
    abogado: 'L. Serrano',
  },
  {
    ...TENENCIA,
    id: 'AGE-008',
    dia: diaDelMes(13),
    fecha: fechaDeDia(diaDelMes(13)),
    hora: '09:00',
    tipo: 'promocion',
    titulo: 'Promoción de cierre — Financiera Camino',
    casoId: 'LIT-2026-0006',
    cliente: 'Financiera Camino, S.A. de C.V., SOFOM',
    abogado: 'C. Fuentes',
  },
  {
    ...TENENCIA,
    id: 'AGE-009',
    dia: diaDelMes(15),
    fecha: fechaDeDia(diaDelMes(15)),
    hora: '16:00',
    tipo: 'vencimiento',
    titulo: 'Término probatorio — Aceros del Norte',
    casoId: 'LIT-2026-0004',
    cliente: 'Aceros del Norte, S.A. de C.V.',
    abogado: 'A. Mendoza',
    riesgo: 'medio',
  },
  {
    ...TENENCIA,
    id: 'AGE-010',
    dia: diaDelMes(18),
    fecha: fechaDeDia(diaDelMes(18)),
    hora: '10:30',
    tipo: 'audiencia',
    titulo: 'Junta de herederos — Sucesión García Peña',
    casoId: 'LIT-2026-0009',
    cliente: 'Sucesión testamentaria García Peña',
    abogado: 'L. Serrano',
  },
]

export const AGENDA_MES: AgendaMes = {
  anio: ANIO,
  mes: MES,
  nombreMes: NOMBRE_MES,
  diaActual: DIA_HOY,
  eventos: EVENTOS_AGENDA,
}

export const CHECKLISTS_CASOS: ChecklistCaso[] = [
  {
    ...TENENCIA,
    id: 'CHK-001',
    casoId: 'LIT-2026-0001',
    cliente: 'Manufacturas Roble, S.A. de C.V.',
    plantilla: 'Juicio laboral individual/colectivo',
    practica: 'laboral',
    tareas: [
      {
        id: 'CHK-001-1',
        tarea: 'Contestación de demanda presentada',
        responsable: 'R. Ibarra',
        estado: 'completada',
        obligatoria: true,
      },
      {
        id: 'CHK-001-2',
        tarea: 'Ofrecimiento de pruebas integrado',
        responsable: 'R. Ibarra',
        estado: 'completada',
        obligatoria: true,
      },
      {
        id: 'CHK-001-3',
        tarea: 'Preparación de testigos (2 de 4)',
        responsable: 'Pasante — D. Olivares',
        estado: 'en_curso',
        obligatoria: true,
      },
      {
        id: 'CHK-001-4',
        tarea: 'Expediente laboral del cliente certificado',
        responsable: 'Paralegal — S. Nava',
        estado: 'en_curso',
        obligatoria: true,
      },
      {
        id: 'CHK-001-5',
        tarea: 'Cálculo actualizado de contingencia',
        responsable: 'Área contable',
        estado: 'pendiente',
        obligatoria: false,
      },
    ],
  },
  {
    ...TENENCIA,
    id: 'CHK-002',
    casoId: 'LIT-2026-0004',
    cliente: 'Aceros del Norte, S.A. de C.V.',
    plantilla: 'Juicio ejecutivo mercantil',
    practica: 'mercantil',
    tareas: [
      {
        id: 'CHK-002-1',
        tarea: 'Pagarés originales cotejados y resguardados',
        responsable: 'Paralegal — S. Nava',
        estado: 'completada',
        obligatoria: true,
      },
      {
        id: 'CHK-002-2',
        tarea: 'Demanda ejecutiva admitida',
        responsable: 'A. Mendoza',
        estado: 'completada',
        obligatoria: true,
      },
      {
        id: 'CHK-002-3',
        tarea: 'Embargo trabado sobre cuentas',
        responsable: 'Actuario / A. Mendoza',
        estado: 'completada',
        obligatoria: true,
      },
      {
        id: 'CHK-002-4',
        tarea: 'Cuestionario para pericial contable',
        responsable: 'A. Mendoza',
        estado: 'en_curso',
        obligatoria: true,
      },
      {
        id: 'CHK-002-5',
        tarea: 'Certificado de gravamen actualizado',
        responsable: 'Paralegal — S. Nava',
        estado: 'pendiente',
        obligatoria: false,
      },
    ],
  },
]

export const COMUNICACIONES_CASOS: ComunicacionCaso[] = [
  {
    ...TENENCIA,
    casoId: 'LIT-2026-0001',
    cliente: 'Manufacturas Roble, S.A. de C.V.',
    abogado: 'R. Ibarra',
    mensajes: [
      {
        id: 'MSG-001',
        fecha: fechaEnDias(-6),
        autor: 'despacho',
        texto:
          'Se presentó el ofrecimiento de pruebas dentro del término. Adjuntamos acuse.',
        estado: 'enviado',
      },
      {
        id: 'MSG-002',
        fecha: fechaEnDias(-5),
        autor: 'cliente',
        texto: '¿Necesitan algo de nuestra parte para la audiencia?',
        estado: 'enviado',
      },
      {
        id: 'MSG-003',
        fecha: fechaEnDias(0),
        autor: 'hermes',
        texto:
          'Recordatorio de audiencia de pruebas en 2 días (10:00, Tribunal Laboral Federal de Saltillo). Se requiere la asistencia de los 2 testigos confirmados; el despacho enviará la logística hoy.',
        estado: 'sugerido',
      },
    ],
  },
  {
    ...TENENCIA,
    casoId: 'LIT-2026-0004',
    cliente: 'Aceros del Norte, S.A. de C.V.',
    abogado: 'A. Mendoza',
    mensajes: [
      {
        id: 'MSG-004',
        fecha: fechaEnDias(-10),
        autor: 'despacho',
        texto:
          'El juzgado admitió la pericial contable. El perito de la contraparte tiene 10 días para rendir dictamen.',
        estado: 'enviado',
      },
      {
        id: 'MSG-005',
        fecha: fechaEnDias(-1),
        autor: 'hermes',
        texto:
          'Actualización quincenal del caso: pericial en desahogo, término probatorio vence este mes. Sin acciones requeridas del cliente por ahora.',
        estado: 'sugerido',
      },
    ],
  },
  {
    ...TENENCIA,
    casoId: 'LIT-2026-0010',
    cliente: 'Constructora Meseta, S.A. de C.V.',
    abogado: 'C. Fuentes',
    mensajes: [
      {
        id: 'MSG-006',
        fecha: fechaEnDias(-4),
        autor: 'despacho',
        texto:
          'Recibimos la ampliación de demanda del Ayuntamiento. Preparamos contestación; el término vence en breve.',
        estado: 'enviado',
      },
      {
        id: 'MSG-007',
        fecha: fechaEnDias(-3),
        autor: 'cliente',
        texto: 'Enviamos las bitácoras de obra que faltaban. Confirmen recepción.',
        estado: 'enviado',
      },
      {
        id: 'MSG-008',
        fecha: fechaEnDias(0),
        autor: 'hermes',
        texto:
          'Confirmación de recepción de bitácoras (23 archivos) e integración al expediente TCA-455/2025. La contestación se presenta mañana antes de las 10:00.',
        estado: 'sugerido',
      },
    ],
  },
]
