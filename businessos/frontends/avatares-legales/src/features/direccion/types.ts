import type { CamposTenencia, Fuente, RiskLevel } from '@/shared/types'

/**
 * Modelos del Avatar Director (multipráctica).
 * Trazabilidad: INVESTIGACION-SINTESIS.md §4 (socios y gerencia) — métricas
 * transversales, departamentos operados por el trío Hermes→Ejecutor→
 * Supervisor, alertas ejecutivas y clientes estratégicos.
 */

export interface MetricaPractica {
  practica: string
  casosActivos: number
  /** Ingresos del mes ya formateados. */
  ingresosMes: string
  /** Utilización del equipo (0–100, % de horas facturables). */
  utilizacion: number
  riesgoAgregado: RiskLevel
}

export interface PanoramaDespacho extends CamposTenencia {
  /** Periodo ya formateado ("agosto 2026"). */
  periodo: string
  ingresosMes: string
  variacionMensual: string
  casosActivos: number
  casosRiesgoAlto: number
  horasFacturables: number
  practicas: MetricaPractica[]
}

export type EstadoDepartamento = 'activo' | 'pausado'

export type ActorTrio = 'hermes' | 'ejecutor' | 'supervisor'

export type ResultadoDecision = 'aprobado' | 'rechazado' | 'escalado'

export interface DecisionTrio {
  id: string
  /** Fecha ya formateada. */
  fecha: string
  actor: ActorTrio
  resumen: string
  resultado: ResultadoDecision
}

/** Departamento agéntico operado por el trío Hermes→Ejecutor→Supervisor. */
export interface DepartamentoTrio extends CamposTenencia {
  id: string
  nombre: string
  descripcion: string
  estado: EstadoDepartamento
  tareasMes: number
  /** % de tareas del mes aprobadas por el Supervisor al primer intento. */
  aprobacionPrimerIntento: number
  costoMes: string
  decisiones: DecisionTrio[]
}

export type CategoriaAlerta = 'regulatorio' | 'operativo' | 'hito'

export interface AlertaEjecutiva extends CamposTenencia {
  id: string
  /** Fecha ya formateada. */
  fecha: string
  categoria: CategoriaAlerta
  titulo: string
  descripcion: string
  impacto: RiskLevel
  fuentes: Fuente[]
}

export interface ClienteEstrategico extends CamposTenencia {
  id: string
  nombre: string
  industria: string
  serviciosActivos: string[]
  /** Ingresos anuales ya formateados. */
  ingresosAnuales: string
  riesgo: RiskLevel
  oportunidad: string
  responsable: string
}
