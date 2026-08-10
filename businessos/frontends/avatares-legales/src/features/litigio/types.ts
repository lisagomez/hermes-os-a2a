import type { CamposTenencia, PracticaLegal, RiskLevel } from '@/shared/types'

/**
 * Modelos del Avatar de Litigio.
 * Trazabilidad: INVESTIGACION-SINTESIS.md §2 (coordinador de litigio) —
 * pipeline único, agenda de plazos, checklists por juicio y comunicación
 * estructurada con clientes.
 */

export type EtapaLitigio =
  | 'intake'
  | 'estrategia'
  | 'juicio'
  | 'sentencia'
  | 'ejecucion'

export interface CasoLitigio extends CamposTenencia {
  id: string
  cliente: string
  contraparte: string
  practica: PracticaLegal
  expediente: string
  juzgado: string
  etapa: EtapaLitigio
  abogado: string
  riesgo: RiskLevel
  /** Próxima actuación ya formateada; null si no hay plazo corriendo. */
  proximaActuacion: string | null
  diasParaActuacion: number | null
  resumen: string
}

export type TipoEventoAgenda = 'audiencia' | 'vencimiento' | 'promocion'

export interface EventoAgenda extends CamposTenencia {
  id: string
  /** Día del mes mostrado (1–31). */
  dia: number
  /** Fecha ya formateada. */
  fecha: string
  hora: string
  tipo: TipoEventoAgenda
  titulo: string
  casoId: string
  cliente: string
  abogado: string
  /** Riesgo de perder el plazo (único uso de color en la agenda — C4). */
  riesgo?: RiskLevel
}

export interface AgendaMes {
  anio: number
  /** Mes 1–12. */
  mes: number
  nombreMes: string
  diaActual: number
  eventos: EventoAgenda[]
}

export type EstadoTarea = 'completada' | 'en_curso' | 'pendiente'

export interface TareaChecklist {
  id: string
  tarea: string
  responsable: string
  estado: EstadoTarea
  obligatoria: boolean
}

/** Checklist operativa de un caso, instanciada desde la plantilla por juicio. */
export interface ChecklistCaso extends CamposTenencia {
  id: string
  casoId: string
  cliente: string
  plantilla: string
  practica: PracticaLegal
  tareas: TareaChecklist[]
}

export type AutorMensaje = 'despacho' | 'hermes' | 'cliente'

export interface MensajeCaso {
  id: string
  /** Fecha ya formateada. */
  fecha: string
  autor: AutorMensaje
  texto: string
  /** 'sugerido' = borrador de Hermes pendiente de aprobación humana. */
  estado: 'enviado' | 'sugerido'
}

export interface ComunicacionCaso extends CamposTenencia {
  casoId: string
  cliente: string
  abogado: string
  mensajes: MensajeCaso[]
}
