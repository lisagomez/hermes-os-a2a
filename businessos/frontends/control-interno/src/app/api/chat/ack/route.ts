import { createClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/auth-utils'

const CLAUDECLAW_URL = process.env.CLAUDECLAW_URL ?? 'http://localhost:3099'
const CLAUDECLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? ''

/**
 * ACK de turno recibido+guardado. El cliente lo dispara DESPUÉS de persistir
 * el par user+assistant en Supabase. El daemon, al completar un turno, espera
 * este ACK ~5s: si llega, no re-guarda ni manda push; si no llega, asume
 * desconexión (iPhone bloqueado, PWA suspendida) → guarda server-side y pushea.
 *
 * Es la inversión del diseño viejo: ya NO detectamos desconexiones (imposible
 * con sockets half-open de iOS + buffers de Vercel/ngrok) — asumimos
 * desconexión siempre y el ACK es la prueba positiva de que el cliente vive.
 */
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
  const turnId = body['turnId']
  if (typeof turnId !== 'string' || !turnId.trim()) {
    return new Response(JSON.stringify({ error: 'turnId required' }), { status: 400 })
  }

  try {
    const upstream = await fetch(`${CLAUDECLAW_URL}/chat/ack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CLAUDECLAW_TOKEN}`,
      },
      body: JSON.stringify({ turnId }),
      // ACK es best-effort: si el daemon no responde rápido, su timeout de 5s
      // decide solo (guardará de más, el índice único lo absorbe).
      signal: AbortSignal.timeout(4000),
    })
    const text = await upstream.text()
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'ClaudeClaw unreachable' }), { status: 502 })
  }
}
