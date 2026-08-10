/**
 * Tipos compartidos entre los 4 avatares.
 *
 * Convenciones (ver README y tokens.css):
 * - El COLOR solo codifica RiskLevel (decisión C4). EstadoValidacion se pinta
 *   con fichas neutras/acento, nunca con la paleta de riesgo.
 * - Toda afirmación generada por el sistema lleva Fuente[] (regla de oro del
 *   grafo: sin fuente no hay afirmación).
 */

/** Escala semáforo — única codificación por color de la app. */
export type RiskLevel = 'alto' | 'medio' | 'bajo'

/** Estado del flujo de validación humana de un criterio/output del sistema. */
export type EstadoValidacion = 'validado' | 'en_revision' | 'pendiente'

/** Prácticas para filtros de litigio y métricas transversales. */
export type PracticaLegal =
  | 'fiscal'
  | 'laboral'
  | 'mercantil'
  | 'penal'
  | 'civil'
  | 'administrativo'

/**
 * Procedencia de una afirmación del sistema.
 * `hermes` = salida del agente/departamento; `grafo` = regla del grafo
 * regulatorio (cita normativa: CFF, LISR, DOF, criterio SAT…).
 */
export type OrigenFuente = 'hermes' | 'grafo'

export interface Fuente {
  origen: OrigenFuente
  /** Referencia legible: "CFF art. 29-A", "Criterio normativo SAT 23/ISR/N"… */
  referencia: string
  url?: string
}

/**
 * Campos de tenencia INERTES (decisión C3 de la adenda): presentes en los
 * modelos para que la Fase 9+ (multi-inquilino) no obligue a re-tipar, pero
 * sin ninguna lógica en este prototipo.
 */
export interface CamposTenencia {
  tenantId: string
  asociadoId: string
}

/**
 * Procedencia de los datos que muestra la UI. En el prototipo siempre 'mock';
 * alimenta la insignia global del shell (DataSourceBadge). Cuando exista
 * services/real.ts, este valor pasa a derivarse de la costura.
 */
export const FUENTE_DATOS = 'mock' as const
