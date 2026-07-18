'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Mic, Square, Activity, Maximize2, Minimize2, Loader2, Ear, EarOff, ScrollText } from 'lucide-react'
import { AGENT_NAME } from '@/shared/agent-identity'
import { useVoiceLoop } from '../hooks/useVoiceLoop'
import { useWakeWord } from '../hooks/useWakeWord'
import { TranscriptPanel } from './TranscriptPanel'
import { Waveform } from './Waveform'
import { Orb } from './Orb'
import { Telemetry } from './Telemetry'
import { Subtitles } from './Subtitles'
import { SecondaryPanel } from './SecondaryPanel'

function fmtTokens(n?: number): string {
  if (n == null) return '—'
  return n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n)
}

/** Instrucciones de modo voz inyectadas en CADA turno: respuestas sobrias y breves para leerse en voz alta. */
function buildContext(): string {
  return [
    'MODO: voz en vivo. SÉ SOBRIO: responde SOLO lo que el usuario pide, nada más. ' +
    'Si saluda o hace small talk ("hola", "qué tal", "buenas"), responde con UNA frase breve y humana. ' +
    'Eres un copiloto conversacional y discreto, no un panel que habla solo. No agregues datos que no te pidieron.',
    'Responde BREVE, para leerse en voz alta (1-3 frases).',
  ].join('\n')
}

export function CommandCenterLive({ headerAction }: { headerAction?: ReactNode } = {}) {
  const [fullscreen, setFullscreen] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [clock, setClock] = useState('')
  const [speed, setSpeed] = useState(1) // velocidad de la voz: 1× / 1.5× / 2×

  const loop = useVoiceLoop({
    getContext: () => buildContext(),
  })
  const { status, transcript, response, toolEvents, latency, errorMsg, transcriptLog, usage, engineRef, segmentsRef, toggle, interrupt, pttStart, pttEnd, startListening, stopAndListen } = loop

  // Velocidad de la voz (1× / 1.5× / 2×). El AudioContext se crea perezosamente
  // (en el primer gesto), así que reaplicamos la velocidad guardada al cambiar de estado.
  const setRate = useCallback((r: number) => { setSpeed(r); engineRef.current?.setPlaybackRate(r) }, [engineRef])
  useEffect(() => { engineRef.current?.setPlaybackRate(speed) }, [speed, status, engineRef])

  // Wake word "Oye <agente>" — el nombre funciona como toggle de voz:
  //   idle      → decir el nombre despierta y empieza a escuchar
  //   pensando  → decir el nombre cancela la petición
  //   hablando  → decir el nombre lo hace PARAR (interrumpe el audio)
  // Solo se apaga durante 'listening' (ahí el grabador es dueño del micrófono).
  const [wakeOn, setWakeOn] = useState(true)
  const statusRef = useRef(status)
  useEffect(() => { statusRef.current = status }, [status])
  const onIntent = useCallback((intent: 'wake' | 'stop') => {
    const s = statusRef.current
    if (intent === 'stop') { interrupt(); return }            // "<agente> para" → parada total (deja de escuchar)
    if (s === 'speaking' || s === 'thinking') void stopAndListen() // nombre mientras habla → calla pero sigue escuchando
    else void startListening(false)                            // idle → despertar y escuchar
  }, [interrupt, stopAndListen, startListening])
  const wake = useWakeWord(onIntent, { enabled: wakeOn && status !== 'listening' })

  // Reloj (solo cliente, evita hydration mismatch)
  useEffect(() => {
    const t = setInterval(() => {
      setClock(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Teclado: ESPACIO mantener = push-to-talk; ESC = interrumpir
  const spaceDownRef = useRef(false)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !spaceDownRef.current) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        spaceDownRef.current = true
        pttStart()
      } else if (e.code === 'Escape') {
        interrupt()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && spaceDownRef.current) {
        e.preventDefault()
        spaceDownRef.current = false
        pttEnd()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) }
  }, [pttStart, pttEnd, interrupt])

  const toggleFullscreen = useCallback(() => setFullscreen((f) => !f), [])

  const statusLabel = useMemo(() => ({
    idle: 'En reposo', listening: 'Escuchando', thinking: 'Procesando', speaking: 'Hablando', error: 'Error',
  }[status]), [status])

  const micBusy = status === 'thinking'
  // El loop está activo (escuchando / pensando / hablando) → mostrar la salida explícita "Parar".
  const loopActive = status === 'listening' || status === 'thinking' || status === 'speaking'

  return (
    <div
      data-cc-state={status}
      className={`cc-root ${fullscreen ? 'fixed inset-0 z-[100]' : 'relative h-full min-h-[560px] rounded-3xl overflow-hidden'} flex flex-col text-white`}
    >
      {/* Atmósfera por capas: glow teñido por estado + grid + vignette + grano */}
      <div className="cc-atmos" aria-hidden />
      <div className="cc-grid" aria-hidden />
      <div className="cc-vignette" aria-hidden />
      <div className="cc-noise" aria-hidden />

      {/* Top bar */}
      <div className="relative z-20 shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <Activity size={14} className="shrink-0 transition-colors duration-700" style={{ color: 'rgb(var(--cc-rgb))' }} />
          <span className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/60 truncate">
            <span className="hidden sm:inline">Command Center · </span>Live
          </span>
          <span className="cc-chip text-[9px] font-mono uppercase tracking-[0.18em]" role="status" aria-live="polite">
            <span className={`cc-chip-dot ${status === 'listening' || status === 'speaking' ? 'animate-pulse' : ''}`} aria-hidden />
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          {wake.supported && (
            <button
              onClick={() => setWakeOn((v) => !v)}
              aria-pressed={wakeOn}
              className={`flex items-center gap-1.5 text-xs transition-colors ${wakeOn ? 'text-[#56bdf8]' : 'text-white/40 hover:text-white/70'}`}
              title={wakeOn ? `Wake word "Oye ${AGENT_NAME}" activo` : 'Wake word apagado'}
              aria-label={wakeOn ? 'Desactivar wake word' : 'Activar wake word'}
            >
              {wakeOn ? <Ear size={14} /> : <EarOff size={14} />}
              <span className="hidden sm:inline font-mono uppercase tracking-wider">{wakeOn ? `Oye ${AGENT_NAME}` : 'wake off'}</span>
            </button>
          )}
          <button
            onClick={() => setShowLog((v) => !v)}
            aria-expanded={showLog}
            className={`relative transition-colors ${showLog ? 'text-[#56bdf8]' : 'text-white/50 hover:text-white'}`}
            title="Ver conversación"
            aria-label="Ver conversación"
          >
            <ScrollText size={16} />
            {transcriptLog.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 text-[8px] font-mono bg-[#683ACC] text-white rounded-full px-1 leading-tight" aria-hidden>{transcriptLog.length}</span>
            )}
          </button>
          <span className="hidden sm:inline text-[10px] sm:text-xs font-mono tabular-nums text-white/50">{clock}</span>
          <button
            onClick={toggleFullscreen}
            className="text-white/50 hover:text-white transition-colors"
            title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          {headerAction}
        </div>
      </div>

      {/* Layout principal: móvil = columna (orbe primero) · tablet = grid 2 col · desktop = grid 12 */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto px-4 pb-3 scrollbar-thin
                      md:grid md:grid-cols-2 md:gap-4
                      lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:overflow-hidden lg:px-6 lg:pb-4">
        {/* Orbe (móvil/tablet PRIMERO: es el control principal · desktop centro, 2 filas) */}
        <div className="order-1 md:col-span-2 lg:order-none flex flex-col items-center justify-center py-2 lg:py-0 lg:col-span-6 lg:col-start-4 lg:row-start-1 lg:row-span-2">
          <button
            onClick={toggle}
            disabled={micBusy}
            aria-label={status === 'listening' ? 'Enviar lo dicho' : status === 'speaking' ? `Interrumpir a ${AGENT_NAME}` : `Hablar con ${AGENT_NAME}`}
            title="Hablar (toca el orbe o mantén ESPACIO)"
            className="cc-enter w-full rounded-full cursor-pointer transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-default focus-visible:outline-none"
            style={{ '--cc-delay': '60ms' } as React.CSSProperties}
          >
            <Orb engineRef={engineRef} status={status} />
          </button>
          <Waveform engineRef={engineRef} status={status} />
        </div>

        {/* Telemetría (móvil 2 · tablet col izquierda · desktop col izquierda, 2 filas) */}
        <div className="order-3 h-[200px] md:h-auto md:min-h-[210px] md:col-span-1 lg:order-none lg:h-auto lg:min-h-0 lg:col-span-3 lg:col-start-1 lg:row-start-1 lg:row-span-2">
          <Telemetry events={toolEvents} />
        </div>

        {/* Panel de sesión (móvil 3 · tablet col derecha · desktop col derecha, 2 filas) */}
        <div className="order-4 h-[210px] md:h-auto md:min-h-[210px] md:col-span-1 lg:order-none lg:h-auto lg:col-span-3 lg:col-start-10 lg:row-start-1 lg:row-span-2">
          <SecondaryPanel status={status} clock={clock} messages={transcriptLog.length} />
        </div>
      </div>

      {/* Subtítulos + controles (bottom, en flujo) */}
      <div className="relative z-20 shrink-0 px-4 sm:px-6 pb-4 sm:pb-6 pt-2 bg-gradient-to-t from-black/70 via-black/40 to-transparent">
        <Subtitles engineRef={engineRef} segmentsRef={segmentsRef} status={status} transcript={transcript} response={response} error={errorMsg} />
        <div className="mt-2 sm:mt-3 flex items-center justify-center gap-3">
          {/* Mic / toggle */}
          <button
            onClick={toggle}
            disabled={micBusy}
            className={`cc-mic relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shrink-0
              ${status === 'listening' ? 'bg-[#56bdf8]/20 ring-2 ring-[#56bdf8] text-[#56bdf8] shadow-[0_0_28px_rgba(56,189,248,0.35)]'
                : status === 'speaking' ? 'bg-[#ff9101]/20 ring-2 ring-[#ff9101] text-[#ff9101] shadow-[0_0_28px_rgba(255,145,1,0.35)]'
                : 'bg-white/5 ring-1 ring-white/15 text-white/80 hover:bg-white/10 hover:ring-white/30'}`}
            title="Hablar (toca o mantén ESPACIO)"
            aria-label="Hablar"
          >
            {micBusy ? <Loader2 size={22} className="animate-spin" />
              : status === 'listening' || status === 'speaking' ? <Square size={20} className="fill-current" />
              : <Mic size={22} />}
            {(status === 'listening' || status === 'speaking') && (
              <span className="absolute inset-0 rounded-full animate-ping ring-1 ring-current opacity-30" aria-hidden />
            )}
          </button>

          {/* Parar: salida inequívoca del loop (= tecla ESC). Solo visible con el loop activo. */}
          {loopActive && (
            <button
              onClick={interrupt}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 h-12 rounded-full bg-red-500/15 ring-1 ring-red-500/40 text-sm font-medium text-red-200
                hover:bg-red-500/25 hover:ring-red-500/70 active:scale-[0.97] transition-all"
              title="Parar y volver a reposo (ESC)"
              aria-label="Parar"
            >
              <Square size={14} className="fill-current" />
              <span className="hidden sm:inline">Parar</span>
              <kbd className="hidden sm:inline text-[9px] font-mono text-red-200/50 ml-0.5">ESC</kbd>
            </button>
          )}

          {/* Velocidad de la voz (1× / 1.5× / 2×) */}
          <div className="flex items-center gap-0.5 rounded-full bg-white/5 ring-1 ring-white/15 p-1" role="group" aria-label="Velocidad de la voz">
            {[1, 1.5, 2].map((r) => (
              <button
                key={r}
                onClick={() => setRate(r)}
                aria-pressed={speed === r}
                className={`px-2 sm:px-2.5 h-9 rounded-full text-xs font-mono tabular-nums transition-colors ${
                  speed === r
                    ? 'bg-[#ff9101]/25 text-[#ff9101] ring-1 ring-[#ff9101]/60'
                    : 'text-white/55 hover:text-white/90'
                }`}
                title={`Velocidad de la voz ${r}×`}
              >
                {r}×
              </button>
            ))}
          </div>
        </div>

        {/* Latencia (QA / smooth check) */}
        <div className="mt-2 sm:mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:gap-x-4 text-[10px] font-mono text-white/35 tabular-nums min-h-[14px]">
          {latency.sttMs != null && <span className="cc-fade">STT {latency.sttMs}ms</span>}
          {latency.firstTokenMs != null && <span className="cc-fade">1er token {latency.firstTokenMs}ms</span>}
          {latency.firstAudioMs != null && (
            <span className={`cc-fade ${latency.firstAudioMs < 1200 ? 'text-[#22c55e]' : 'text-[#ff9101]'}`}>
              1er audio {latency.firstAudioMs}ms
            </span>
          )}
          {usage.contextTotal != null && (
            <span className="cc-fade text-[#8b5cf6]" title="Contexto usado / total">
              ctx {fmtTokens(usage.contextUsed)}/{fmtTokens(usage.contextTotal)}
            </span>
          )}
        </div>
      </div>

      {/* Panel de conversación expandible */}
      {showLog && (
        <TranscriptPanel log={transcriptLog} liveResponse={response} onClose={() => setShowLog(false)} />
      )}
    </div>
  )
}
