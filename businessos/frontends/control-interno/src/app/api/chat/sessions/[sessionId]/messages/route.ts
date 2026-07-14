import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/auth-utils'
import { createServiceClient } from '@/lib/supabase/service'

const CLAUDECLAW_URL = process.env.CLAUDECLAW_URL ?? 'http://localhost:3099'
const CLAUDECLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? ''

async function requireChatUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!(await hasRole(user.id, 'owner', 'admin'))) {
    return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { error: null }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const auth = await requireChatUser()
  if (auth.error) return auth.error

  const { sessionId } = await params
  const { searchParams } = new URL(request.url)

  if (searchParams.get('source') === 'mc') {
    const service = createServiceClient()

    // Paginación por cursor (keyset): con `limit` traemos solo la ÚLTIMA página
    // (los N más recientes) y `before` pagina hacia atrás. La sesión
    // "Automatizaciones" acumula cientos de mensajes (~1.3MB) — bajar todo el
    // historial en cada apertura era el cuello del chat. Sin `limit` se
    // conserva el comportamiento viejo (historial completo ascendente).
    const limitParam = Number(searchParams.get('limit'))
    const before = searchParams.get('before')

    if (Number.isFinite(limitParam) && limitParam > 0) {
      const limit = Math.min(limitParam, 200)
      let query = service
        .from('chat_messages')
        .select('*')
        // El user y el assistant de un mismo turno se insertan en batch → comparten
        // created_at al microsegundo. Sin desempate determinista el orden dentro del
        // turno lo decidía el UUID (aleatorio) y al RECARGAR salía assistant-antes-que-
        // user (~la mitad de los turnos). Fetch en DESC + reverse: role ASC aquí ⇒ tras
        // el reverse queda user antes que assistant en el mismo timestamp.
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .order('role', { ascending: true })
        .order('id', { ascending: false })
        .limit(limit)
      if (before) query = query.lt('created_at', before)

      const { data, error } = await query
      if (error) return Response.json({ error: error.message }, { status: 500 })
      const page = (data ?? []).reverse() // cliente espera orden cronológico
      return Response.json({ messages: page, hasMore: (data ?? []).length === limit })
    }

    const { data, error } = await service
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      // Mismo desempate determinista que el path paginado: user antes que assistant
      // cuando comparten created_at (turno insertado en batch).
      .order('created_at', { ascending: true })
      .order('role', { ascending: false })
      .order('id', { ascending: true })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ messages: data ?? [] })
  }

  try {
    const res = await fetch(`${CLAUDECLAW_URL}/sessions/${sessionId}/messages`, {
      headers: { Authorization: `Bearer ${CLAUDECLAW_TOKEN}` },
    })
    if (!res.ok) throw new Error(`ClaudeClaw ${res.status}`)
    const data = await res.json()
    return Response.json(data)
  } catch {
    return Response.json({ error: 'ClaudeClaw unreachable' }, { status: 503 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const auth = await requireChatUser()
  if (auth.error) return auth.error

  const { sessionId } = await params
  const body = await request.json().catch(() => ({})) as {
    messages?: Array<{
      role: 'user' | 'assistant'
      content: string
      audioUrl?: string | null
      imageUrl?: string | null
      metadata?: Record<string, unknown> | null
    }>
  }
  const messages = body.messages ?? []
  if (!messages.length) return Response.json({ error: 'messages required' }, { status: 400 })

  const service = createServiceClient()
  const { error } = await service.from('chat_messages').insert(
    messages.map((message) => ({
      session_id: sessionId,
      role: message.role,
      content: message.content,
      audio_url: message.audioUrl ?? null,
      image_url: message.imageUrl ?? null,
      ...(message.metadata ? { metadata: message.metadata } : {}),
    })),
  )

  // 23505 = unique_violation contra chat_messages_turnid_role_uniq: el guardado
  // de respaldo del server (/api/chat/complete) ganó la carrera para este turnId.
  // El turno YA está persistido — idempotente, no es error del cliente.
  if (error?.code === '23505') {
    return Response.json({ ok: true, deduped: true })
  }
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Bookkeeping fuera del critical path: el touch de updated_at no debe
  // bloquear el `ok` al cliente. `after()` garantiza que corre tras responder.
  after(async () => {
    await service
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .then(() => undefined)
  })

  return Response.json({ ok: true })
}
