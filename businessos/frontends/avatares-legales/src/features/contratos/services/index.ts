import type {
  BorradorIntakeContrato,
  ClausulaSugerida,
  HistorialVersiones,
  OperacionContractual,
  Precedente,
  RiesgoRegulatorio,
} from '@/features/contratos/types'
import {
  CLAUSULAS_SUGERIDAS,
  HISTORIALES_VERSIONES,
  OPERACIONES_CONTRACTUALES,
  PRECEDENTES,
  RIESGOS_REGULATORIOS,
} from './mock'

/**
 * Costura de integración del Avatar de Contratos: nombres y firmas de la API
 * futura resolviendo fixtures. Conectar el backend real = añadir
 * services/real.ts y conmutar aquí, sin tocar vistas.
 */

/**
 * Integración futura: `GET {HERMES_API}/contratos/operaciones` — operaciones
 * contractuales de la tabla `contratos` (Supabase, RLS por tenant).
 */
export async function getContractOperations(): Promise<OperacionContractual[]> {
  return OPERACIONES_CONTRACTUALES
}

/**
 * Integración futura: `POST {HERMES_API}/contratos/clausulas/sugerir` —
 * Hermes redacta sobre precedentes del despacho y el grafo valida cada
 * cláusula (dimensión contractual MX); toda sugerencia llega con fuente y
 * motivo de riesgo, y el abogado decide (aceptar/editar/descartar).
 */
export async function fetchSuggestedClauses(
  contratoId: string,
): Promise<ClausulaSugerida[]> {
  return CLAUSULAS_SUGERIDAS.filter(
    (clausula) => clausula.contratoId === contratoId,
  )
}

/**
 * Integración futura: consulta al grafo regulatorio (`POST {GRAFO_API}/evaluar`,
 * dimensiones contractual/regulatorio/datos-personales) sobre la operación
 * completa — riesgos que no viven en una cláusula concreta.
 */
export async function fetchContractRegulatoryRisks(
  contratoId: string,
): Promise<RiesgoRegulatorio[]> {
  return RIESGOS_REGULATORIOS.filter(
    (riesgo) => riesgo.contratoId === contratoId,
  )
}

/**
 * Integración futura: `GET {HERMES_API}/contratos/{id}/versiones` — historial
 * de versiones con aprobaciones firmadas (quién aprobó qué y cuándo).
 */
export async function getContractVersions(): Promise<HistorialVersiones[]> {
  return HISTORIALES_VERSIONES
}

/**
 * Integración futura: `GET {HERMES_API}/contratos/precedentes?q=` — búsqueda
 * en el repositorio de precedentes (índice semántico de Hermes sobre el
 * archivo del despacho).
 */
export async function searchPrecedents(): Promise<Precedente[]> {
  return PRECEDENTES
}

/**
 * Integración futura: `POST {HERMES_API}/contratos/operaciones` — alta de la
 * operación desde el intake; Hermes propone el precedente base y dispara la
 * evaluación del grafo. En el prototipo devuelve un folio fijo de muestra.
 */
export async function submitContractIntake(
  borrador: BorradorIntakeContrato,
): Promise<{ folio: string }> {
  void borrador
  return { folio: 'CON-2026-0006' }
}
