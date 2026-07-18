import { createClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/auth-utils'
import { isLocalDesktopUserId } from '@/lib/desktop-auth'
import { createServiceClient } from '@/lib/supabase/service'

const CLAUDECLAW_URL = process.env.CLAUDECLAW_URL ?? 'http://localhost:3099'
const CLAUDECLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? ''

async function requireChatUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { user: null, error: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (!(await hasRole(user.id, 'owner', 'admin'))) {
    return { user: null, error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user, error: null }
}

export async function GET(request: Request) {
  const auth = await requireChatUser()
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const limit = searchParams.get('limit') ?? '30'
  const source = searchParams.get('source')

  if (source === 'mc') {
    const service = createServiceClient()
    let query = service
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(Number(limit) || 30)

    if (auth.user && !isLocalDesktopUserId(auth.user.id)) {
      query = query.eq('profile_id', auth.user.id)
    }

    // Filtro por espacio de cuenta (solo cuando el cliente lo pide, para no
    // romper llamadas legacy sin el param).

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ sessions: data ?? [] })
  }

  try {
    const res = await fetch(`${CLAUDECLAW_URL}/sessions?limit=${limit}`, {
      headers: { Authorization: `Bearer ${CLAUDECLAW_TOKEN}` },
    })
    if (!res.ok) throw new Error(`ClaudeClaw ${res.status}`)
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json({ sessions: [], degraded: true, error: 'ClaudeClaw unreachable' })
  }
}

export async function POST(request: Request) {
  const auth = await requireChatUser()
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({})) as { title?: string; firstMessage?: string }
  const titleSource = body.title?.trim() || body.firstMessage?.trim() || 'Nueva conversacion'
  const title = titleSource.slice(0, 55) + (titleSource.length > 55 ? '...' : '')
  const service = createServiceClient()

  const { data, error } = await service
    .from('chat_sessions')
    .insert({
      title,
      profile_id: auth.user && !isLocalDesktopUserId(auth.user.id) ? auth.user.id : null,
    })
    .select('*')
    .single()

  if (error || !data) {
    return Response.json({ error: error?.message ?? 'Failed to create session' }, { status: 500 })
  }

  return Response.json({ session: data })
}

export async function PATCH(request: Request) {
  const auth = await requireChatUser()
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({})) as {
    sessionId?: string
    title?: string
    is_favorite?: boolean
    touch?: boolean
  }
  if (!body.sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (typeof body.title === 'string' && body.title.trim()) update.title = body.title.trim()
  if (typeof body.is_favorite === 'boolean') update.is_favorite = body.is_favorite
  if (body.touch) update.updated_at = new Date().toISOString()
  if (Object.keys(update).length === 0) return Response.json({ error: 'No update fields' }, { status: 400 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('chat_sessions')
    .update(update)
    .eq('id', body.sessionId)
    .select('*')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ session: data })
}

export async function DELETE(request: Request) {
  const auth = await requireChatUser()
  if (auth.error) return auth.error

  const body = await request.json().catch(() => ({})) as { sessionId?: string }
  if (!body.sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 })

  const service = createServiceClient()
  const { error } = await service.from('chat_sessions').delete().eq('id', body.sessionId)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
