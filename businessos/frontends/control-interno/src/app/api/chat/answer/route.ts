import { createClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/auth-utils'

const CLAUDECLAW_URL = process.env.CLAUDECLAW_URL ?? 'http://localhost:3099'
const CLAUDECLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? ''

// Respuesta a una pregunta interactiva del agente (AskUserQuestion).
// Proxy fino al daemon: resuelve la promesa de canUseTool y el turno continúa.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  if (!(await hasRole(user.id, 'owner', 'admin'))) {
    return new Response(JSON.stringify({ error: 'Forbidden: Chat access requires owner or admin role' }), { status: 403 })
  }

  let body: { requestId?: string; answers?: Record<string, string> } = {}
  try {
    body = (await request.json()) as typeof body
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  if (typeof body.requestId !== 'string' || !body.requestId) {
    return new Response(JSON.stringify({ error: 'requestId required' }), { status: 400 })
  }

  try {
    const upstream = await fetch(`${CLAUDECLAW_URL}/chat/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CLAUDECLAW_TOKEN}`,
      },
      body: JSON.stringify({
        requestId: body.requestId,
        ...(body.answers && typeof body.answers === 'object' ? { answers: body.answers } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    })
    const data = await upstream.json().catch(() => ({ ok: false }))
    return new Response(JSON.stringify(data), { status: upstream.status })
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'ClaudeClaw unreachable' }),
      { status: 502 },
    )
  }
}
