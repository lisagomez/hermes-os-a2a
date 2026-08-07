// Pre-Discovery: contratos del caso y sus bloques de análisis (SPEC §Pre-Discovery).
// Doctrina transversal: separación dura hecho/hipótesis/recomendación, confianza y
// procedencia SIEMPRE visibles, y fail-safe honesto (nada se afirma sin respaldo).

export type BloqueId =
  | 'perfil'
  | 'sitio'
  | 'competencia'
  | 'diferenciacion'
  | 'foda'
  | 'regulatorio'
  | 'tecnologia'
  | 'brief'

export const ORDEN_BLOQUES: BloqueId[] = [
  'perfil',
  'sitio',
  'competencia',
  'diferenciacion',
  'foda',
  'regulatorio',
  'tecnologia',
  'brief',
]

export const ETIQUETA_BLOQUE: Record<BloqueId, string> = {
  perfil: 'Perfil del lead',
  sitio: 'Sitio y servicios',
  competencia: 'Benchmark competitivo',
  diferenciacion: 'Diferenciación',
  foda: 'FODA',
  regulatorio: 'Marco regulatorio',
  tecnologia: 'Marco tecnológico',
  brief: 'Brief del asesor',
}

export type EstadoBloque = 'pendiente' | 'analizando' | 'listo' | 'error' | 'no_concluyente'
export type Naturaleza = 'hecho' | 'hipotesis' | 'recomendacion'
export type Confianza = 'alta' | 'media' | 'baja'

export interface Procedencia {
  metodo: 'observado' | 'inferido' | 'mock'
  fuente: string // qué se leyó/consultó (URL del sitio, 'grafo', 'fixture demo', modelo…)
  modelo?: string
}

export interface Item {
  texto: string
  naturaleza: Naturaleza
  evidencia?: string // cita textual (obligatoria para 'hecho'; sin ella se degrada a hipótesis)
}

export interface Bloque<T> {
  estado: EstadoBloque
  datos: T | null
  confianza: Confianza
  procedencia: Procedencia | null
  requiereValidacion: string[] // qué debe validar el humano
  error: string | null
  generadoAt: string | null
}

// ─── Datos por bloque ───────────────────────────────────────────────────────

export interface DatosPerfil {
  empresaNormalizada: string
  descripcion: string
  industria: string
  orientacion: 'servicios' | 'productos' | 'ambos'
  resumenEjecutivo: string
}

/** Estado de cada sitio/perfil compilado (web, LinkedIn, etc.) — se declara
 *  SIEMPRE, incluido lo bloqueado o fallido. */
export interface FuenteCompilada {
  url: string
  estado: 'leida' | 'bloqueada' | 'error'
  detalle: string
}

export interface DatosSitio {
  /** Compilación multi-fuente: qué se leyó y qué no (jamás se oculta un fallo). */
  fuentes?: FuenteCompilada[]
  servicios: Item[]
  propuestaValor: Item
  claims: Item[]
  segmentosObjetivo: Item[]
  madurezDigital: { nivel: Confianza; senales: Item[] }
  vacios: Item[] // debilidades/ambigüedades del posicionamiento
}

export interface Competidor {
  nombre: string
  url: string | null
  posicionamiento: string
  servicios: string[]
  diferenciadores: string[]
  madurez: Confianza
  confianza: Confianza // qué tan seguro es que sea competidor real del lead
}

export interface DatosCompetencia {
  competidores: Competidor[]
  comparativa: {
    dimension: string // 'posicionamiento' | 'servicios' | 'diferenciadores' | 'madurez'
    lead: string
    lectura: string // lectura del analista, no dumping
  }[]
}

export interface DatosDiferenciacion {
  oportunidades: { titulo: string; gapCompetitivo: string; linea: string; naturaleza: Naturaleza }[]
}

export interface DatosFoda {
  fortalezas: Item[]
  oportunidades: Item[]
  debilidades: Item[]
  amenazas: Item[]
}

// regulatorio.datos = EvaluacionGrafo (contrato del grafo, en ./grafo.ts)

export interface DatosTecnologia {
  stackVisible: Item[]
  madurezDigital: Confianza
  herramientasProbables: Item[]
  oportunidadesAutomatizacion: Item[]
}

export interface DatosBrief {
  resumen: string
  angulos: Item[]
  hipotesis: Item[]
  riesgos: Item[]
  preguntasRecomendadas: string[]
  temasSensibles: Item[]
  siguientePaso: string
}

// ─── El caso ────────────────────────────────────────────────────────────────

export interface IntakeLead {
  telefono: string
  email: string
  linkedin?: string // URL del perfil de LinkedIn del contacto (opcional)
  web: string
  tamano: string // '1-10' | '11-50' | '51-200' | '200+' (texto libre tolerado)
  giro: string
  categoria?: string // categoría profesional del negocio (Legal, Logística, Marketing, …) — complementa el giro
  pais: string
  notas: string
}

export type EstadoCaso = 'borrador' | 'analizando' | 'parcial' | 'listo' | 'error'

export interface CasoPreDiscovery {
  id: string
  leadId: string
  intake: IntakeLead
  estado: EstadoCaso
  bloques: Record<BloqueId, Bloque<unknown>>
  activoId: string | null // ficha de Activo Digital del caso
  creadoAt: string
  actualizadoAt: string
}

export function bloqueVacio<T>(): Bloque<T> {
  return { estado: 'pendiente', datos: null, confianza: 'baja', procedencia: null, requiereValidacion: [], error: null, generadoAt: null }
}

export function bloquesVacios(): Record<BloqueId, Bloque<unknown>> {
  return Object.fromEntries(ORDEN_BLOQUES.map((b) => [b, bloqueVacio()])) as Record<BloqueId, Bloque<unknown>>
}

/** Estado global derivado de los bloques (nunca se fija a mano). */
export function estadoCasoDe(bloques: Record<BloqueId, Bloque<unknown>>): EstadoCaso {
  const estados = ORDEN_BLOQUES.map((b) => bloques[b].estado)
  if (estados.every((e) => e === 'pendiente')) return 'borrador'
  if (estados.some((e) => e === 'analizando')) return 'analizando'
  if (estados.every((e) => e === 'listo' || e === 'no_concluyente')) return 'listo'
  if (estados.some((e) => e === 'error')) return 'error'
  return 'parcial'
}
