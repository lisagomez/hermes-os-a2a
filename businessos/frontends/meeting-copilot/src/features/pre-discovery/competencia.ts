// Benchmark de competidores: el contrato zod acepta listas vacías a propósito
// (el modelo NO debe inventar competidores con nombre propio sin señal), pero
// una salida sin UNA sola fila no es un resultado "listo": es no-concluyente y
// la UI debe decirlo con el aviso honesto, no con una tabla vacía que aparenta
// análisis. Lógica pura para poder testearla bajo el runner sin navegador.
import type { DatosCompetencia, EstadoBloque } from './types'

/** true cuando el bloque de competencia no aporta NINGUNA fila (ni competidores
 *  ni comparativa) — incluye datos null (el mock honesto ya declara null). */
export function competenciaNoConcluyente(datos: unknown): boolean {
  const d = datos as DatosCompetencia | null | undefined
  if (!d) return true
  return (d.competidores?.length ?? 0) === 0 && (d.comparativa?.length ?? 0) === 0
}

/** Estado del bloque tras un análisis LLM válido: solo el bloque de competencia
 *  puede degradar a no_concluyente por salida vacía; el resto queda listo (sus
 *  contratos ya exigen mínimos con .min(1) donde aplica). */
export function estadoBloqueAnalizado(bloque: string, datos: unknown): EstadoBloque {
  return bloque === 'competencia' && competenciaNoConcluyente(datos) ? 'no_concluyente' : 'listo'
}
