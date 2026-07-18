import { createClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/auth-utils'

const CLAUDECLAW_URL = process.env.CLAUDECLAW_URL ?? 'http://localhost:3099'
const CLAUDECLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? ''

// Resume de un turno EN VUELO (estilo Anthropic): si el daemon tiene un stream
// activo para la sesión, devuelve SSE con replay del buffer + tail en vivo —
// reabrir la app a mitad del streaming lo reengancha justo donde va. Si no hay
// turno vivo, responde JSON {live:false} y el cliente reconcilia desde la BD.
// Mismo techo que /api/chat/stream: el tail puede durar lo que dure el turno.
export const maxDuration = 300

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }
  if (!(await hasRole(user.id, 'owner', 'admin'))) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  try {
    const upstream = await fetch(`${CLAUDECLAW_URL}/chat/live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CLAUDECLAW_TOKEN}`,
      },
      body: JSON.stringify({
        ...(typeof body['chatSessionId'] === 'string' && { chatSessionId: body['chatSessionId'] }),
      }),
      signal: request.signal,
    })

    const contentType = upstream.headers.get('Content-Type') ?? ''
    if (!upstream.ok || !upstream.body || !contentType.includes('text/event-stream')) {
      // {live:false} o error del daemon — passthrough JSON
      const text = await upstream.text()
      return new Response(text, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return new Response(null, { status: 499 })
    }
    // Daemon inalcanzable: para el cliente equivale a "no hay turno vivo".
    return new Response(JSON.stringify({ live: false, error: 'ClaudeClaw unreachable' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
