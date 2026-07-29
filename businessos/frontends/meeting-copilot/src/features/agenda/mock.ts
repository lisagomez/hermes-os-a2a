// Provider mock DETERMINISTA de agendamiento (mismo input → mismo output).
// Doctrina pre-discovery: timestamp fijo, el mock nunca reclama confianza alta,
// y los estados de cita se construyen APLICANDO transiciones — jamás a mano.

import type {
  Asesor,
  Cita,
  DisponibilidadSemanal,
  EnlaceReserva,
  Excepcion,
  NotificacionPendiente,
  Procedencia,
  Servicio,
  SolicitudReserva,
} from './types'
import { TENANT_DEFAULT, aplicarTransicion } from './types'
import { construirNotificaciones } from './notificaciones'

export const AHORA_FIJO = '2026-07-27T15:00:00.000Z' // determinista (fixtures estables)

export const PROCEDENCIA_MOCK: Procedencia = { metodo: 'mock', fuente: 'fixture demo agenda' }

// ─── Asesores: humanos e IA como entidades del MISMO tipo ──────────────────

export function mockAsesores(): Asesor[] {
  const base = { tenantId: TENANT_DEFAULT, activo: true } as const
  return [
    { ...base, id: 'asesor-ana', slug: 'ana-torres', tipo: 'humano', nombre: 'Ana Torres', especialidad: 'Discovery B2B y automatización', idiomas: ['es', 'en'], rating: 4.8, bio: 'Asesora senior; 200+ sesiones de discovery en manufactura y logística.', zonaHoraria: 'America/Mexico_City', duracionDefaultMin: 45, bufferMin: 10, avatarIniciales: 'AT' },
    { ...base, id: 'asesor-luis', slug: 'luis-mendez', tipo: 'humano', nombre: 'Luis Méndez', especialidad: 'Integraciones y stack técnico', idiomas: ['es'], rating: 4.6, bio: 'Preventa técnica; traduce requisitos a arquitectura.', zonaHoraria: 'America/Mexico_City', duracionDefaultMin: 60, bufferMin: 15, avatarIniciales: 'LM' },
    { ...base, id: 'asesor-carla', slug: 'carla-rios', tipo: 'humano', nombre: 'Carla Ríos', especialidad: 'Cumplimiento y marco regulatorio', idiomas: ['es', 'en'], rating: 4.9, bio: 'Especialista regulatoria MX/CO; trabaja con el grafo de la casa.', zonaHoraria: 'America/Bogota', duracionDefaultMin: 45, bufferMin: 10, avatarIniciales: 'CR' },
    { ...base, id: 'asesor-diego', slug: 'diego-paz', tipo: 'humano', nombre: 'Diego Paz', especialidad: 'Onboarding y adopción', idiomas: ['es'], rating: null, bio: 'Se integró este mes; agenda en construcción.', zonaHoraria: 'America/Mexico_City', duracionDefaultMin: 30, bufferMin: 10, avatarIniciales: 'DP' },
    { ...base, id: 'asesor-hermes', slug: 'hermes-discovery', tipo: 'ia', nombre: 'Hermes Discovery', especialidad: 'Pre-discovery guiado 24/7', idiomas: ['es', 'en'], rating: 4.4, bio: 'Agente IA de la casa: sesiones exploratorias sin espera; escala a humano cuando detecta complejidad.', zonaHoraria: 'America/Mexico_City', duracionDefaultMin: 30, bufferMin: 0, avatarIniciales: 'HD' },
    { ...base, id: 'asesor-hermes-tech', slug: 'hermes-tecnico', tipo: 'ia', nombre: 'Hermes Técnico', especialidad: 'Diagnóstico de stack 24/7', idiomas: ['es', 'en'], rating: null, bio: 'Agente IA: escaneo tecnológico declarado vs esperado, en cualquier horario.', zonaHoraria: 'America/Mexico_City', duracionDefaultMin: 30, bufferMin: 0, avatarIniciales: 'HT' },
  ]
}

export function mockDisponibilidad(asesorId: string): DisponibilidadSemanal {
  // IA: 7 días, jornada completa. Humanos: L–V con franjas distintas por persona.
  const ia = asesorId.startsWith('asesor-hermes')
  if (ia) {
    return { asesorId, reglas: [0, 1, 2, 3, 4, 5, 6].map((dia) => ({ dia: dia as 0 | 1 | 2 | 3 | 4 | 5 | 6, franjas: [{ inicio: '00:00', fin: '23:30' }] })) }
  }
  const franjasPorAsesor: Record<string, { inicio: string; fin: string }[]> = {
    'asesor-ana': [{ inicio: '09:00', fin: '13:00' }, { inicio: '15:00', fin: '18:00' }],
    'asesor-luis': [{ inicio: '10:00', fin: '14:00' }],
    'asesor-carla': [{ inicio: '08:00', fin: '12:00' }, { inicio: '14:00', fin: '17:00' }],
    'asesor-diego': [], // agenda en construcción → semáforo 'sin_agenda' honesto
  }
  const franjas = franjasPorAsesor[asesorId] ?? []
  return { asesorId, reglas: [1, 2, 3, 4, 5].map((dia) => ({ dia: dia as 1 | 2 | 3 | 4 | 5, franjas })) }
}

export function mockExcepciones(): Excepcion[] {
  return [
    {
      id: 'exc-ana-1',
      asesorId: 'asesor-ana',
      tipo: 'bloqueo',
      desde: '2026-07-29T15:00:00.000Z',
      hasta: '2026-07-29T19:00:00.000Z',
      motivo: 'Comité interno',
    },
    {
      id: 'exc-carla-1',
      asesorId: 'asesor-carla',
      tipo: 'vacaciones',
      desde: '2026-08-10T00:00:00.000Z',
      hasta: '2026-08-15T00:00:00.000Z',
      motivo: 'Vacaciones',
    },
  ]
}

// ─── Servicios (marketplace) ────────────────────────────────────────────────

export function mockServicios(): Servicio[] {
  const base = { tenantId: TENANT_DEFAULT, activo: true } as const
  return [
    { ...base, id: 'srv-diagnostico', slug: 'diagnostico-express', nombre: 'Diagnóstico express', descripcion: 'Revisión rápida de tu operación y 3 oportunidades accionables.', precioCentavos: 0, moneda: 'MXN', duracionMin: 30, sessionDepth: 'quick', requierePago: false, orden: 1 },
    { ...base, id: 'srv-demo', slug: 'demo-producto', nombre: 'Demo de producto', descripcion: 'Recorrido guiado del copiloto con tus casos de uso.', precioCentavos: 0, moneda: 'MXN', duracionMin: 45, sessionDepth: 'quick', requierePago: false, orden: 2 },
    { ...base, id: 'srv-auditoria', slug: 'auditoria-stack', nombre: 'Auditoría de stack', descripcion: 'Escaneo tecnológico declarado vs esperado con reporte.', precioCentavos: 250000, moneda: 'MXN', duracionMin: 60, sessionDepth: 'quick', requierePago: true, orden: 3 },
    { ...base, id: 'srv-discovery', slug: 'discovery-profundo', nombre: 'Discovery profundo', descripcion: 'Sesión parametrizada: tu contexto alimenta el brief del asesor antes de la llamada.', precioCentavos: 0, moneda: 'MXN', duracionMin: 60, sessionDepth: 'discovery', requierePago: false, orden: 4 },
  ]
}

// ─── Citas demo: estados construidos POR TRANSICIONES ───────────────────────

export function crearCitaBase(solicitud: SolicitudReserva, id: string, at: string, procedencia: Procedencia): Cita {
  const cita: Cita = {
    id,
    tenantId: TENANT_DEFAULT,
    asesorId: solicitud.asesorId,
    servicioId: solicitud.servicioId,
    cliente: solicitud.cliente,
    inicio: solicitud.inicio,
    fin: solicitud.inicio, // el llamador la ajusta con la duración real
    estado: 'solicitada',
    sessionDepth: solicitud.sessionDepth,
    pagoEstado: 'no_requerido',
    brief: solicitud.brief,
    resumenIaBrief: null,
    leadId: null,
    origen: 'reserva_publica',
    reasignadaDeAsesorId: null,
    historial: [{ de: null, a: 'solicitada', evento: 'crear', actor: 'cliente', at }],
    procedencia,
    creadaAt: at,
  }
  return cita
}

interface SemillaCita {
  id: string
  asesorId: string
  servicioId: string | null
  cliente: { nombre: string; email: string; telefono: string }
  inicio: string
  duracionMin: number
  sessionDepth: 'quick' | 'discovery'
  brief?: Cita['brief']
  pagoEstado?: Cita['pagoEstado']
  leadId?: string
  eventos: Array<{ evento: Parameters<typeof aplicarTransicion>[1]; actor: Parameters<typeof aplicarTransicion>[2]; detalle?: string }>
}

function construirCitaDemo(s: SemillaCita): Cita {
  let cita = crearCitaBase(
    { slug: '', asesorId: s.asesorId, servicioId: s.servicioId, inicio: s.inicio, cliente: s.cliente, sessionDepth: s.sessionDepth, brief: s.brief ?? null, token: null },
    s.id,
    AHORA_FIJO,
    PROCEDENCIA_MOCK
  )
  cita = { ...cita, fin: new Date(new Date(s.inicio).getTime() + s.duracionMin * 60_000).toISOString(), pagoEstado: s.pagoEstado ?? 'no_requerido', leadId: s.leadId ?? null }
  for (const e of s.eventos) {
    const r = aplicarTransicion(cita, e.evento, e.actor, AHORA_FIJO, e.detalle)
    if (!r.ok) throw new Error(`Fixture inválido (${s.id}): ${r.motivo}`) // un demo que viola la máquina es un bug, no un dato
    cita = r.cita
  }
  return cita
}

export function mockCitas(): Cita[] {
  return [
    // solicitada (en bandeja de Ana; discovery con brief)
    construirCitaDemo({
      id: 'cita-demo-solicitada',
      asesorId: 'asesor-ana',
      servicioId: 'srv-discovery',
      cliente: { nombre: 'Marta Villa', email: 'marta@ejemplo.mx', telefono: '525511112222' },
      inicio: '2026-07-30T16:00:00.000Z',
      duracionMin: 60,
      sessionDepth: 'discovery',
      brief: [
        { pregunta: '¿Cuál es el giro del negocio?', respuesta: 'Logística de exportación, 40 empleados.' },
        { pregunta: '¿Qué objetivo persigues con la sesión?', respuesta: 'Automatizar seguimiento de embarques.' },
        { pregunta: '¿Qué tan urgente es?', respuesta: 'Este trimestre.' },
      ],
      leadId: 'lead-gal-mexico',
      eventos: [],
    }),
    // solicitada con pago pendiente (bloquea aprobar — se ve el candado en la bandeja)
    construirCitaDemo({
      id: 'cita-demo-pago',
      asesorId: 'asesor-luis',
      servicioId: 'srv-auditoria',
      cliente: { nombre: 'Rodrigo Sala', email: 'rodrigo@ejemplo.mx', telefono: '525533334444' },
      inicio: '2026-07-31T17:00:00.000Z',
      duracionMin: 60,
      sessionDepth: 'quick',
      pagoEstado: 'pendiente',
      eventos: [],
    }),
    // aprobada (el notificador aún no corre — ventana real del host-job)
    construirCitaDemo({
      id: 'cita-demo-aprobada',
      asesorId: 'asesor-carla',
      servicioId: 'srv-diagnostico',
      cliente: { nombre: 'Elena Fuentes', email: 'elena@ejemplo.mx', telefono: '573001112233' },
      inicio: '2026-07-30T14:00:00.000Z',
      duracionMin: 30,
      sessionDepth: 'quick',
      eventos: [{ evento: 'aprobar', actor: 'asesor' }],
    }),
    // confirmada (reasignada de Diego a Ana en su historial)
    construirCitaDemo({
      id: 'cita-demo-confirmada',
      asesorId: 'asesor-ana',
      servicioId: 'srv-demo',
      cliente: { nombre: 'Pablo Iglesias', email: 'pablo@ejemplo.mx', telefono: '525555556666' },
      inicio: '2026-07-31T16:00:00.000Z',
      duracionMin: 45,
      sessionDepth: 'quick',
      eventos: [
        { evento: 'reasignar', actor: 'asesor', detalle: 'reasignada de asesor-diego a asesor-ana' },
        { evento: 'aprobar', actor: 'asesor' },
        { evento: 'confirmar', actor: 'sistema_notificador' },
      ],
    }),
    // en_curso
    construirCitaDemo({
      id: 'cita-demo-encurso',
      asesorId: 'asesor-hermes',
      servicioId: 'srv-diagnostico',
      cliente: { nombre: 'Sofía Beltrán', email: 'sofia@ejemplo.mx', telefono: '525577778888' },
      inicio: '2026-07-27T14:30:00.000Z',
      duracionMin: 30,
      sessionDepth: 'quick',
      eventos: [
        { evento: 'aprobar', actor: 'asesor' },
        { evento: 'confirmar', actor: 'sistema_notificador' },
        { evento: 'iniciar', actor: 'asesor' },
      ],
    }),
    // completada (con llamada registrada)
    construirCitaDemo({
      id: 'cita-demo-completada',
      asesorId: 'asesor-luis',
      servicioId: 'srv-demo',
      cliente: { nombre: 'Iván Cortés', email: 'ivan@ejemplo.mx', telefono: '525599990000' },
      inicio: '2026-07-24T16:00:00.000Z',
      duracionMin: 45,
      sessionDepth: 'quick',
      eventos: [
        { evento: 'aprobar', actor: 'asesor' },
        { evento: 'confirmar', actor: 'sistema_notificador' },
        { evento: 'iniciar', actor: 'asesor' },
        { evento: 'llamada_iniciada', actor: 'asesor', detalle: 'tel: desde tablero' },
        { evento: 'completar', actor: 'asesor' },
      ],
    }),
    // cancelada
    construirCitaDemo({
      id: 'cita-demo-cancelada',
      asesorId: 'asesor-ana',
      servicioId: 'srv-diagnostico',
      cliente: { nombre: 'Nadia Prieto', email: 'nadia@ejemplo.mx', telefono: '525510102020' },
      inicio: '2026-07-23T15:00:00.000Z',
      duracionMin: 30,
      sessionDepth: 'quick',
      eventos: [
        { evento: 'aprobar', actor: 'asesor' },
        { evento: 'confirmar', actor: 'sistema_notificador' },
        { evento: 'cancelar', actor: 'cliente', detalle: 'cliente canceló por agenda' },
      ],
    }),
    // no_show
    construirCitaDemo({
      id: 'cita-demo-noshow',
      asesorId: 'asesor-carla',
      servicioId: 'srv-demo',
      cliente: { nombre: 'Óscar Lima', email: 'oscar@ejemplo.mx', telefono: '573004445566' },
      inicio: '2026-07-22T13:00:00.000Z',
      duracionMin: 45,
      sessionDepth: 'quick',
      eventos: [
        { evento: 'aprobar', actor: 'asesor' },
        { evento: 'confirmar', actor: 'sistema_notificador' },
        { evento: 'marcar_no_show', actor: 'asesor' },
      ],
    }),
    // rechazada
    construirCitaDemo({
      id: 'cita-demo-rechazada',
      asesorId: 'asesor-luis',
      servicioId: null,
      cliente: { nombre: 'Tania Robles', email: 'tania@ejemplo.mx', telefono: '525530304040' },
      inicio: '2026-07-25T11:00:00.000Z',
      duracionMin: 60,
      sessionDepth: 'quick',
      eventos: [{ evento: 'rechazar', actor: 'asesor', detalle: 'horario fuera de disponibilidad real' }],
    }),
  ]
}

/** Notificaciones demo: derivadas de la cita confirmada con el MISMO constructor
 *  del pipeline (fidelidad por construcción) y marcadas como enviadas por el
 *  "host-job" mock. */
export function mockNotificaciones(): NotificacionPendiente[] {
  const confirmada = mockCitas().find((c) => c.id === 'cita-demo-confirmada')
  const ana = mockAsesores().find((a) => a.id === 'asesor-ana')
  if (!confirmada || !ana) return []
  return construirNotificaciones(confirmada, ana, 'confirmacion_cita', AHORA_FIJO, PROCEDENCIA_MOCK).map((n) => ({
    ...n,
    estado: 'enviada' as const,
    intentos: 1,
    enviadaAt: AHORA_FIJO,
  }))
}

export function mockEnlaces(): EnlaceReserva[] {
  return [
    {
      token: 'rsv-demo',
      tenantId: TENANT_DEFAULT,
      asesorId: 'asesor-ana',
      servicioId: 'srv-diagnostico',
      clientePrecargado: { nombre: 'Marta Villa', email: 'marta@ejemplo.mx', telefono: '525511112222' },
      usosMax: 1,
      usos: 0,
      expiraAt: '2026-12-31T00:00:00.000Z',
    },
  ]
}
