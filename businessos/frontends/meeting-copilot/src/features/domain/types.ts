// Contratos del dominio (SPEC §8). Espejados a propósito de los contratos ya
// existentes en el repo (transcripcion-a2a, tareas_reunion, leads) para que la
// migración futura a Supabase sea aditiva.

export type TipoReunion = 'discovery' | 'demo' | 'negociacion' | 'revision_tecnica' | 'cierre'
export type EstadoReunion = 'capturada' | 'transcrita' | 'analizada' | 'revisada' | 'cerrada'

export interface Participante {
  nombre: string
  rol: string
  lado: 'interno' | 'cliente'
}

export interface Reunion {
  id: string
  titulo: string
  cuenta: string
  tipoReunion: TipoReunion
  participantes: Participante[]
  asesor: string
  fecha: string // ISO
  duracionS: number | null
  origen: 'audio' | 'texto' | 'virtual'
  leadId?: string
  estado: EstadoReunion
}

export interface ArchivoAudio {
  id: string
  reunionId: string
  filename: string
  mime: string
  tamanoBytes: number
  duracionS: number | null
  sha256: string
}

export type EstadoJob = 'pendiente' | 'procesando' | 'completado' | 'fallido'

export interface TrabajoTranscripcion {
  id: string
  audioId: string
  filename: string
  motor: string
  estado: EstadoJob
  progreso: number // 0..100
  idioma: string
  intentos: number
  error: string | null // SIEMPRE visible en UI cuando existe
  reunionId: string | null // se asigna al completar
  creadoAt: string
  actualizadoAt: string
}

/** Umbral bajo el cual un segmento se marca [inaudible] — doctrina transcripcion-a2a. */
export const UMBRAL_INAUDIBLE = 0.5

export interface Segmento {
  inicioS: number
  finS: number
  hablante: string // nombre del participante o 'desconocido'
  texto: string // '[inaudible]' si confianza < UMBRAL_INAUDIBLE — nunca se adivina
  confianza: number // 0..1
}

export type ConfianzaGlobal = 'alta' | 'media' | 'baja'

export interface Transcripcion {
  id: string
  reunionId: string
  motor: string
  confianzaGlobal: ConfianzaGlobal // promedio ≥0.9 alta / ≥0.7 media / resto baja
  contenido: string // líneas "[mm:ss] Hablante: texto"
  segmentos: Segmento[]
}

export type CategoriaInsight =
  | 'pain'
  | 'objetivo'
  | 'necesidad_explicita'
  | 'necesidad_implicita'
  | 'riesgo'
  | 'objecion'
  | 'herramienta_actual'
  | 'competidor'
  | 'stakeholder'
  | 'presupuesto'
  | 'urgencia'
  | 'proceso_decision'
  | 'senal_compra'
  | 'proximo_paso'
  | 'pregunta_sin_responder'

export interface Evidencia {
  segmentoIdx: number
  inicioS: number
  cita: string
}

export interface Insight {
  id: string
  reunionId: string
  categoria: CategoriaInsight
  texto: string
  evidencia: Evidencia[] // ≥1 SIEMPRE: sin evidencia no hay insight
  confianza: 'alta' | 'media'
  extra?: Record<string, string>
}

export type DimensionId =
  | 'problema'
  | 'impacto'
  | 'urgencia'
  | 'proceso_decision'
  | 'stakeholders'
  | 'presupuesto'
  | 'competencia'
  | 'proximos_pasos'

export type EstadoDimension = 'cubierta' | 'parcial' | 'faltante'

export interface DimensionScore {
  dimension: DimensionId
  peso: number
  estado: EstadoDimension
  evidencia: Evidencia[]
  explicacion: string
}

export interface HuecoDiscovery {
  dimension: DimensionId
  motivo: string
  preguntaSugerida: string
  justificacion: string
}

export interface ConductaLlamada {
  ratioHablaInterno: number // 0..1, ideal < 0.45
  preguntasAbiertas: number
  segmentosInaudibles: number
}

export interface ScoreDiscovery {
  reunionId: string
  total: number // 0..100 — NUNCA se muestra sin su desglose
  dimensiones: DimensionScore[]
  conducta: ConductaLlamada
  huecos: HuecoDiscovery[]
}

export interface Accion {
  id: string // 'T1', 'T2'... correlativo por reunión (shape tareas_reunion)
  reunionId: string
  tarea: string
  responsable: string | null
  fechaLimite: string | null // ISO; null = sin fecha
  fechaTexto: string | null // expresión temporal literal detectada ("el jueves 30")
  fuente: string // "Hablante [mm:ss]"
  estado: 'pendiente' | 'en_curso' | 'hecha' | 'cancelada'
}

export interface RiesgoDeal {
  tipo:
    | 'champion_ausente'
    | 'sin_presupuesto'
    | 'sin_urgencia'
    | 'competidor_activo'
    | 'proceso_desconocido'
    | 'discovery_incompleto'
    | 'objecion_sin_respuesta'
  severidad: 'alta' | 'media' | 'baja'
  descripcion: string
  evidencia: Evidencia[]
  mitigacion: string
}

export interface NodoStakeholder {
  nombre: string
  rol: string
  presente: boolean
  influencia: 'decisor' | 'influenciador' | 'usuario' | 'desconocida'
  evidencia: Evidencia[]
}

export interface Playbook {
  id: string
  tipoReunion: TipoReunion
  nombre: string
  dimensiones: { dimension: DimensionId; peso: number; critica: boolean }[] // Σ pesos = 100
  bancoPreguntas: Record<DimensionId, string[]>
  umbralSuperficial: number
}

export type EstadoHerramienta = 'active' | 'beta' | 'soon'

export interface Herramienta {
  slug: string
  nombre: string
  descripcion: string
  categoria: 'captura' | 'analisis' | 'ejecucion' | 'supervision' | 'configuracion' | 'agendamiento'
  icono: string
  estado: EstadoHerramienta
  ruta: string
}

export const ETIQUETA_DIMENSION: Record<DimensionId, string> = {
  problema: 'Problema',
  impacto: 'Impacto',
  urgencia: 'Urgencia',
  proceso_decision: 'Proceso de decisión',
  stakeholders: 'Stakeholders',
  presupuesto: 'Presupuesto',
  competencia: 'Competencia y herramientas',
  proximos_pasos: 'Próximos pasos',
}

export const ETIQUETA_CATEGORIA: Record<CategoriaInsight, string> = {
  pain: 'Pains',
  objetivo: 'Objetivos del cliente',
  necesidad_explicita: 'Necesidades explícitas',
  necesidad_implicita: 'Necesidades implícitas',
  riesgo: 'Riesgos y bloqueadores',
  objecion: 'Objeciones',
  herramienta_actual: 'Herramientas actuales',
  competidor: 'Competidores',
  stakeholder: 'Stakeholders',
  presupuesto: 'Presupuesto',
  urgencia: 'Urgencia',
  proceso_decision: 'Proceso de decisión',
  senal_compra: 'Señales de compra',
  proximo_paso: 'Próximos pasos',
  pregunta_sin_responder: 'Preguntas sin responder',
}

export const ETIQUETA_TIPO_REUNION: Record<TipoReunion, string> = {
  discovery: 'Discovery',
  demo: 'Demo',
  negociacion: 'Negociación',
  revision_tecnica: 'Revisión técnica',
  cierre: 'Cierre',
}

export const ETIQUETA_ESTADO_REUNION: Record<EstadoReunion, string> = {
  capturada: 'Capturada',
  transcrita: 'Transcrita',
  analizada: 'Analizada',
  revisada: 'Revisada',
  cerrada: 'Cerrada',
}

// ─── Leads (espejo de public.leads del repo: 10 etapas canónicas del embudo) ─

export type EtapaLead =
  | 'nuevo'
  | 'calificado'
  | 'contactado'
  | 'descubrimiento'
  | 'propuesta'
  | 'negociacion'
  | 'contrato'
  | 'onboarding'
  | 'ganado'
  | 'perdido'

export const ETAPAS_LEAD: EtapaLead[] = [
  'nuevo',
  'calificado',
  'contactado',
  'descubrimiento',
  'propuesta',
  'negociacion',
  'contrato',
  'onboarding',
  'ganado',
  'perdido',
]

export interface Lead {
  leadId: string // clave natural (espejo de leads.lead_id)
  empresa: string
  contacto: string // nombre de la persona
  etapa: EtapaLead
  origen: 'copilot' // un escritor por origen (doctrina del repo)
  datos?: Record<string, string>
  creadoAt: string
}
