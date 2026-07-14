'use client'

import { HudPanel } from './hud'
import type { LoopStatus } from '../hooks/useVoiceLoop'

const STATUS_LABEL: Record<LoopStatus, string> = {
  idle: 'En reposo',
  listening: 'Escuchando',
  thinking: 'Procesando',
  speaking: 'Hablando',
  error: 'Error',
}

const STATUS_ACCENT: Record<LoopStatus, string> = {
  idle: '#683ACC',
  listening: '#56bdf8',
  thinking: '#8b5cf6',
  speaking: '#ff9101',
  error: '#ef4444',
}

/** Panel genérico de la sesión de voz: estado del loop, hora y contador de mensajes. */
export function SecondaryPanel({ status, clock, messages }: { status: LoopStatus; clock: string; messages: number }) {
  return (
    <HudPanel className="p-5 h-full overflow-hidden flex flex-col" delay={120} pulseKey={status}>
      {/* El título cruza con el contenido al cambiar de estado */}
      <div key={`h-${status}`} className="cc-swap flex items-center justify-between mb-4">
        <span className="cc-label" style={{ color: 'rgba(var(--cc-rgb), 0.95)' }}>Sesión de voz</span>
        <span className="h-1.5 w-1.5 rounded-full bg-[#56bdf8] animate-pulse" aria-hidden />
      </div>
      <div key={status} className="cc-swap flex-1 grid grid-cols-2 gap-3 content-start">
        <Cell label="Estado" value={STATUS_LABEL[status]} accent={STATUS_ACCENT[status]} big />
        <Cell label="Hora" value={clock || '—'} accent="#56bdf8" big />
        <Cell label="Mensajes" value={`${messages}`} accent="#22c55e" />
        <Cell label="Modo" value="Voz" accent="#8b5cf6" />
      </div>
    </HudPanel>
  )
}

function Cell({ label, value, accent = '#ffffff', big }: { label: string; value: string; accent?: string; big?: boolean }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className={`font-bold tabular-nums ${big ? 'text-2xl' : 'text-lg'}`} style={{ color: accent, textShadow: `0 0 18px ${accent}33` }}>{value}</div>
      <div className="text-[9px] font-mono uppercase tracking-wider text-white/40 mt-1">{label}</div>
    </div>
  )
}
