import type {
  AlertaRegulatoria,
  BorradorIntakeFiscal,
  CasoFiscal,
  CriterioFiscal,
} from '@/features/fiscal/types'
import {
  ALERTAS_REGULATORIAS,
  CASOS_FISCALES,
  CRITERIOS_FISCALES,
} from './mock'

/**
 * Costura de integración del Avatar Fiscal (patrón del plan §Mock): estas
 * funciones llevan el NOMBRE y la FIRMA de la API futura y hoy resuelven
 * fixtures. Conectar el backend real = añadir services/real.ts y conmutar
 * aquí, sin tocar ninguna vista.
 */

/**
 * Integración futura: `GET {HERMES_API}/fiscal/casos` — casos que Hermes
 * mantiene en la tabla `casos_fiscales` (Supabase, RLS por tenant).
 */
export async function getFiscalCases(): Promise<CasoFiscal[]> {
  return CASOS_FISCALES
}

/**
 * Integración futura: consulta al grafo regulatorio (`POST {GRAFO_API}/evaluar`,
 * dimensión fiscal MX) fusionada con los criterios internos del despacho que
 * administra Hermes. El contrato de evaluación espejea
 * `meeting-copilot/src/features/pre-discovery/grafo.ts` (5 estados, fail-safe
 * `dudoso`; toda afirmación cita fuente).
 */
export async function fetchFiscalCriteria(): Promise<CriterioFiscal[]> {
  return CRITERIOS_FISCALES
}

/**
 * Integración futura: `GET {HERMES_API}/fiscal/alertas` — vigilancia
 * regulatoria del grafo (DOF/SAT/RMF/jurisprudencia) cruzada contra la
 * cartera del despacho por el departamento fiscal de Hermes.
 */
export async function getRegulatoryAlerts(): Promise<AlertaRegulatoria[]> {
  return ALERTAS_REGULATORIAS
}

/**
 * Integración futura: `POST {HERMES_API}/fiscal/casos` — alta del caso desde
 * el intake guiado; Hermes clasifica materia/riesgo con el grafo y lo asigna.
 * En el prototipo devuelve un folio fijo de muestra.
 */
export async function submitFiscalCaseIntake(
  borrador: BorradorIntakeFiscal,
): Promise<{ folio: string }> {
  void borrador
  return { folio: 'FIS-2026-0009' }
}
