// Agendamiento: contratos del dominio (SPEC §19). Doctrina transversal del
// copilot: estados DERIVADOS o gobernados por máquina explícita (nunca fijados
// a mano), procedencia visible, y multi-tenant desde el día 1 aunque el mock
// opere un solo tenant.

/** Duplicado deliberado de pre-discovery/types.ts (no acoplar features). */
export interface Procedencia {
  metodo: 'observado' | 'inferido' | 'mock'
  fuente: string
  modelo?: string
}

export const TENANT_DEFAULT = 'a2a'

/** Antelación mínima (horas) para que el cliente reprograme una cita confirmada. */
export const REPROGRAMAR_HORAS_MIN = 24
/** Reintentos máximos del notificador antes de rendirse (contrato del host-job). */
export const INTENTOS_MAX = 3

export type TipoAsesor = 'humano' | 'ia'

export interface Asesor {
  id: string
  slug: string // usado en /reservar/[slug]
  tenantId: string
  tipo: TipoAsesor
  nombre: string
  especialidad: string
  idiomas: string[]
  rating: number | null // 0–5; null = sin datos (p. ej. asesor IA nuevo)
  bio: string
  zonaHoraria: string // IANA, p. ej. 'America/Mexico_City'
  duracionDefaultMin: 30 | 45 | 60
  bufferMin: number
  activo: boolean
  avatarIniciales: string
}

export interface FranjaDia {
  inicio: string // 'HH:MM' en la TZ del asesor
  fin: string
}

export interface ReglaDia {
  dia: 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = domingo (getUTCDay)
  franjas: FranjaDia[]
}

export interface DisponibilidadSemanal {
  asesorId: string
  reglas: ReglaDia[]
}

export interface Excepcion {
  id: string
  asesorId: string
  tipo: 'bloqueo' | 'vacaciones'
  desde: string // ISO UTC
  hasta: string
  motivo: string
}

export type SessionDepth = 'quick' | 'discovery'
export type PagoEstado = 'no_requerido' | 'pendiente' | 'pagado'

export interface Servicio {
  id: string
  slug: string
  tenantId: string
  nombre: string
  descripcion: string
  precioCentavos: number
  moneda: 'MXN' | 'USD'
  duracionMin: 30 | 45 | 60
  sessionDepth: SessionDepth
  requierePago: boolean
  activo: boolean
  orden: number
}

export interface RespuestaDiscovery {
  pregunta: string
  respuesta: string
}

export type EstadoCita =
  | 'solicitada'
  | 'aprobada'
  | 'rechazada'
  | 'confirmada'
  | 'en_curso'
  | 'completada'
  | 'cancelada'
  | 'no_show'

export type ActorCita = 'cliente' | 'asesor' | 'sistema_notificador' | 'sistema_ia'

export type EventoCita =
  | 'crear'
  | 'aprobar'
  | 'reasignar'
  | 'rechazar'
  | 'confirmar'
  | 'iniciar'
  | 'completar'
  | 'cancelar'
  | 'marcar_no_show'
  | 'reprogramar'
  // Eventos de auditoría: registran en historial SIN cambiar el estado.
  | 'llamada_iniciada'
  | 'fallo_notificacion'
  | 'lectura_brief_ia'

export interface TransicionCita {
  de: EstadoCita | null // null = creación
  a: EstadoCita
  evento: EventoCita
  actor: ActorCita
  at: string
  detalle?: string
}

export interface ParticipanteCita {
  nombre: string
  email?: string
}

export interface Cita {
  id: string
  tenantId: string
  asesorId: string
  servicioId: string | null
  cliente: { nombre: string; email: string; telefono: string }
  /** Multi-persona del lado cliente (la UI MVP maneja uno; el dominio ya lo admite). */
  participantes?: ParticipanteCita[]
  inicio: string // ISO UTC
  fin: string
  estado: EstadoCita
  sessionDepth: SessionDepth
  pagoEstado: PagoEstado // dimensión PARALELA al estado (el pago no es ciclo de vida)
  brief: RespuestaDiscovery[] | null
  /** Resumen IA del brief para la prep del asesor (consumidor: bandeja M2/PrepAsesor). */
  resumenIaBrief: string | null
  leadId: string | null // liga suave a leads.lead_id (seam CRM por host-job)
  origen: 'reserva_publica' | 'manual'
  reasignadaDeAsesorId: string | null
  historial: TransicionCita[]
  procedencia: Procedencia
  creadaAt: string
}

export interface SolicitudReserva {
  slug: string
  asesorId: string
  servicioId: string | null
  inicio: string // ISO UTC
  cliente: { nombre: string; email: string; telefono: string }
  sessionDepth: SessionDepth
  brief: RespuestaDiscovery[] | null
  token: string | null
}

export type PlantillaNotificacion = 'confirmacion_cita' | 'reasignacion' | 'rechazo' | 'cancelacion'

export interface NotificacionPendiente {
  /** `${citaId}:${canal}:${plantilla}` — clave de IDEMPOTENCIA (espejo del unique de agenda_notificaciones). */
  id: string
  citaId: string
  canal: 'email' | 'whatsapp'
  plantilla: PlantillaNotificacion
  destinatario: string
  cuerpo: string
  estado: 'pendiente' | 'enviada' | 'error'
  intentos: number
  procedencia: Procedencia
  creadaAt: string
  enviadaAt: string | null
}

export interface EnlaceReserva {
  token: string // id opaco en mock; token firmado server-side al conectar Supabase
  tenantId: string
  asesorId: string | null
  servicioId: string | null
  clientePrecargado: Partial<Cita['cliente']> | null
  usosMax: number
  usos: number
  expiraAt: string
}

export interface Slot {
  inicio: string // ISO UTC
  fin: string
  disponible: boolean
  motivo?: 'ocupado' | 'excepcion' | 'fuera_de_franja' | 'pasado'
}

// ─── Máquina de estados ─────────────────────────────────────────────────────
// solicitada→solicitada = reasignación o reprogramación: la cita sigue VIVA
// esperando decisión del (nuevo) asesor; "reasignada"/"reprogramada" son
// eventos auditables del historial, no estados terminales zombis.

export const TRANSICIONES_CITA: Record<EstadoCita, EstadoCita[]> = {
  solicitada: ['aprobada', 'rechazada', 'solicitada'],
  aprobada: ['confirmada', 'cancelada'],
  rechazada: [],
  confirmada: ['en_curso', 'cancelada', 'no_show', 'solicitada'], // →solicitada SOLO vía reprogramar
  en_curso: ['completada', 'cancelada'],
  completada: [],
  cancelada: [],
  no_show: [],
}

/** Estado destino de cada evento; null = evento de auditoría (no cambia estado). */
export const ESTADO_POR_EVENTO: Record<EventoCita, EstadoCita | null> = {
  crear: 'solicitada',
  aprobar: 'aprobada',
  reasignar: 'solicitada',
  rechazar: 'rechazada',
  confirmar: 'confirmada',
  iniciar: 'en_curso',
  completar: 'completada',
  cancelar: 'cancelada',
  marcar_no_show: 'no_show',
  reprogramar: 'solicitada',
  llamada_iniciada: null,
  fallo_notificacion: null,
  lectura_brief_ia: null,
}

export function puedeTransicionar(de: EstadoCita, a: EstadoCita): boolean {
  return TRANSICIONES_CITA[de].includes(a)
}

export type ResultadoTransicion = { ok: true; cita: Cita } | { ok: false; motivo: string }

/** Única puerta de cambio de estado: valida máquina + regla ortogonal de pago
 *  y SIEMPRE deja rastro en historial. Los fixtures construyen sus estados con
 *  esta función — jamás a mano. */
export function aplicarTransicion(
  cita: Cita,
  evento: EventoCita,
  actor: ActorCita,
  at: string,
  detalle?: string
): ResultadoTransicion {
  const destino = ESTADO_POR_EVENTO[evento]
  const transicion: TransicionCita = { de: cita.estado, a: destino ?? cita.estado, evento, actor, at, detalle }

  if (destino === null) {
    return { ok: true, cita: { ...cita, historial: [...cita.historial, transicion] } }
  }
  if (!puedeTransicionar(cita.estado, destino)) {
    return { ok: false, motivo: `Transición inválida: ${cita.estado} → ${destino} (evento ${evento}).` }
  }
  if (evento === 'aprobar' && cita.pagoEstado === 'pendiente') {
    return { ok: false, motivo: 'La cita tiene pago pendiente: no puede aprobarse hasta registrarse el pago.' }
  }
  if (cita.estado === 'confirmada' && destino === 'solicitada' && evento !== 'reprogramar') {
    return { ok: false, motivo: 'confirmada → solicitada solo es válida vía reprogramación.' }
  }
  return { ok: true, cita: { ...cita, estado: destino, historial: [...cita.historial, transicion] } }
}

// ─── Etiquetas UI ───────────────────────────────────────────────────────────
// La consigna de negocio nombra 6 etiquetas; los 8 estados internos se
// PROYECTAN a esas etiquetas (+ Rechazada). El estado interno manda.

export const ETIQUETA_ESTADO_CITA: Record<EstadoCita, string> = {
  solicitada: 'Agendada',
  aprobada: 'Agendada',
  rechazada: 'Rechazada',
  confirmada: 'Confirmada',
  en_curso: 'En curso',
  completada: 'Completada',
  cancelada: 'Cancelada',
  no_show: 'No show',
}

export const ETIQUETA_DEPTH: Record<SessionDepth, string> = {
  quick: 'Rápida',
  discovery: 'Discovery',
}

export const ETIQUETA_TIPO_ASESOR: Record<TipoAsesor, string> = {
  humano: 'Humano',
  ia: 'IA',
}
