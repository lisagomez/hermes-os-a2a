'use client'

import { useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, RotateCw, X, Zap } from 'lucide-react'
import { useAudio } from '../contexts/AudioContext'

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

export function GlobalAudioBar() {
  const { state, toggle, skip, cycleSpeed, seekTo, reset } = useAudio()
  const barRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const handleSeek = useCallback(
    (clientX: number) => {
      const bar = barRef.current
      if (!bar || !state.duration) return
      const rect = bar.getBoundingClientRect()
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      seekTo(pct * state.duration)
    },
    [state.duration, seekTo],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      draggingRef.current = true
      handleSeek(e.clientX)
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [handleSeek],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return
      handleSeek(e.clientX)
    },
    [handleSeek],
  )

  const onPointerUp = useCallback(() => {
    draggingRef.current = false
  }, [])

  // Only render when audio is active
  if (!state.messageId || state.duration <= 0) return null

  const pct =
    state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0

  const speedLabel =
    state.playbackRate === 1
      ? '1x'
      : state.playbackRate === 1.5
        ? '1.5x'
        : '2x'

  const speedColor =
    state.playbackRate === 1
      ? 'text-muted'
      : state.playbackRate === 1.5
        ? 'text-brand-ink'
        : 'text-amber-400'

  return (
    <div className="shrink-0 border-b border-border-subtle bg-card/40 backdrop-blur-sm"
      style={{ animation: 'audioBarIn 200ms ease-out' }}
    >
      {/* Progress bar with times */}
      <div className="flex items-center gap-3 px-4 pt-2.5 pb-1">
        <span className="text-[10px] font-mono text-muted tabular-nums min-w-[28px]">
          {fmt(state.currentTime)}
        </span>

        <div
          ref={barRef}
          className="flex-1 h-6 flex items-center cursor-pointer touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="w-full h-1 rounded-full bg-card-active relative">
            {/* Filled track */}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand to-brand-ink"
              style={{ width: `${pct}%`, transition: draggingRef.current ? 'none' : 'width 150ms' }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-brand-ink shadow-[0_0_6px_rgba(140,39,241,0.5)] opacity-0 hover:opacity-100 transition-opacity"
              style={{ left: `calc(${pct}% - 6px)` }}
            />
          </div>
        </div>

        <span className="text-[10px] font-mono text-muted tabular-nums min-w-[28px] text-right">
          {fmt(state.duration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-1 pb-2">
        {/* Speed */}
        <button
          onClick={cycleSpeed}
          className={`flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors hover:bg-card-hover ${speedColor}`}
          title="Velocidad"
        >
          <Zap size={10} />
          {speedLabel}
        </button>

        {/* Skip back 15s */}
        <button
          onClick={() => skip(-15)}
          className="p-1.5 rounded-lg text-muted hover:text-foreground/75 hover:bg-card-hover transition-colors"
          title="-15s"
        >
          <RotateCcw size={14} />
        </button>

        {/* Play / Pause */}
        <button
          onClick={toggle}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-brand/20 hover:bg-brand/30 text-brand-ink transition-colors"
        >
          {state.isPlaying ? (
            <Pause size={14} className="fill-current" />
          ) : (
            <Play size={14} className="fill-current ml-0.5" />
          )}
        </button>

        {/* Skip forward 15s */}
        <button
          onClick={() => skip(15)}
          className="p-1.5 rounded-lg text-muted hover:text-foreground/75 hover:bg-card-hover transition-colors"
          title="+15s"
        >
          <RotateCw size={14} />
        </button>

        {/* Close */}
        <button
          onClick={reset}
          className="p-1.5 rounded-lg text-muted hover:text-red-400/70 hover:bg-card-hover transition-colors ml-1"
          title="Cerrar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
