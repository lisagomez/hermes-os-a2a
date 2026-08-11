// Analista de Pre-Discovery (motor llm): prompts POR BLOQUE + validación de
// contrato. Doctrina: la IA propone, el contrato verifica — separación dura
// hecho/hipótesis/recomendación; un "hecho" sin evidencia citada se DEGRADA a
// hipótesis (se cuenta y se declara); forma inválida → null (jamás se adivina).

import { z } from 'zod'
import type { BloqueId, IntakeLead } from '@/features/pre-discovery/types'

export const SYSTEM_PREDISCOVERY = `Eres un analista de competidores y estratega comercial senior preparando a un asesor ANTES de una entrevista de discovery (español de México). Trabajas SOLO con la información provista (intake del lead y, si existe, el texto de su sitio web).

Reglas duras:
- Separas SIEMPRE tres naturalezas: "hecho" (observado en el material provisto, con cita textual en "evidencia"), "hipotesis" (inferencia razonable tuya, SIN evidencia inventada) y "recomendacion" (consejo accionable al asesor).
- Un hecho SIN evidencia textual no es un hecho: márcalo hipotesis.
- No inventes competidores con nombre propio si no tienes señal; describe ARQUETIPOS del segmento y márcalos con confianza acorde.
- Tono ejecutivo, frases cortas, cero relleno.
- Responde SOLO el objeto JSON pedido, sin markdown.`

const ITEM = z.object({
  texto: z.string().min(3).max(400),
  naturaleza: z.enum(['hecho', 'hipotesis', 'recomendacion']),
  evidencia: z.string().min(3).max(400).optional(),
})

const CONFIANZA = z.enum(['alta', 'media', 'baja'])

export const ESQUEMAS_BLOQUE = {
  perfil: z.object({
    empresaNormalizada: z.string().min(1).max(120),
    descripcion: z.string().min(10).max(600),
    industria: z.string().min(2).max(120),
    orientacion: z.enum(['servicios', 'productos', 'ambos']),
    resumenEjecutivo: z.string().min(10).max(800),
  }),
  sitio: z.object({
    servicios: z.array(ITEM).max(15),
    propuestaValor: ITEM,
    claims: z.array(ITEM).max(10),
    segmentosObjetivo: z.array(ITEM).max(8),
    madurezDigital: z.object({ nivel: CONFIANZA, senales: z.array(ITEM).max(8) }),
    vacios: z.array(ITEM).max(8),
  }),
  competencia: z.object({
    competidores: z
      .array(
        z.object({
          nombre: z.string().min(2).max(160),
          url: z.string().nullable(),
          posicionamiento: z.string().min(3).max(300),
          servicios: z.array(z.string().max(120)).max(10),
          diferenciadores: z.array(z.string().max(160)).max(8),
          madurez: CONFIANZA,
          confianza: CONFIANZA,
        })
      )
      .max(6),
    comparativa: z.array(z.object({ dimension: z.string().max(60), lead: z.string().max(300), lectura: z.string().max(400) })).max(6),
  }),
  diferenciacion: z.object({
    oportunidades: z
      .array(z.object({ titulo: z.string().max(120), gapCompetitivo: z.string().max(300), linea: z.string().max(400), naturaleza: z.enum(['hecho', 'hipotesis', 'recomendacion']) }))
      .min(1)
      .max(6),
  }),
  foda: z.object({
    fortalezas: z.array(ITEM).max(6),
    oportunidades: z.array(ITEM).max(6),
    debilidades: z.array(ITEM).max(6),
    amenazas: z.array(ITEM).max(6),
  }),
  tecnologia: z.object({
    stackVisible: z.array(ITEM).max(8),
    madurezDigital: CONFIANZA,
    herramientasProbables: z.array(ITEM).max(8),
    oportunidadesAutomatizacion: z.array(ITEM).max(8),
  }),
  brief: z.object({
    resumen: z.string().min(10).max(800),
    angulos: z.array(ITEM).max(6),
    hipotesis: z.array(ITEM).max(8),
    riesgos: z.array(ITEM).max(6),
    preguntasRecomendadas: z.array(z.string().min(5).max(300)).min(2).max(8),
    temasSensibles: z.array(ITEM).max(5),
    siguientePaso: z.string().min(5).max(300),
  }),
} as const

export type BloqueLLM = keyof typeof ESQUEMAS_BLOQUE

export function esBloqueLLM(b: BloqueId): b is BloqueLLM {
  return b in ESQUEMAS_BLOQUE
}

const INSTRUCCION_BLOQUE: Record<BloqueLLM, string> = {
  perfil: 'Consolida el PERFIL del lead: nombre normalizado, descripción clara del negocio, industria, orientación (servicios/productos/ambos) y un resumen ejecutivo de 2-3 frases orientado al asesor.',
  sitio: 'Analiza el TEXTO DEL SITIO provisto: servicios ofrecidos (hechos con cita), propuesta de valor visible, claims comerciales, segmentos objetivo, señales de madurez digital, y vacíos/ambigüedades del posicionamiento.',
  competencia: 'Actúa como analista de competidores: identifica competidores razonables del lead (nombres reales SOLO si el material los menciona; si no, arquetipos del segmento con confianza media/baja) y produce una comparativa por dimensión (posicionamiento, servicios, diferenciadores, madurez) con LECTURA del analista, no dumping.',
  diferenciacion: 'Con el perfil y el benchmark previos, propone oportunidades de diferenciación: título, gap competitivo que explota, y línea de acción comercial. Todas naturaleza "recomendacion" salvo que cites un hecho.',
  foda: 'Genera un FODA del lead. Fortalezas/debilidades internas, oportunidades/amenazas externas. Cada punto con su naturaleza (hechos solo con evidencia).',
  tecnologia: 'Infiere el marco tecnológico probable: stack visible (hechos solo si el texto del sitio lo muestra), madurez digital, herramientas probables por tipo de operación, y oportunidades de automatización (recomendaciones).',
  brief: 'Produce el BRIEF DEL ASESOR consumible en 3 minutos antes de la llamada: resumen, ángulos de conversación, hipótesis a validar, riesgos, 4-6 preguntas recomendadas para la entrevista, temas sensibles a cuidar, y el siguiente paso recomendado.',
}

export interface ContextoAnalisis {
  intake: IntakeLead
  textoSitio?: string
  perfilPrevio?: unknown
  competenciaPrevia?: unknown
  bloquesPrevios?: unknown // p. ej. para el brief: foda + diferenciación
}

/** Describe un esquema zod como texto compacto para el prompt. Se DERIVA del
 *  esquema, nunca se escribe a mano: si el contrato cambia, la forma que se le
 *  pide al modelo cambia con él (no puede desincronizarse en silencio). */
export function describirEsquema(esquema: z.ZodTypeAny): string {
  const def = esquema._def as { typeName?: string; [k: string]: unknown }
  switch (def.typeName) {
    case 'ZodObject': {
      const shape = (esquema as unknown as z.ZodObject<z.ZodRawShape>).shape
      const campos = Object.entries(shape).map(([clave, valor]) => {
        const v = valor as z.ZodTypeAny
        const opcional = v.isOptional() ? '?' : ''
        return `"${clave}"${opcional}: ${describirEsquema(v)}`
      })
      return `{${campos.join(', ')}}`
    }
    case 'ZodArray': {
      const elemento = describirEsquema(def.type as z.ZodTypeAny)
      const max = (def.maxLength as { value: number } | null)?.value
      const min = (def.minLength as { value: number } | null)?.value
      const limites = [min !== undefined ? `mín ${min}` : '', max !== undefined ? `máx ${max}` : ''].filter(Boolean).join(', ')
      return `[${elemento}]${limites ? ` (${limites} elementos)` : ''}`
    }
    case 'ZodOptional':
    case 'ZodNullable':
      return describirEsquema(def.innerType as z.ZodTypeAny)
    case 'ZodEnum':
      return (def.values as string[]).map((v) => `"${v}"`).join('|')
    case 'ZodString': {
      const checks = (def.checks ?? []) as { kind: string; value: number }[]
      const min = checks.find((c) => c.kind === 'min')?.value
      const max = checks.find((c) => c.kind === 'max')?.value
      const rango = min !== undefined || max !== undefined ? ` (${min ?? 0}-${max ?? '∞'} caracteres)` : ''
      return `string${rango}`
    }
    case 'ZodNumber':
      return 'number'
    case 'ZodBoolean':
      return 'boolean'
    default:
      return 'valor'
  }
}

// Presupuesto de texto del sitio POR BLOQUE: `sitio` y `perfil` leen el material
// crudo (más texto = más hechos citables); los bloques derivados razonan sobre
// los bloques previos y con 6k les alcanza. La compilación junta hasta 24k —
// truncar todo a 6k tiraba dos tercios de lo compilado justo donde más pesa.
const PRESUPUESTO_SITIO: Partial<Record<BloqueLLM, number>> = { sitio: 14_000, perfil: 10_000, tecnologia: 10_000 }

export function construirUsuarioBloque(bloque: BloqueLLM, c: ContextoAnalisis): string {
  const partes = [
    `TAREA: ${INSTRUCCION_BLOQUE[bloque]}`,
    '',
    `INTAKE DEL LEAD: empresa/giro: ${c.intake.giro} · modelo de negocio: ${c.intake.modeloNegocio || 'no proporcionado'} · tamaño: ${c.intake.tamano} · país: ${c.intake.pais} · dirección: ${c.intake.direccion || 'no proporcionada'} · web: ${c.intake.web || 'no proporcionada'} · linkedin del contacto: ${c.intake.linkedin || 'no proporcionado'} · notas: ${c.intake.notas || '—'}`,
  ]
  if (c.textoSitio) partes.push('', `TEXTO DEL SITIO DEL LEAD (extracto):`, c.textoSitio.slice(0, PRESUPUESTO_SITIO[bloque] ?? 6000))
  else partes.push('', 'SIN TEXTO DEL SITIO: no marques nada como hecho salvo lo que venga del intake.')
  if (c.perfilPrevio) partes.push('', `PERFIL YA CONSOLIDADO: ${JSON.stringify(c.perfilPrevio).slice(0, 1500)}`)
  if (c.competenciaPrevia) partes.push('', `BENCHMARK YA PRODUCIDO: ${JSON.stringify(c.competenciaPrevia).slice(0, 2500)}`)
  if (c.bloquesPrevios) partes.push('', `ANÁLISIS PREVIO (para consistencia): ${JSON.stringify(c.bloquesPrevios).slice(0, 2500)}`)
  partes.push(
    '',
    `FORMA EXACTA del JSON de salida (objeto RAÍZ, sin envolverlo en {"${bloque}": …}, sin markdown):`,
    describirEsquema(ESQUEMAS_BLOQUE[bloque]),
    '',
    `Responde SOLO ese JSON. Usa EXACTAMENTE esos nombres de clave y respeta los límites indicados.`
  )
  return partes.join('\n')
}

export interface ResultadoValidacion {
  datos: unknown
  /** Cuántos "hechos" sin evidencia se degradaron a hipótesis (se declara en UI). */
  degradados: number
}

/** Valida la salida del modelo. Forma inválida → null. Hecho sin evidencia → hipótesis. */
export function validarBloqueIA(bloque: BloqueLLM, crudo: unknown): ResultadoValidacion | null {
  const parsed = ESQUEMAS_BLOQUE[bloque].safeParse(crudo)
  if (!parsed.success) return null
  let degradados = 0
  const degradar = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(degradar)
    if (v !== null && typeof v === 'object') {
      const o = { ...(v as Record<string, unknown>) }
      if (o.naturaleza === 'hecho' && (typeof o.evidencia !== 'string' || o.evidencia.length < 3)) {
        o.naturaleza = 'hipotesis'
        degradados += 1
      }
      for (const k of Object.keys(o)) o[k] = degradar(o[k])
      return o
    }
    return v
  }
  return { datos: degradar(parsed.data), degradados }
}
