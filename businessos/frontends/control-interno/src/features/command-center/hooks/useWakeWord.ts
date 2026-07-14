'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AGENT_NAME } from '@/shared/agent-identity'

/**
 * Wake word "Oye <agente>" vía Web Speech API (reconocimiento continuo), con 2 intenciones:
 *   - 'wake' → solo dijiste el nombre del agente (despierta / interrumpe-para-hablar)
 *   - 'stop' → dijiste "<agente> para" (o detente/alto/cállate) → parada total
 *
 * Para no confundir "<agente> para" con el nombre + comando "para": al oír el nombre sin palabra
 * de parada, esperamos ~550ms; si en esa ventana llega "para/detente/...", es 'stop'; si no, 'wake'.
 *
 * Capability-detected: si no hay SpeechRecognition (algunos WKWebView), degrada a push-to-talk.
 */

type SRClass = new () => SpeechRecognitionLike
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error?: string }) => void) | null
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

function getSR(): SRClass | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: SRClass; webkitSpeechRecognition?: SRClass }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export type WakeIntent = 'wake' | 'stop'

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Palabra de activación derivada del nombre del agente (primera palabra, en minúsculas).
const WAKE_WORD = escapeRegExp(AGENT_NAME.trim().split(/\s+/)[0]?.toLowerCase() || 'agent')
// Solo el nombre → despierta / interrumpe-para-hablar
const WAKE = new RegExp(`\\b${WAKE_WORD}\\b`, 'i')
// Parada total: "<agente> para / detente / alto / cállate / silencio" (en cualquier orden adyacente)
const STOP = new RegExp(
  `(${WAKE_WORD}\\s+(para|p[aá]rate|d[eé]t[eé]n(te)?|alto|stop|c[aá]llate|silencio|ya\\s+est[aá])|(para|p[aá]rate|d[eé]t[eé]nte|alto|stop|c[aá]llate|silencio)\\s+${WAKE_WORD})`,
  'i',
)
const DISAMBIG_MS = 550

export function useWakeWord(onIntent: (intent: WakeIntent) => void, opts: { enabled: boolean }) {
  const supported = typeof window !== 'undefined' && getSR() !== null
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const enabledRef = useRef(opts.enabled)
  const onIntentRef = useRef(onIntent)
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const decideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deniedRef = useRef(false) // mic denegado → dejar de reintentar (evita parpadeo)
  useEffect(() => { enabledRef.current = opts.enabled }, [opts.enabled])
  useEffect(() => { onIntentRef.current = onIntent }, [onIntent])

  const clearTimers = () => {
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null }
    if (decideTimerRef.current) { clearTimeout(decideTimerRef.current); decideTimerRef.current = null }
  }

  const stop = useCallback(() => {
    clearTimers()
    try { recRef.current?.abort() } catch { /* noop */ }
    recRef.current = null
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const SR = getSR()
    if (!SR || recRef.current) return
    let rec: SpeechRecognitionLike
    try { rec = new SR() } catch { return }
    rec.lang = 'es-MX'
    rec.continuous = true
    rec.interimResults = true

    const fire = (intent: WakeIntent) => {
      clearTimers()
      stop()
      onIntentRef.current(intent)
    }

    rec.onresult = (e) => {
      const r = e.results
      // Mirar la última frase en curso (la que el usuario está diciendo ahora)
      const latest = r.length ? (r[r.length - 1]?.[0]?.transcript ?? '') : ''
      if (!WAKE.test(latest)) return
      if (STOP.test(latest)) { fire('stop'); return }
      // Oímos el nombre del agente sin palabra de parada (aún): esperar por si viene "para"
      if (!decideTimerRef.current) {
        decideTimerRef.current = setTimeout(() => { fire('wake') }, DISAMBIG_MS)
      }
    }
    rec.onerror = (e) => {
      // Mic denegado/bloqueado → no reintentar (evita el ciclo rápido que hace parpadear el indicador).
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') deniedRef.current = true
    }
    rec.onend = () => {
      recRef.current = null
      setListening(false)
      if (enabledRef.current && !deniedRef.current) {
        restartTimerRef.current = setTimeout(() => { start() }, 800)
      }
    }
    try { rec.start(); recRef.current = rec; setListening(true) } catch { recRef.current = null }
  }, [stop])

  useEffect(() => {
    if (opts.enabled && supported) { deniedRef.current = false; start() }
    else stop()
    return () => stop()
  }, [opts.enabled, supported, start, stop])

  return { supported, listening, start, stop }
}
