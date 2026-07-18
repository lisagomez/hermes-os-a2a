import { createClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/auth-utils'

const CLAUDECLAW_URL = process.env.CLAUDECLAW_URL ?? 'http://localhost:3099'
const CLAUDECLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? ''

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  if (!(await hasRole(user.id, 'owner', 'admin'))) {
    return new Response(JSON.stringify({ error: 'Forbidden: Chat access requires owner or admin role' }), { status: 403 })
  }

  try {
    const upstream = await fetch(`${CLAUDECLAW_URL}/efforts`, {
      headers: { Authorization: `Bearer ${CLAUDECLAW_TOKEN}` },
      signal: AbortSignal.timeout(15_000),
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      return new Response(text, { status: upstream.status })
    }

    const data = await upstream.json()
    return Response.json(data)
  } catch {
    return new Response(
      JSON.stringify({ error: 'ClaudeClaw unreachable' }),
      { status: 503 },
    )
  }
}
