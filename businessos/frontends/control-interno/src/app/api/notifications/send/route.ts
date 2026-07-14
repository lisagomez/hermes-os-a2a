import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

// Lazy init — avoids build-time crash when VAPID env vars are missing
let vapidReady = false
function ensureVapid() {
  if (vapidReady) return
  const publicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '').trim()
  const privateKey = (process.env.VAPID_PRIVATE_KEY ?? '').trim()
  if (!publicKey || !privateKey) return
  webpush.setVapidDetails(
    `mailto:${(process.env.VAPID_EMAIL ?? 'admin@example.com').trim()}`,
    publicKey,
    privateKey,
  )
  vapidReady = true
}

// Accepts: Bearer (OPENCLAW_GATEWAY_TOKEN) OR authenticated session
async function isAuthorized(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('Authorization')
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')
    if (token === OPENCLAW_GATEWAY_TOKEN) return true
  }
  // Fall back to session check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user
}

export async function POST(req: NextRequest) {
  try {
    ensureVapid()
    if (!vapidReady) {
      return NextResponse.json({ error: 'VAPID not configured (missing env vars)' }, { status: 500 })
    }

    if (!(await isAuthorized(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { title, body: msgBody, url, tag, userId } = body as {
      title?: string
      body?: string
      url?: string
      tag?: string
      userId?: string
    }

    // Use service client to bypass RLS (needed when called via bearer token)
    const supabase = createServiceClient()

    // Fetch target subscriptions
    // Safety default: if no userId is provided, only send to owners
    // (prevents accidental broadcast to all devices when a caller forgets to pass userId)
    let query = supabase.from('push_subscriptions').select('*')
    if (userId) {
      query = query.eq('user_id', userId)
    } else {
      const { data: owners } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'owner')
      const ownerIds = owners?.map((o) => o.id) ?? []
      if (ownerIds.length === 0) {
        return NextResponse.json({ sent: 0, reason: 'no userId provided and no owner profile found' })
      }
      query = query.in('user_id', ownerIds)
    }

    const { data: subs, error: fetchError } = await query
    if (fetchError) {
      console.error('fetch push_subscriptions error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch subscriptions', detail: fetchError.message }, { status: 500 })
    }
    if (!subs || subs.length === 0) {
      return NextResponse.json({ sent: 0, reason: 'no subscriptions found' })
    }

    const payload = JSON.stringify({
      title: title ?? 'business-os-new',
      body: msgBody ?? '',
      url: url ?? '/',
      tag: tag ?? 'mc-notification',
      icon: '/icon.svg',
    })

    let sent = 0
    const errors: string[] = []
    const invalidEndpoints: string[] = []

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          )
          sent++
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode
          const msg = err instanceof Error ? err.message : String(err)
          errors.push(`${status ?? 'unknown'}: ${msg}`)
          // 4xx = subscription expired/invalid — remove it
          if (status && status >= 400 && status < 500) {
            invalidEndpoints.push(sub.endpoint)
          }
        }
      })
    )

    // Clean up invalid subscriptions
    if (invalidEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', invalidEndpoints)
    }

    return NextResponse.json({ sent, cleaned: invalidEndpoints.length, errors: errors.length > 0 ? errors : undefined })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('notifications/send crash:', msg)
    return NextResponse.json({ error: 'Internal error', detail: msg }, { status: 500 })
  }
}
