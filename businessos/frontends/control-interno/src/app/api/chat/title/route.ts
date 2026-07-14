import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/auth-utils'

const NEXOS_API_KEY = process.env.NEXOS_API_KEY
// Nexos Gemini 3 Flash Preview
const GEMINI_MODEL = '3389c8b2-1f9a-4ddf-9875-ae2f3d6b8b29'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await hasRole(user.id, 'owner', 'admin'))) {
    return NextResponse.json({ error: 'Forbidden: Chat access requires owner or admin role' }, { status: 403 })
  }

  const { message } = await req.json() as { message?: string }
  if (!message?.trim()) {
    return NextResponse.json({ title: 'Nueva conversación' })
  }

  // Fallback: truncate if AI not available
  if (!NEXOS_API_KEY) {
    const title = message.slice(0, 55) + (message.length > 55 ? '…' : '')
    return NextResponse.json({ title })
  }

  try {
    const res = await fetch('https://api.nexos.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NEXOS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Genera un título conciso de 3 a 6 palabras para esta conversación basándote en el primer mensaje del usuario. ' +
              'Responde SOLO el título, sin comillas, sin punto al final, sin explicaciones. ' +
              'Usa el mismo idioma del mensaje. El título debe ser descriptivo y específico, no genérico.',
          },
          { role: 'user', content: message.slice(0, 600) },
        ],
        max_tokens: 25,
        temperature: 0.4,
      }),
    })

    if (!res.ok) throw new Error(`Nexos ${res.status}`)

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    const raw = data.choices?.[0]?.message?.content?.trim() ?? ''

    // Sanitize: remove quotes, limit length
    const title = raw.replace(/^["'«»]|["'«»]$/g, '').trim().slice(0, 80)
    return NextResponse.json({ title: title || message.slice(0, 55) })
  } catch {
    // Silent fallback
    const title = message.slice(0, 55) + (message.length > 55 ? '…' : '')
    return NextResponse.json({ title })
  }
}
