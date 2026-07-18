import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/auth-utils'

const CLAUDECLAW_URL = process.env.CLAUDECLAW_URL ?? 'http://localhost:3099'
const CLAUDECLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? ''

export async function POST(request: Request) {
  // Require authenticated session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await hasRole(user.id, 'owner', 'admin'))) {
    return NextResponse.json({ error: 'Forbidden: Chat access requires owner or admin role' }, { status: 403 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const endpoint = body['action'] === 'newchat' ? '/newchat' : '/chat'

  try {
    const res = await fetch(`${CLAUDECLAW_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CLAUDECLAW_TOKEN}`,
      },
      body: JSON.stringify({ message: body['message'] }),
      // 10 min timeout — matches ClaudeClaw AGENT_TIMEOUT_MS
      signal: AbortSignal.timeout(600_000),
    })

    const data: unknown = await res.json()
    // Pass through all fields including compact metadata and slashCommands
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Agent timeout — try again' }, { status: 504 })
    }
    return NextResponse.json(
      { error: 'ClaudeClaw unreachable. Make sure it is running locally.' },
      { status: 503 },
    )
  }
}
