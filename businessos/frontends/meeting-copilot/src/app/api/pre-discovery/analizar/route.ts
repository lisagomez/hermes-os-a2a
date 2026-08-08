// Análisis IA de un bloque de Pre-Discovery. Mismo seam que /api/asesor/*:
// OPENROUTER_API_KEY solo en servidor; sin clave → 503 y el pipeline cae al
// mock con aviso visible. Devuelve `usage` para el ledger de costeo del activo.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  ESQUEMAS_BLOQUE,
  SYSTEM_PREDISCOVERY,
  construirUsuarioBloque,
  validarBloqueIA,
  type BloqueLLM,
} from '@/features/agents/prompt-prediscovery'
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
  // Deep research de competidores: con PREDISCOVERY_ONLINE=1, el bloque de
  // competencia corre con búsqueda web del proveedor (sufijo :online de
  // OpenRouter) — investiga el sector real del lead, no arquetipos.
  if (bloque === 'competencia' && process.env.PREDISCOVERY_ONLINE === '1' && !modelo.includes(':online')) {
    modelo = `${modelo}:online`
  }
  const controlador = new AbortController()
  const timeout = setTimeout(() => controlador.abort(), 30_000)

  try {
    const respuesta = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controlador.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelo,
        temperature: 0.3,
        max_tokens: 1600,
        messages: [
          { role: 'system', content: SYSTEM_PREDISCOVERY },
          { role: 'user', content: construirUsuarioBloque(bloque, { intake, textoSitio, perfilPrevio, competenciaPrevia, bloquesPrevios }) },
        ],
      }),
    })

    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '')
      return NextResponse.json({ error: `OpenRouter respondió ${respuesta.status}: ${detalle.slice(0, 160)}` }, { status: 502 })
    }

    const data = (await respuesta.json()) as {
      choices?: { message?: { content?: string } }[]
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }
    const contenido = data.choices?.[0]?.message?.content ?? ''
    let crudo: unknown = null
    try {
      crudo = JSON.parse(contenido)
    } catch {
      const m = contenido.match(/\{[\s\S]*\}/)
      if (m) {
        try {
          crudo = JSON.parse(m[0])
        } catch {
          crudo = null
        }
      }
    }
    if (crudo === null) return NextResponse.json({ error: 'El modelo no devolvió JSON válido.' }, { status: 502 })

    const validado = validarBloqueIA(bloque, crudo)
    if (!validado) return NextResponse.json({ error: `La respuesta del modelo no cumplió el contrato del bloque "${bloque}".` }, { status: 502 })

    return NextResponse.json({
      bloque,
      datos: validado.datos,
      degradados: validado.degradados,
      modelo,
      usage: { tokensIn: data.usage?.prompt_tokens ?? 0, tokensOut: data.usage?.completion_tokens ?? 0 },
    })
  } catch (e) {
    const mensaje = e instanceof Error && e.name === 'AbortError' ? 'Timeout (30 s) llamando al modelo.' : String(e)
    return NextResponse.json({ error: mensaje }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}
