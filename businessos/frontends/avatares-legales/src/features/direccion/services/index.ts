import type {
  AlertaEjecutiva,
  ClienteEstrategico,
  DepartamentoTrio,
  PanoramaDespacho,
} from '@/features/direccion/types'
import {
  ALERTAS_EJECUTIVAS,
  CLIENTES_ESTRATEGICOS,
  DEPARTAMENTOS_TRIO,
  PANORAMA,
} from './mock'

/**
 * Costura de integración del Avatar Director: nombres y firmas de la API
 * futura resolviendo fixtures. Conectar el backend real = añadir
 * services/real.ts y conmutar aquí, sin tocar vistas.
 */

/**
 * Integración futura: `GET {HERMES_API}/direccion/panorama` — agregados de
 * Mission Control (ingresos, casos, utilización por práctica) calculados por
 * vistas SQL en Supabase, nunca en el cliente.
 */
export async function getFirmOverview(): Promise<PanoramaDespacho> {
  return PANORAMA
}

/**
 * Integración futura: `GET {HERMES_API}/departamentos` — departamentos
 * operados por el trío Hermes→Ejecutor→Supervisor, con su bitácora de
 * decisiones (tabla `tareas` + ledger `token_usage`). Activar/pausar llamará
 * a `POST {HERMES_API}/departamentos/{id}/estado` con confirmación humana.
 */
export async function getTrioDepartments(): Promise<DepartamentoTrio[]> {
  return DEPARTAMENTOS_TRIO
}

/**
 * Integración futura: `GET {HERMES_API}/direccion/alertas` — alertas de alto
 * impacto consolidadas: regulatorias (grafo), operativas (métricas Hermes) e
 * hitos de los departamentos.
 */
export async function getExecutiveAlerts(): Promise<AlertaEjecutiva[]> {
  return ALERTAS_EJECUTIVAS
}

/**
 * Integración futura: `GET {HERMES_API}/direccion/clientes-estrategicos` —
 * cuentas clave con servicios activos, riesgo y oportunidades detectadas por
 * el departamento de adquisición.
 */
export async function getStrategicClients(): Promise<ClienteEstrategico[]> {
  return CLIENTES_ESTRATEGICOS
}
