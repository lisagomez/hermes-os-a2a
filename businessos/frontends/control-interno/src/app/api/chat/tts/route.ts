import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/auth-utils'

// TTS = Kokoro local (open source) a traves de claudeclaw, reusando el mismo
// tunel/CLAUDECLAW_URL que el chat. Funciona en desktop (localhost) y web (tunel).
const CLAUDECLAW_URL = process.env.CLAUDECLAW_URL ?? 'http://localhost:3099'
const CLAUDECLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? ''

function cleanTextForTts(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, 'código')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await hasRole(user.id, 'owner', 'admin'))) {
    return NextResponse.json({ error: 'Forbidden: Chat access requires owner or admin role' }, { status: 403 })
  }

  const { text } = await req.json() as { text?: string }
  if (!text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const clean = cleanTextForTts(text)
  if (!clean) {
    return NextResponse.json({ error: 'text is empty after cleanup' }, { status: 400 })
  }

  const res = await fetch(`${CLAUDECLAW_URL}/tts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLAUDECLAW_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: clean }),
  })

  if (!res.ok) {
    const body = await res.text()
    return NextResponse.json({ error: `TTS error ${res.status}: ${body}` }, { status: res.status })
  }

  const audio = await res.arrayBuffer()
  return new NextResponse(audio, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  })
}
