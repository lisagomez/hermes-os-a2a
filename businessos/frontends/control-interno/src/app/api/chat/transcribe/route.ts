import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/auth-utils'

const GROQ_API_KEY = process.env.GROQ_API_KEY

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await hasRole(user.id, 'owner', 'admin'))) {
    return NextResponse.json({ error: 'Forbidden: Chat access requires owner or admin role' }, { status: 403 })
  }

  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: 'STT not configured' }, { status: 503 })
  }

  const formData = await req.formData()
  const audio = formData.get('audio') as File | null
  if (!audio) {
    return NextResponse.json({ error: 'audio is required' }, { status: 400 })
  }
  const audioFile = audio

  // Groq Whisper — fast, accurate. Cada intento reconstruye el body (el stream del
  // FormData se consume al enviarlo).
  const buildBody = () => {
    const fd = new FormData()
    fd.append('file', audioFile, 'recording.webm')
    fd.append('model', 'whisper-large-v3-turbo')
    fd.append('language', 'es')
    fd.append('response_format', 'json')
    return fd
  }

  // Reintenta UNA vez en errores transitorios (429 rate limit / 5xx). Esa es la
  // causa típica del "a veces falla la transcripción": el carril gratis de Groq
  // mete rate-limits intermitentes.
  let res: Response | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: buildBody(),
    })
    if (res.ok) break
    const transient = res.status === 429 || res.status >= 500
    if (!transient || attempt === 1) break
    await new Promise((r) => setTimeout(r, 450))
  }

  if (!res || !res.ok) {
    const body = res ? await res.text() : 'no response'
    console.error('[transcribe] Groq STT failed', res?.status, body.slice(0, 300))
    return NextResponse.json(
      { error: 'transcription_failed', status: res?.status ?? 0, detail: body.slice(0, 300) },
      { status: res?.status ?? 502 },
    )
  }

  const data = await res.json() as { text?: string }
  return NextResponse.json({ text: data.text?.trim() ?? '' })
}
