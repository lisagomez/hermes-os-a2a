import type {
  CamposTenencia,
  EstadoValidacion,
  Fuente,
  RiskLevel,
} from '@/shared/types'

/**
 * Modelos del Avatar Fiscal.
 * Trazabilidad: INVESTIGACION-SINTESIS.md §1 (socio fiscal) — intake guiado,
 * criterios con fuente y validación, alertas regulatorias y resumen de caso.
 *
 * Las fechas son texto YA formateado (ver shared/fechas.ts): las fixtures las
 * calculan una vez y la UI solo las pinta (server components).
 */

export type MateriaFiscal =
  | 'ISR'
  | 'IVA'
  | 'IEPS'
  | 'CFDI'
  | 'Precios de transferencia'
  | 'Comercio exterior'

export type EtapaCasoFiscal = 'intake' | 'analisis' | 'en_defensa' | 'cerrado'

export interface CasoFiscal extends CamposTenencia {
  id: string
  cliente: string
  rfc: string
  regimen: string
  materias: MateriaFiscal[]
  descripcion: string
  etapa: EtapaCasoFiscal
  riesgo: RiskLevel
  responsable: string
  /** Próximo vencimiento ya formateado; null si el caso está cerrado. */
  proximoVencimiento: string | null
  /** Días naturales hasta el vencimiento (para la cinta de plazos). */
  diasParaVencimiento: number | null
  tareasAbiertas: number
  notaSocio?: string
}

/**
 * Criterio aplicable: regla del grafo regulatorio o criterio interno del
 * despacho (origen 'hermes'). Siempre con fuente y estado de validación.
 */
export interface CriterioFiscal extends CamposTenencia {
  id: string
  titulo: string
  resumen: string
  materia: MateriaFiscal
  riesgo: RiskLevel
  estadoValidacion: EstadoValidacion
  fuentes: Fuente[]
  /** Clientes de la cartera a los que aplica hoy. */
  aplicaA: string[]
}

export type OrigenPublicacion =
  | 'DOF'
  | 'SAT'
  | 'RMF'
  | 'Jurisprudencia'

export interface AlertaRegulatoria extends CamposTenencia {
  id: string
  /** Fecha de publicación ya formateada. */
  fecha: string
  titulo: string
  descripcion: string
  origenPublicacion: OrigenPublicacion
  /** Impacto potencial en la cartera (escala de riesgo → color permitido). */
  impacto: RiskLevel
  clientesAfectados: string[]
  fuentes: Fuente[]
}

/** Borrador que captura el intake guiado (FiscalCaseIntakeForm). */
export interface BorradorIntakeFiscal {
  cliente: string
  rfc: string
  regimen: string
  materias: MateriaFiscal[]
  descripcion: string
  urgencia: 'normal' | 'urgente'
}
