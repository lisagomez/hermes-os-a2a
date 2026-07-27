// Discovery Analyst (motor llm): análisis completo de una transcripción real.
// Clave SOLO server-side; sin clave → 503 y el cliente se queda con el motor
// de reglas, con aviso visible.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { SYSTEM_INSIGHTS, construirUsuarioInsights } from '@/features/agents/prompt-insights'
import type { Reunion, Segmento } from '@/features/domain/types'

const Cuerpo = z.object({
  reunion: z.object({
    id: z.string(),
    titulo: z.string(),
    cuenta: z.string(),
    tipoReunion: z.string(),
    participantes: z.array(z.object({ nombre: z.string(), rol: z.string(), lado: z.string() })),
  }),
  segmentos: z
    .array(z.object({ inicioS: z.number(), finS: z.number(), hablante: z.string(), texto: z.string().max(800), confianza: z.number() }))
    .min(1)
    .max(120),
})

const MODELO_DEFAULT = 'google/gemini-2.5-flash-lite'

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENROUTER_API_KEY no está configurada en el servidor (.env.local): el análisis usa el motor de reglas.' },
      { status: 503 }
    )
  }

  const json = await req.json().catch(() => null)
  const parsed = Cuerpo.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: 'Cuerpo inválido para /api/asesor/insights.' }, { status: 400 })

  const modelo = process.env.ASESOR_LLM_MODEL ?? MODELO_DEFAULT
  const controlador = new AbortController()
  const timeout = setTimeout(() => controlador.abort(), 25_000)

  try {
    const respuesta = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controlador.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelo,
        temperature: 0.2,
        max_tokens: 1800,
        messages: [
          { role: 'system', content: SYSTEM_INSIGHTS },
          {
            role: 'user',
            content: construirUsuarioInsights(parsed.data.reunion as unknown as Reunion, parsed.data.segmentos as Segmento[]),
          },
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
    // Reutiliza el extractor defensivo de JSON (directo o embebido en markdown).
    const objeto = extraerJson(contenido)
    if (!objeto) return NextResponse.json({ error: 'El modelo no devolvió JSON válido.' }, { status: 502 })
    // La VALIDACIÓN fuerte (evidencia contra la transcripción) ocurre en el
    // cliente con validarAnalisisIA — aquí solo se garantiza JSON bien formado.
    return NextResponse.json({
      analisis: objeto,
      modelo,
      usage: { tokensIn: data.usage?.prompt_tokens ?? 0, tokensOut: data.usage?.completion_tokens ?? 0 },
    })
  } catch (e) {
    const mensaje = e instanceof Error && e.name === 'AbortError' ? 'Timeout (25 s) llamando al modelo.' : String(e)
    return NextResponse.json({ error: mensaje }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}

function extraerJson(texto: string): unknown | null {
  try {
    return JSON.parse(texto)
  } catch {
    const m = texto.match(/\{[\s\S]*\}/)
    if (!m) return null
    try {
      return JSON.parse(m[0])
    } catch {
      return null
    }
  }
}
