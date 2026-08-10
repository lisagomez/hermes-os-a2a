import type {
  AgendaMes,
  CasoLitigio,
  ChecklistCaso,
  ComunicacionCaso,
} from '@/features/litigio/types'
import {
  AGENDA_MES,
  CASOS_LITIGIO,
  CHECKLISTS_CASOS,
  COMUNICACIONES_CASOS,
} from './mock'

/**
 * Costura de integración del Avatar de Litigio: nombres y firmas de la API
 * futura resolviendo fixtures (patrón del plan §Mock). Conectar el backend
 * real = añadir services/real.ts y conmutar aquí, sin tocar vistas.
 */

/**
 * Integración futura: `GET {HERMES_API}/litigio/casos` — pipeline que Hermes
 * mantiene en la tabla `casos_litigio` (Supabase, RLS por tenant), alimentado
 * por el intake y los acuerdos publicados.
 */
export async function getLitigationCases(): Promise<CasoLitigio[]> {
  return CASOS_LITIGIO
}

/**
 * Integración futura: `GET {HERMES_API}/litigio/agenda?mes=` — audiencias y
 * vencimientos consolidados desde boletines judiciales y los términos que
 * computa Hermes al publicarse cada acuerdo.
 */
export async function getHearingsAgenda(): Promise<AgendaMes> {
  return AGENDA_MES
}

/**
 * Integración futura: `GET {HERMES_API}/litigio/checklists` — instancias de
 * las plantillas por tipo de juicio (catálogo del despacho) con estado por
 * tarea y responsable.
 */
export async function getTrialChecklists(): Promise<ChecklistCaso[]> {
  return CHECKLISTS_CASOS
}

/**
 * Integración futura: `GET {HERMES_API}/litigio/comunicaciones` — bitácora de
 * comunicación por caso; los borradores de Hermes llegan con estado
 * 'sugerido' y solo salen al cliente tras aprobación humana.
 */
export async function getClientCommunications(): Promise<ComunicacionCaso[]> {
  return COMUNICACIONES_CASOS
}
