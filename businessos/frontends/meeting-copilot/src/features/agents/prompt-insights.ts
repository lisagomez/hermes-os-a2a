// Discovery Analyst con motor llm: extracción de insights y evaluación de
// dimensiones sobre la transcripción REAL. Regla de oro aplicada por diseño:
// cada afirmación debe referenciar el segmento que la respalda; la validación
// (validarAnalisisIA) DESCARTA todo hallazgo con evidencia inválida — la IA
// propone, el contrato verifica.

import { z } from 'zod'
import type { DimensionScore, Insight, Reunion, Segmento } from '@/features/domain/types'

const CATEGORIAS = [
  'pain',
  'objetivo',
  'necesidad_explicita',
  'necesidad_implicita',
  'riesgo',
  'objecion',
  'herramienta_actual',
  'competidor',
  'stakeholder',
  'presupuesto',
  'urgencia',
  'proceso_decision',
  'senal_compra',
  'proximo_paso',
  'pregunta_sin_responder',
] as const

const DIMENSIONES = [
  'problema',
  'impacto',
  'urgencia',
  'proceso_decision',
  'stakeholders',
  'presupuesto',
  'competencia',
  'proximos_pasos',
] as const

export const SYSTEM_INSIGHTS = `Eres el Discovery Analyst de un copiloto comercial (español de México). Analizas la transcripción de una reunión de ventas y extraes SOLO lo que la conversación respalda — jamás inventes ni deduzcas sin base textual.

Responde SOLO un objeto JSON válido con esta forma exacta:
{"insights": [{"categoria": "<una de: pain, objetivo, necesidad_explicita, necesidad_implicita, riesgo, objecion, herramienta_actual, competidor, stakeholder, presupuesto, urgencia, proceso_decision, senal_compra, proximo_paso, pregunta_sin_responder>", "texto": "<hallazgo en una frase, fiel a lo dicho>", "segmentoIdx": <índice [n] del segmento que lo respalda>}],
 "dimensiones": [{"dimension": "<una de: problema, impacto, urgencia, proceso_decision, stakeholders, presupuesto, competencia, proximos_pasos>", "estado": "<cubierta|parcial|faltante>", "explicacion": "<una línea: por qué ese estado>", "segmentoIdx": <índice del segmento que lo evidencia, o null si faltante>}]}

Reglas duras:
- TODO insight lleva el segmentoIdx del segmento (el número entre corchetes) que lo respalda. Sin segmento que lo respalde, NO existe el insight.
- Las 8 dimensiones aparecen SIEMPRE, cada una con su estado y explicación.
- 'cubierta' exige evidencia sólida (p. ej. impacto CON cifras, decisor Y mecanismo); mención sin profundidad = 'parcial'; sin mención = 'faltante' con segmentoIdx null.
- Sé conservador: ante la duda, degrada el estado. No rellenes categorías sin hallazgos.`

export function construirUsuarioInsights(reunion: Reunion, segmentos: Segmento[]): string {
  const lineas = segmentos.map((s, i) => `[${i}] ${s.hablante}: ${s.texto}`).join('\n')
  const participantes = reunion.participantes.map((p) => `${p.nombre} (${p.rol}, ${p.lado})`).join(', ')
  return `Tipo de reunión: ${reunion.tipoReunion}. Cuenta: ${reunion.cuenta}.\nParticipantes: ${participantes}.\n\nTranscripción (segmentos numerados):\n${lineas}`
}

const EsquemaIA = z.object({
  insights: z
    .array(
      z.object({
        categoria: z.enum(CATEGORIAS),
        texto: z.string().min(3).max(400),
        segmentoIdx: z.number().int(),
      })
    )
    .max(60),
  dimensiones: z
    .array(
      z.object({
        dimension: z.enum(DIMENSIONES),
        estado: z.enum(['cubierta', 'parcial', 'faltante']),
        explicacion: z.string().min(3).max(300),
        segmentoIdx: z.number().int().nullable(),
      })
    )
    .max(8),
})

export interface AnalisisIA {
  insights: Insight[]
  dimensiones: Omit<DimensionScore, 'peso'>[]
  /** Hallazgos que la IA propuso pero se DESCARTARON por evidencia inválida. */
  descartados: number
}

/** Valida la salida del modelo contra el contrato y la transcripción real.
 *  Evidencia inválida (índice fuera de rango) → el hallazgo se descarta. */
export function validarAnalisisIA(crudo: unknown, reunionId: string, segmentos: Segmento[]): AnalisisIA | null {
  const parsed = EsquemaIA.safeParse(crudo)
  if (!parsed.success) return null

  let descartados = 0
  const evidenciaDe = (idx: number) => {
    const s = segmentos[idx]
    return { segmentoIdx: idx, inicioS: s.inicioS, cita: s.texto.length > 140 ? `${s.texto.slice(0, 137)}…` : s.texto }
  }

  const insights: Insight[] = []
  parsed.data.insights.forEach((i, n) => {
    if (i.segmentoIdx < 0 || i.segmentoIdx >= segmentos.length) {
      descartados += 1 // regla de oro: sin evidencia verificable no hay insight
      return
    }
    insights.push({
      id: `${reunionId}-ia${n}`,
      reunionId,
      categoria: i.categoria,
      texto: i.texto,
      evidencia: [evidenciaDe(i.segmentoIdx)],
      confianza: 'alta',
    })
  })

  const vistas = new Set<string>()
  const dimensiones: AnalisisIA['dimensiones'] = []
  for (const d of parsed.data.dimensiones) {
    if (vistas.has(d.dimension)) continue
    vistas.add(d.dimension)
    const idxValido = d.segmentoIdx !== null && d.segmentoIdx >= 0 && d.segmentoIdx < segmentos.length
    // Estado no-faltante SIN evidencia válida se degrada a faltante (no se confía a ciegas).
    const estado = d.estado !== 'faltante' && !idxValido ? 'faltante' : d.estado
    if (d.estado !== estado) descartados += 1
    dimensiones.push({
      dimension: d.dimension,
      estado,
      explicacion: d.explicacion,
      evidencia: idxValido && estado !== 'faltante' ? [evidenciaDe(d.segmentoIdx as number)] : [],
    })
  }
  if (dimensiones.length < 8) return null // contrato: las 8 dimensiones siempre

  return { insights, dimensiones, descartados }
}
