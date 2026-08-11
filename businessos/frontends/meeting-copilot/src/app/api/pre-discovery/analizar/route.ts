// Análisis IA de un bloque de Pre-Discovery. Mismo seam que /api/asesor/*:
// OPENROUTER_API_KEY solo en servidor; sin clave → 503 y el pipeline cae al
// mock con aviso visible. Devuelve `usage` para el ledger de costeo del activo.
// La llamada al modelo vive en features/agents/analista-prediscovery para que el
// smoke real pueda ejercitar el MISMO camino que corre en producción.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ESQUEMAS_BLOQUE, type BloqueLLM } from '@/features/agents/prompt-prediscovery'
import { TIMEOUT_MS, analizarBloque } from '@/features/agents/analista-prediscovery'
import { IntakeSchema } from '@/features/pre-discovery/intake-schema'

const Cuerpo = z.object({
  bloque: z.enum(Object.keys(ESQUEMAS_BLOQUE) as [BloqueLLM, ...BloqueLLM[]]),
  intake: IntakeSchema,
  textoSitio: z.string().max(25_000).optional(),
  perfilPrevio: z.unknown().optional(),
  competenciaPrevia: z.unknown().optional(),
  bloquesPrevios: z.unknown().optional(),
})

const MODELO_DEFAULT = 'google/gemini-2.5-flash-lite'

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENROUTER_API_KEY no está configurada: el pipeline usará el análisis demo (mock).' },
      { status: 503 }
    )
  }

  const json = await req.json().catch(() => null)
  const parsed = Cuerpo.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: 'Cuerpo inválido para /api/pre-discovery/analizar.' }, { status: 400 })

  const { bloque, intake, textoSitio, perfilPrevio, competenciaPrevia, bloquesPrevios } = parsed.data
  let modelo = process.env.ASESOR_LLM_MODEL ?? MODELO_DEFAULT
  // Deep research de competidores: el bloque de competencia corre con búsqueda
  // web del proveedor (sufijo :online de OpenRouter) — investiga el sector real
  // del lead, no arquetipos. Encendido POR DEFECTO: sin él, el benchmark salía
  // genérico ("arquetipos del segmento") y era la queja #1 del diagnóstico.
  // PREDISCOVERY_ONLINE=0 lo apaga explícitamente (control de costo).
  if (bloque === 'competencia' && process.env.PREDISCOVERY_ONLINE !== '0' && !modelo.includes(':online')) {
    modelo = `${modelo}:online`
  }

  const controlador = new AbortController()
  const timeout = setTimeout(() => controlador.abort(), TIMEOUT_MS)

  try {
    const r = await analizarBloque(
      bloque,
      { intake, textoSitio, perfilPrevio, competenciaPrevia, bloquesPrevios },
      { apiKey, modelo, signal: controlador.signal }
    )
    if (!r.ok) return NextResponse.json({ error: r.motivo }, { status: r.estado })
    return NextResponse.json({
      bloque,
      datos: r.datos,
      degradados: r.degradados,
      modelo,
      usage: { tokensIn: r.tokensIn, tokensOut: r.tokensOut },
      reintentos: r.reintentos,
    })
  } catch (e) {
    const mensaje = e instanceof Error && e.name === 'AbortError' ? `Timeout (${TIMEOUT_MS / 1000} s) llamando al modelo.` : String(e)
    console.warn(`[pre-discovery/${bloque}] error: ${mensaje}`)
    return NextResponse.json({ error: mensaje }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}
