import { createClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/auth-utils'

const CLAUDECLAW_URL = process.env.CLAUDECLAW_URL ?? 'http://localhost:3099'
const CLAUDECLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? ''

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  if (!(await hasRole(user.id, 'owner', 'admin'))) {
    return new Response(JSON.stringify({ error: 'Forbidden: Chat access requires owner or admin role' }), { status: 403 })
  }

  // Parse body: { sessionId? } — opcional para multi-session interrupt.
  // Sin body o body vacio: comportamiento legacy (ClaudeClaw aborta todas las sesiones activas).
  let body: { sessionId?: string } = {}
  try { body = (await request.json()) as { sessionId?: string } } catch { /* tolerar body vacio */ }

  const upstreamBody = typeof body.sessionId === 'string' && body.sessionId.length > 0
    ? { sessionId: body.sessionId }
    : {}

  try {
    const upstream = await fetch(`${CLAUDECLAW_URL}/chat/interrupt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CLAUDECLAW_TOKEN}`,
      },
      body: JSON.stringify(upstreamBody),
      signal: AbortSignal.timeout(10_000),
    })

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: `ClaudeClaw returned ${upstream.status}` }),
        { status: 502 },
      )
    }
    const data = await upstream.json()
    return Response.json(data)
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'ClaudeClaw unreachable' }),
      { status: 502 },
    )
  }
}
