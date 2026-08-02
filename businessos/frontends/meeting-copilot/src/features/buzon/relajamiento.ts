// Relajamiento progresivo por evidencia (SPEC-buzon-a2a §11.9). Regla
// DETERMINISTA, no criterio de modelo — se PROPONE, nunca se aplica sola.
//
//   SI clase C acumula ≥25 aprobaciones consecutivas sin una sola edición
//   Y ninguna verificación crítica se disparó en esas 25
//   Y el buzón lleva ≥30 días en ACTIVO
//   ENTONCES el sistema PROPONE envío directo.
//
// Reversión automática: 2 rechazos en la misma clase tras el relajamiento y
// vuelve sola a exigir aprobación.

export const RACHA_MINIMA_RELAJAMIENTO = 25
export const DIAS_MINIMOS_ACTIVO_RELAJAMIENTO = 30
export const RECHAZOS_PARA_REVERSION = 2

/** Un renglón de la historia de decisiones de A5 sobre una clase, en orden
 *  cronológico. `editado` = el aprobador cambió el borrador antes de aprobar
 *  (rompe la racha); `verificacionCriticaDisparada` = alguna verificación
 *  CRÍTICA se disparó sobre este correo (aunque terminara aprobado). */
export interface DecisionAprobacion {
  editado: boolean
  verificacionCriticaDisparada: boolean
}

export interface RachaRelajamiento {
  racha: number
  verificacionCriticaEnRacha: boolean
}

/** Cuenta la racha TRAILING (desde la decisión más reciente hacia atrás) de
 *  aprobaciones sin edición. Un editado corta la racha en seco: por eso "25
 *  aprobaciones con una edición en medio" nunca produce racha ≥ 25. */
export function rachaSinEdicion(decisiones: DecisionAprobacion[]): RachaRelajamiento {
  let racha = 0
  let verificacionCriticaEnRacha = false
  for (let i = decisiones.length - 1; i >= 0; i -= 1) {
    const d = decisiones[i]
    if (d.editado) break
    racha += 1
    if (d.verificacionCriticaDisparada) verificacionCriticaEnRacha = true
  }
  return { racha, verificacionCriticaEnRacha }
}

/** Evalúa la regla de §11.9 sobre el historial completo de una clase. Función
 *  pura: la UI la usa tanto para decidir si mostrar la tarjeta de propuesta
 *  como para los tests de límite. */
export function proponeRelajamiento(decisiones: DecisionAprobacion[], diasActivo: number): boolean {
  const { racha, verificacionCriticaEnRacha } = rachaSinEdicion(decisiones)
  return racha >= RACHA_MINIMA_RELAJAMIENTO && !verificacionCriticaEnRacha && diasActivo >= DIAS_MINIMOS_ACTIVO_RELAJAMIENTO
}

/** Reversión automática (§11.9): 2 rechazos consecutivos en la misma clase
 *  tras aplicar el relajamiento devuelven la clase a exigir aprobación. */
export function debeRevertirRelajamiento(rechazosConsecutivosTrasRelajamiento: number): boolean {
  return rechazosConsecutivosTrasRelajamiento >= RECHAZOS_PARA_REVERSION
}

// ─── Persistencia (espejo de `buzon_relajamientos`) ────────────────────────

export type EstadoRelajamiento = 'propuesto' | 'aplicado' | 'mantenido' | 'recordar_despues' | 'revertido'

export interface Relajamiento {
  id: string
  buzonId: string
  clase: string
  estado: EstadoRelajamiento
  /** La evidencia que sustentó la propuesta — SIEMPRE visible en la tarjeta y en bitácora. */
  evidencia: { rachaAprobaciones: number; diasActivo: number }
  propuestoEn: string
  decididoPor: string | null
  decididoEn: string | null
  revertidoEn: string | null
  revertidoMotivo: string | null
}
