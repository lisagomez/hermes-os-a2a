import type { CamposTenencia, Fuente, RiskLevel } from '@/shared/types'

/**
 * Modelos del Avatar de Contratos.
 * Trazabilidad: INVESTIGACION-SINTESIS.md §3 (corporativo/comercial) —
 * intake de operación, cláusulas con riesgo y referencia, versiones y
 * aprobaciones visibles, repositorio de precedentes.
 */

export type TipoContrato =
  | 'Suministro'
  | 'Prestación de servicios'
  | 'Arrendamiento'
  | 'Confidencialidad (NDA)'
  | 'Distribución'

export type EstadoContrato = 'borrador' | 'en_revision' | 'aprobado' | 'firmado'

export interface OperacionContractual extends CamposTenencia {
  id: string
  nombre: string
  tipo: TipoContrato
  partes: string[]
  jurisdicciones: string[]
  /** Monto ya formateado ("MXN $48,500,000"). */
  monto: string
  estado: EstadoContrato
  responsable: string
  riesgo: RiskLevel
  resumen: string
}

/**
 * Estado de una cláusula dentro del flujo de revisión humana. 'sugerida' es
 * el estado en que la deja el sistema; el abogado decide el resto.
 */
export type EstadoClausula = 'sugerida' | 'aceptada' | 'editada' | 'descartada'

export interface ClausulaSugerida {
  id: string
  contratoId: string
  titulo: string
  texto: string
  riesgo: RiskLevel
  motivoRiesgo: string
  fuentes: Fuente[]
  estado: EstadoClausula
}

/** Riesgo regulatorio de la operación detectado por el grafo. */
export interface RiesgoRegulatorio {
  id: string
  contratoId: string
  titulo: string
  descripcion: string
  nivel: RiskLevel
  fuentes: Fuente[]
}

export interface AprobacionVersion {
  nombre: string
  rol: string
  /** Fecha ya formateada. */
  fecha: string
}

export interface VersionContrato {
  id: string
  contratoId: string
  version: string
  /** Fecha ya formateada. */
  fecha: string
  autor: string
  cambios: string
  estado: EstadoContrato
  aprobaciones: AprobacionVersion[]
  comentario?: string
}

export interface HistorialVersiones extends CamposTenencia {
  contratoId: string
  nombre: string
  versiones: VersionContrato[]
}

export interface Precedente extends CamposTenencia {
  id: string
  nombre: string
  tipo: TipoContrato
  cliente: string
  anio: number
  etiquetas: string[]
  usos: number
  /** Última consulta ya formateada. */
  ultimaConsulta: string
  resumen: string
}

/** Borrador que captura el intake de operación (ContractIntakeForm). */
export interface BorradorIntakeContrato {
  nombre: string
  tipo: TipoContrato
  parteA: string
  parteB: string
  jurisdicciones: string
  monto: string
  riesgosClave: string[]
}
