// Buzón institucional operado por agentes (SPEC-buzon-a2a §2, §3, §4; espejo de
// supabase-buzon.sql). Doctrina transversal del copilot: estados DERIVADOS o
// gobernados por máquina explícita (nunca fijados a mano), procedencia visible,
// aprobación humana OBLIGATORIA (A5) antes de todo envío.

export type Proveedor = 'm365' | 'google' | 'imap'
export type ModoContraparte = 'cerrado' | 'abierto_cuarentena' | 'abierto'
export type RolAprobador = 'PM' | 'CEO' | 'CFO'

// ─── Onboarding del cliente (SPEC §11) ──────────────────────────────────────

/** Máquina de estados de la experiencia de configuración (SPEC §11.1). La
 *  transición borrador→...→activo vive en onboarding.ts (aplicarTransicionBuzon);
 *  este union es el campo persistido `estado`. */
export type EstadoBuzon = 'borrador' | 'configurando' | 'espejo' | 'listo' | 'activo' | 'pausado' | 'desconectado'

export type CanalAprobacion = 'telegram' | 'slack' | 'panel'

/** Las 5 plantillas de §11.3 — catálogo completo en plantillas.ts. `null` =
 *  configuración personalizada ("Personalizar" en texto secundario). */
export type PlantillaBuzon = 'ventas' | 'reclutamiento' | 'soporte' | 'asesor_humano' | 'legal_finanzas'

export const ETIQUETA_ESTADO_BUZON: Record<EstadoBuzon, string> = {
  borrador: 'Borrador',
  configurando: 'Configurando',
  espejo: 'Modo espejo',
  listo: 'Listo para activar',
  activo: 'Activo',
  pausado: 'Pausado',
  desconectado: 'Desconectado',
}

export interface Buzon {
  id: string
  direccion: string
  proveedor: Proveedor
  modoContraparte: ModoContraparte
  clasesPermitidas: string[]
  cuotaHora: number
  cuotaHilo: number
  aprobadorRol: RolAprobador
  activo: boolean
  /** Obligatorio si modoContraparte === 'abierto' (SGSI): quién asumió el riesgo. */
  riesgoFirmadoPor?: string
  riesgoFirmadoEn?: string

  // ── §11: experiencia de configuración del cliente ──
  estado: EstadoBuzon
  /** null = configuración personalizada (no partió de una de las 5 plantillas). */
  plantilla: PlantillaBuzon | null
  /** ISO. Se fija al entrar a `espejo`; gate de `puedeListo` (onboarding.ts). */
  espejoDesde: string | null
  /** Firma de A5 exigida por la máquina para listo→activo. */
  activadoPor: string | null
  activadoEn: string | null
  /** Opcional pero recomendado (§11.7): sin esto la ausencia del aprobador bloquea la operación. */
  aprobadorSuplente: string | null
  canalAprobacion: CanalAprobacion
  /** Interruptor de captación de leads (§11.3); encendido por defecto en Ventas/Reclutamiento. */
  captarLeads: boolean
}

export const ETIQUETA_MODO_CONTRAPARTE: Record<ModoContraparte, string> = {
  cerrado: 'Cerrado (solo allowlist)',
  abierto_cuarentena: 'Abierto con cuarentena (recomendado)',
  abierto: 'Abierto (requiere firma de riesgo)',
}

export const DESCRIPCION_MODO_CONTRAPARTE: Record<ModoContraparte, string> = {
  cerrado: 'El agente solo puede escribirle a direcciones/dominios en la allowlist del buzón. Cualquier remitente desconocido queda fuera del flujo automático.',
  abierto_cuarentena: 'Remitentes desconocidos se aceptan pero con restricciones duras: sin adjuntos fuera de catálogo, sin enlaces fuera de dominio institucional y con gates más estrictos.',
  abierto: 'El buzón responde a cualquier contraparte sin restricción de allowlist. Exige la firma de riesgo del responsable del SGSI (quién, cuándo, justificación) antes de activarse.',
}

/** Guard de UI/dominio (espejo del check `buzones_abierto_firmado` de la BD):
 *  modo 'abierto' sin firma completa nunca es una política válida. */
export function politicaValida(b: Pick<Buzon, 'modoContraparte' | 'riesgoFirmadoPor' | 'riesgoFirmadoEn'>): boolean {
  if (b.modoContraparte !== 'abierto') return true
  return Boolean(b.riesgoFirmadoPor && b.riesgoFirmadoEn)
}

// ─── Correo entrante (saneado) ──────────────────────────────────────────────

export interface Destinatarios {
  to: string[]
  cc: string[]
}

export interface CorreoEntrante {
  id: string
  buzonId: string
  hiloId: string
  remitente: string
  destinatarios: Destinatarios
  asunto: string
  cuerpoSaneado: string
  /** Qué se eliminó del cuerpo original al sanear (firma, tracking, HTML, etc.) — SIEMPRE visible en UI. */
  saneadoMeta: { eliminados: string[] }
  hashOriginal: string
  dmarcAlineado: boolean
  remitenteConocido: boolean
  recibidoEn: string
}

// ─── Gates deterministas (SPEC §3) ──────────────────────────────────────────

export type Severidad = 'CRITICA' | 'ALTA' | 'MEDIA'

export interface ResultadoGate {
  gate: string
  paso: boolean
  severidad: Severidad
  evidencia: string
  detalles?: string[]
}

/** Los 11 gates deterministas — orden y severidad CANÓNICOS (SPEC §3). Todo
 *  saliente evaluado debe traer exactamente estos 11, en este orden. */
export const GATES_BUZON: { gate: string; severidad: Severidad; descripcion: string }[] = [
  { gate: 'destinatarios_del_hilo', severidad: 'CRITICA', descripcion: 'To ∪ Cc ⊆ participantes(hilo) salvo aprobación explícita marcada' },
  { gate: 'sin_bcc', severidad: 'CRITICA', descripcion: 'Bcc = ∅ siempre' },
  { gate: 'sin_reenvio', severidad: 'CRITICA', descripcion: 'ningún saliente puede tener cuerpo derivado de otro hilo' },
  { gate: 'adjuntos_de_catalogo', severidad: 'CRITICA', descripcion: 'adjuntos solo por ID de catálogo aprobado, nunca ruta generada' },
  { gate: 'urls_de_dominio', severidad: 'ALTA', descripcion: 'enlaces solo a dominios institucionales listados' },
  { gate: 'sin_datos_personales_cruzados', severidad: 'CRITICA', descripcion: 'el borrador no contiene PII presente en otros hilos' },
  { gate: 'divulgacion_presente', severidad: 'ALTA', descripcion: 'todo saliente incluye la leyenda de agente automatizado' },
  { gate: 'cuota_por_buzon', severidad: 'ALTA', descripcion: '≤ N envíos/hora/buzón, ≤ M por hilo' },
  { gate: 'canario_ausente', severidad: 'CRITICA', descripcion: 'el token canario de sistema NO aparece en el cuerpo' },
  { gate: 'auto_submitted_marcado', severidad: 'MEDIA', descripcion: 'cabecera Auto-Submitted: auto-replied en automáticos' },
  { gate: 'sin_secretos', severidad: 'CRITICA', descripcion: 'reusa el chequeo base existente' },
]

export const NOMBRES_GATES_BUZON = GATES_BUZON.map((g) => g.gate)

/** ¿Algún gate CRÍTICO está en rojo? Esa es la única razón que manda un
 *  borrador a `rechazado_gates` en vez de a la bandeja de A5 (SPEC §3). */
export function gateCriticoEnRojo(gates: ResultadoGate[]): boolean {
  return gates.some((g) => g.severidad === 'CRITICA' && !g.paso)
}

// ─── Correo saliente — máquina de estados explícita ─────────────────────────

export type EstadoCorreo =
  | 'borrador'
  | 'rechazado_gates'
  | 'pendiente_aprobacion'
  | 'aprobado'
  | 'enviado'
  | 'rechazado_humano'
  | 'reportado_inyeccion'

export type ActorCorreo = 'buzon_a2a' | 'aprobador' | 'enviar_salientes'

export type EventoCorreo =
  | 'redactar'
  | 'gates_aprueban'
  | 'gates_rechazan'
  | 'aprobar'
  | 'rechazar'
  | 'reportar_inyeccion'
  | 'enviar'
  // Evento de auditoría: registra en historial SIN cambiar el estado (host-job
  // reintentando un envío que aún no se confirma — espejo de fallo_notificacion).
  | 'fallo_envio'

export interface TransicionCorreo {
  de: EstadoCorreo | null // null = creación
  a: EstadoCorreo
  evento: EventoCorreo
  actor: ActorCorreo
  at: string
  detalle?: string
}

export interface PoliticaAplicada {
  modo: ModoContraparte
  clase: string
  cuotaHora: number
  cuotaHilo: number
}

export interface CorreoSaliente {
  id: string
  buzonId: string
  hiloId: string
  enRespuestaA: string | null
  destinatarios: Destinatarios
  asunto: string
  cuerpo: string
  clase: string
  automatico: boolean
  estado: EstadoCorreo
  /** Vacío mientras estado==='borrador' y los gates no han corrido aún. */
  gates: ResultadoGate[]
  sha256: string
  politica: PoliticaAplicada
  historial: TransicionCorreo[]
  creadoAt: string
}

export const TRANSICIONES_CORREO: Record<EstadoCorreo, EstadoCorreo[]> = {
  borrador: ['rechazado_gates', 'pendiente_aprobacion'],
  rechazado_gates: [],
  pendiente_aprobacion: ['aprobado', 'rechazado_humano', 'reportado_inyeccion'],
  aprobado: ['enviado'],
  enviado: [],
  rechazado_humano: [],
  reportado_inyeccion: [],
}

/** Estado destino de cada evento; null = evento de auditoría (no cambia estado). */
export const ESTADO_POR_EVENTO: Record<EventoCorreo, EstadoCorreo | null> = {
  redactar: 'borrador',
  gates_aprueban: 'pendiente_aprobacion',
  gates_rechazan: 'rechazado_gates',
  aprobar: 'aprobado',
  rechazar: 'rechazado_humano',
  reportar_inyeccion: 'reportado_inyeccion',
  enviar: 'enviado',
  fallo_envio: null,
}

/** Eventos que SOLO puede firmar A5 (el humano aprobador) — nunca el agente. */
const EVENTOS_SOLO_APROBADOR: EventoCorreo[] = ['aprobar', 'rechazar', 'reportar_inyeccion']

export function puedeTransicionar(de: EstadoCorreo, a: EstadoCorreo): boolean {
  return TRANSICIONES_CORREO[de].includes(a)
}

export type ResultadoTransicion = { ok: true; correo: CorreoSaliente } | { ok: false; motivo: string }

/** Única puerta de cambio de estado del saliente: valida máquina + las dos
 *  reglas de negocio no-negociables de la SPEC y SIEMPRE deja rastro en
 *  historial. Los fixtures construyen sus estados con esta función — jamás a
 *  mano (mismo patrón que agenda/types.ts::aplicarTransicion). */
export function aplicarTransicion(
  correo: CorreoSaliente,
  evento: EventoCorreo,
  actor: ActorCorreo,
  at: string,
  detalle?: string
): ResultadoTransicion {
  const destino = ESTADO_POR_EVENTO[evento]
  const transicion: TransicionCorreo = { de: correo.estado, a: destino ?? correo.estado, evento, actor, at, detalle }

  if (destino === null) {
    return { ok: true, correo: { ...correo, historial: [...correo.historial, transicion] } }
  }
  if (!puedeTransicionar(correo.estado, destino)) {
    return { ok: false, motivo: `Transición inválida: ${correo.estado} → ${destino} (evento ${evento}).` }
  }
  // Regla dura (SPEC §3): un gate CRÍTICO en rojo NUNCA llega a la bandeja de A5.
  if (evento === 'gates_aprueban' && gateCriticoEnRojo(correo.gates)) {
    return { ok: false, motivo: 'Un gate CRÍTICO en rojo no puede pasar a pendiente_aprobacion: corresponde rechazado_gates.' }
  }
  if (evento === 'gates_rechazan' && !gateCriticoEnRojo(correo.gates)) {
    return { ok: false, motivo: 'rechazado_gates exige al menos un gate CRÍTICO en rojo; sin eso corresponde pendiente_aprobacion.' }
  }
  // Regla dura (SPEC §2.2, §6.3): aprobar/rechazar/reportar_inyeccion son firma
  // EXCLUSIVA de A5 — el agente jamás decide su propia aprobación.
  if (EVENTOS_SOLO_APROBADOR.includes(evento) && actor !== 'aprobador') {
    return { ok: false, motivo: `El evento "${evento}" solo puede firmarlo el aprobador (A5), no "${actor}".` }
  }
  // Regla dura (SPEC §2.2): el envío real solo lo dispara el host-job con
  // credenciales SMTP — nunca la UI ni el agente.
  if (evento === 'enviar' && actor !== 'enviar_salientes') {
    return { ok: false, motivo: 'El evento "enviar" solo lo dispara el host-job enviar-salientes.' }
  }
  return { ok: true, correo: { ...correo, estado: destino, historial: [...correo.historial, transicion] } }
}

// ─── Estado del hilo (ciclo A2A) — SIEMPRE derivado, nunca fijado a mano ────

export type EstadoHilo = 'submitted' | 'working' | 'input_required' | 'completed'

/** Mapa puro estado-del-último-saliente → estado del hilo (SPEC §6.2: "Estados
 *  del hilo alineados al ciclo A2A"). Un hilo sin ningún saliente aún (solo
 *  entrante recibido) está `submitted`. */
const ESTADO_HILO_POR_SALIENTE: Record<EstadoCorreo, EstadoHilo> = {
  borrador: 'working',
  rechazado_gates: 'working', // el agente debe redactar de nuevo
  pendiente_aprobacion: 'input_required', // esperando la firma de A5
  aprobado: 'working', // esperando al host-job de envío
  enviado: 'completed',
  rechazado_humano: 'working', // A5 pidió redraft
  reportado_inyeccion: 'completed', // detenido a propósito: no hay más acción automática
}

export function estadoHilo(salientes: CorreoSaliente[]): EstadoHilo {
  if (salientes.length === 0) return 'submitted'
  const ultimo = [...salientes].sort((a, b) => a.creadoAt.localeCompare(b.creadoAt)).at(-1)!
  return ESTADO_HILO_POR_SALIENTE[ultimo.estado]
}

export const ETIQUETA_ESTADO_HILO: Record<EstadoHilo, string> = {
  submitted: 'Recibido',
  working: 'En proceso',
  input_required: 'Requiere aprobación',
  completed: 'Completado',
}

// ─── Etiquetas UI de correo saliente ────────────────────────────────────────

export const ETIQUETA_ESTADO_CORREO: Record<EstadoCorreo, string> = {
  borrador: 'Borrador',
  rechazado_gates: 'Rechazado (gates)',
  pendiente_aprobacion: 'Pendiente de aprobación',
  aprobado: 'Aprobado',
  enviado: 'Enviado',
  rechazado_humano: 'Rechazado',
  reportado_inyeccion: 'Reportado (intento de inyección)',
}

// ─── Bitácora append-only (ISO 27001 5.33 — espejo de buzon_bitacora) ───────

export interface EventoBitacora {
  id: string
  ocurridoEn: string
  actor: string
  evento: string
  buzonId: string | null
  hiloId: string | null
  correoId: string | null
  detalle: Record<string, string>
}
