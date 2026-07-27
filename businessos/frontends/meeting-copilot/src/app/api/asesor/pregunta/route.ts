// Motor llm del Meeting Coach: redacta la siguiente mejor pregunta con el
// contexto de la conversación. La clave vive SOLO en el servidor
// (OPENROUTER_API_KEY); el cliente jamás la ve. Sin clave → 503 con mensaje
// claro y el Prompter cae al banco del playbook (fallo visible, nunca roto).

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { SYSTEM_PREGUNTA, construirUsuarioPregunta, parsearRespuestaPregunta } from '@/features/agents/prompt-pregunta'

const Cuerpo = z.object({
  dimension: z.string().min(1),
  motivo: z.string(),
  preguntaBanco: z.string().min(1),
  tipoReunion: z.string().min(1),
  leadNombre: z.string().nullable(),
  contexto: z.array(z.object({ hablante: z.string(), texto: z.string().max(600) })).max(40),
  preguntasPrevias: z.array(z.string()).max(12),
  briefContexto: z.string().max(2000).optional(),
})

// Modelo barato/rápido por defecto (doctrina de ruteo del proyecto); override por env.
const MODELO_DEFAULT = 'google/gemini-2.5-flash-lite'

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENROUTER_API_KEY no está configurada en el servidor (.env.local). El Prompter usará el banco del playbook.' },
      { status: 503 }
    )
  }

  const json = await req.json().catch(() => null)
  const parsed = Cuerpo.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Cuerpo inválido para /api/asesor/pregunta.' }, { status: 400 })
  }

  const modelo = process.env.ASESOR_LLM_MODEL ?? MODELO_DEFAULT
  const controlador = new AbortController()
  const timeout = setTimeout(() => controlador.abort(), 9000)

  try {
    const respuesta = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controlador.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelo,
        temperature: 0.4,
        max_tokens: 220,
        messages: [
          { role: 'system', content: SYSTEM_PREGUNTA },
          { role: 'user', content: construirUsuarioPregunta(parsed.data) },
        ],
      }),
    })

    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '')
      return NextResponse.json(
        { error: `OpenRouter respondió ${respuesta.status}: ${detalle.slice(0, 160)}` },
        { status: 502 }
      )
    }

    const data = (await respuesta.json()) as { choices?: { message?: { content?: string } }[] }
    const contenido = data.choices?.[0]?.message?.content ?? ''
    const resultado = parsearRespuestaPregunta(contenido)
    if (!resultado) {
      return NextResponse.json({ error: 'El modelo no devolvió JSON válido.' }, { status: 502 })
    }
    return NextResponse.json({ ...resultado, modelo })
  } catch (e) {
    const mensaje = e instanceof Error && e.name === 'AbortError' ? 'Timeout (9 s) llamando al modelo.' : String(e)
    return NextResponse.json({ error: mensaje }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}
