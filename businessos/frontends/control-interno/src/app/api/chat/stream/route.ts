import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hasRole } from '@/lib/auth-utils'

const CLAUDECLAW_URL = process.env.CLAUDECLAW_URL ?? 'http://localhost:3099'
const CLAUDECLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? ''

// Turnos largos del agente (deep work multi-minuto): sin esto, la función muere en
// el límite default de Vercel y corta el stream aunque la app siga abierta.
// El daemon capea a 600s server-side;
// si esta función muere antes, el turno igual se recupera vía /api/chat/complete
// + push + reconciliación al foreground.
export const maxDuration = 300

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // El check de rol corre en PARALELO con el parse del body (y abajo con el
  // fetch de contexto de la thread) — cada await serial aquí retrasa el primer
  // token del stream. La autorización se verifica ANTES de usar cualquier dato.
  const rolePromise = hasRole(user.id, 'owner', 'admin').catch(() => false)

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  if (!(await rolePromise)) {
    return new Response(JSON.stringify({ error: 'Forbidden: Chat access requires owner or admin role' }), { status: 403 })
  }

  const message = body['message']
  if (typeof message !== 'string' || !message.trim()) {
    return new Response(JSON.stringify({ error: 'message required' }), { status: 400 })
  }

  // Opción B (thread de automatizaciones conversable): si la sesión contiene
  // mensajes de cron (briefings/councils/reflexión), inyectamos las inteligencias
  // recientes como CONTEXTO de este reply. Así conversas con continuidad —
  // "sobre el lead crítico del briefing, ¿qué hago?" y el agente sabe de qué
  // hablas — sin anclar los crons a una sesión SDK pesada que se infla cada día.
  // Los crons siguen efímeros; la thread es la memoria y aquí pasamos la rebanada.
  const chatSessionId = typeof body['chatSessionId'] === 'string' ? body['chatSessionId'] : undefined
  let contextParam = typeof body['context'] === 'string' ? body['context'] : undefined
  if (chatSessionId) {
    // Leer la thread con el SERVICE client (no el autenticado): en la app de
    // escritorio el usuario es el sintetico local y RLS le bloquea leer los
    // mensajes del owner. Ya autorizamos al requester (owner/admin) arriba.
    const service = createServiceClient()
    const { data: recent } = await service
      .from('chat_messages')
      .select('content, metadata, created_at')
      .eq('session_id', chatSessionId)
      .order('created_at', { ascending: false })
      .limit(10)
    const crons = (recent ?? []).filter(
      (m) => (m.metadata as { source?: string } | null)?.source === 'cron',
    )
    if (crons.length > 0) {
      const parts = crons.slice(0, 5).reverse().map((m) => {
        const md = m.metadata as { jobLabel?: string; jobId?: string } | null
        const label = md?.jobLabel ?? md?.jobId ?? 'Automatización'
        const text = (m.content ?? '').slice(0, 1500)
        return `## ${label} (${(m.created_at ?? '').slice(0, 16)})\n${text}`
      })
      const threadContext =
        `Estás en la thread "Automatizaciones". Estas son las inteligencias recientes ` +
        `que te llegaron por cron (briefings, councils, reflexión). Úsalas para responder ` +
        `con continuidad sobre lo que el usuario pregunte:\n\n${parts.join('\n\n')}`
      contextParam = contextParam ? `${threadContext}\n\n${contextParam}` : threadContext
    }

  }

  try {
    const upstream = await fetch(`${CLAUDECLAW_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CLAUDECLAW_TOKEN}`,
      },
      body: JSON.stringify({
        message: message.trim(),
        ...(typeof body['source'] === 'string' && { source: body['source'] }),
        ...(typeof body['turnId'] === 'string' && { turnId: body['turnId'] }),
        ...(typeof body['effort'] === 'string' && { effort: body['effort'] }),
        ...(typeof body['chatSessionId'] === 'string' && { chatSessionId: body['chatSessionId'] }),
        ...(typeof body['sdkSessionId'] === 'string' && { sdkSessionId: body['sdkSessionId'] }),
        ...(typeof body['audioUrl'] === 'string' && { audioUrl: body['audioUrl'] }),
        ...(typeof body['imageUrl'] === 'string' && { imageUrl: body['imageUrl'] }),
        ...(contextParam && { context: contextParam }),
      }),
      signal: request.signal,
    })

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text()
      return new Response(text, { status: upstream.status })
    }

    // Proxy the SSE stream from ClaudeClaw to the browser
    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      // Browser disconnected — expected for background processing
      return new Response(null, { status: 499 })
    }
    if (err instanceof Error && err.name === 'TimeoutError') {
      return new Response(JSON.stringify({ error: 'Agent timeout' }), { status: 504 })
    }
    return new Response(
      JSON.stringify({ error: 'ClaudeClaw unreachable. Make sure it is running locally.' }),
      { status: 503 },
    )
  }
}
