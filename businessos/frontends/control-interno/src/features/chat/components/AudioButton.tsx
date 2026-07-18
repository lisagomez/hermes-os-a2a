'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Volume2, Loader2, AlertCircle } from 'lucide-react'
import { useAudio } from '../contexts/AudioContext'

type TtsState = 'idle' | 'loading' | 'generated' | 'error'

interface AudioButtonProps {
  text: string
  messageId: string
}

// mp3 silencioso mínimo (~0.05s). Sirve para DESBLOQUEAR el <audio> DENTRO del
// gesto de tap en iOS Safari: iOS exige que play() ocurra en el mismo tick del
// gesto de usuario. Como el audio real llega DESPUÉS de un await (fetch TTS), el
// gesto ya se perdió → play() se rechazaba silenciosamente ("no jala smooth").
// Reproducir este silencio en el gesto "bendice" el elemento; un play() posterior
// sobre ESE MISMO elemento (con el audio real) ya sí suena en iOS.
const SILENT_MP3 = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYyLjEyLjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV////////////////////////////////////////////AAAAAExhdmM2Mi4yOAAAAAAAAAAAAAAAACQC8AAAAAAAAAGw9wpEpwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MYxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxDsAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxHYAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV'

export function AudioButton({ text, messageId }: AudioButtonProps) {
  const [state, setState] = useState<TtsState>('idle')
  const urlRef = useRef<string | null>(null)
  const elRef = useRef<HTMLAudioElement | null>(null)
  const { register } = useAudio()

  useEffect(() => {
    return () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }
  }, [])

  const handleClick = useCallback(async () => {
    if (state === 'loading') return

    // Replay del audio ya generado (mismo elemento ya desbloqueado).
    if (state === 'generated' && elRef.current && urlRef.current) {
      const el = elRef.current
      el.currentTime = 0
      el.play().catch(() => setState('error'))
      return
    }

    // ── DENTRO DEL GESTO (síncrono): crear + desbloquear el <audio> para iOS ──
    const el = new Audio()
    el.preload = 'auto'
    elRef.current = el
    try {
      el.src = SILENT_MP3
      void el.play().catch(() => {})
    } catch { /* el desbloqueo es best-effort */ }

    setState('loading')
    try {
      // Carril rápido con streaming (ElevenLabs Flash, ~500ms). Si no está
      // configurado (503), cae al carril Kokoro local (/api/chat/tts).
      let res = await fetch('/api/chat/tts-fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (res.status === 503) {
        res = await fetch('/api/chat/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
      }
      if (!res.ok) throw new Error(`TTS ${res.status}`)

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = url

      register(el, messageId)   // cablea al GlobalAudioBar (play/pause/seek/velocidad)
      el.src = url
      setState('generated')
      await el.play()           // mismo elemento ya desbloqueado → suena en iOS
    } catch {
      setState('error')
    }
  }, [state, text, messageId, register])

  const title = {
    idle: 'Escuchar',
    loading: 'Generando audio…',
    generated: 'Reproducir de nuevo',
    error: 'Error — intentar de nuevo',
  }[state]

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      title={title}
      className={`
        flex items-center justify-center min-w-[36px] min-h-[36px] md:min-w-0 md:min-h-0 p-2 md:p-1 rounded-lg md:rounded transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${state === 'generated'
          ? 'text-violet-400/60 hover:text-violet-300'
          : state === 'error'
            ? 'text-red-400/60 hover:text-red-400'
            : 'text-muted/70 hover:text-foreground/70'
        }
        hover:bg-card-hover md:hover:bg-transparent
      `}
    >
      {state === 'loading' && <Loader2 size={14} className="animate-spin" />}
      {state === 'error' && <AlertCircle size={14} />}
      {(state === 'idle' || state === 'generated') && <Volume2 size={14} />}
    </button>
  )
}
