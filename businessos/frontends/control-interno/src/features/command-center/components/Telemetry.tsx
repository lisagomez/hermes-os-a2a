'use client'

import { useEffect, useRef, useState } from 'react'
import type { ToolEvent } from '../hooks/useVoiceLoop'
import { HudPanel } from './hud'

function basename(p: string): string {
  const parts = p.split('/').filter(Boolean)
  return parts[parts.length - 1] || p
}

/** Extrae el dato útil del input parcial de una tool: archivo, comando, skill, url, etc. */
function describe(name: string, input?: string): string {
  if (!input) return ''
  let obj: Record<string, unknown> = {}
  try { obj = JSON.parse(input) } catch { /* partial */ }
  const field = (k: string): string | undefined => {
    if (typeof obj[k] === 'string') return obj[k] as string
    const m = input.match(new RegExp(`"${k}"\\s*:\\s*"([^"]{1,120})`))
    return m?.[1]
  }
  const n = name.toLowerCase()
  if (n === 'read' || n === 'write' || n === 'edit' || n === 'notebookedit') { const f = field('file_path'); return f ? basename(f) : '' }
  if (n === 'bash') { const c = field('command'); return c ? c.slice(0, 60) : '' }
  if (n === 'skill') { return field('skill') || field('command') || '' }
  if (n === 'grep') { return field('pattern') || '' }
  if (n === 'glob') { return field('pattern') || '' }
  if (n === 'task' || n === 'agent') { return field('description') || '' }
  if (n.includes('webfetch') || n.includes('navigate')) { return field('url') || '' }
  if (n.includes('supabase') || n.includes('query')) { const q = field('query'); return q ? q.slice(0, 50) : '' }
  // fallback: primer string del input
  const first = input.match(/"([a-z_]+)"\s*:\s*"([^"]{1,60})/i)
  return first ? first[2] : ''
}

/** Pretty-print del input completo para el panel expandido. */
function prettyInput(input?: string): string {
  if (!input) return '(sin input)'
  try { return JSON.stringify(JSON.parse(input), null, 2) } catch { return input }
}

export function Telemetry({ events }: { events: ToolEvent[] }) {
  const listRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  useEffect(() => {
    if (events.length > 0 && listRef.current && !expanded) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [events, expanded])

  return (
    <HudPanel className="p-3.5 h-full overflow-hidden flex flex-col" delay={220}>
      <div className="cc-label mb-2">Telemetría</div>
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
        {events.length === 0 && (
          <div className="text-[10px] font-mono text-white/25 leading-relaxed">
            <span className="text-[#22c55e]/50">●</span> sistema en reposo<br />
            <span className="cc-caret">esperando instrucción</span>
          </div>
        )}

        {/* Durante un turno: tools con descripción + click para ver el input */}
        {events.map((e) => {
          const detail = describe(e.name, e.input)
          const isOpen = expanded === e.id
          return (
            <div key={e.id} className="cc-swap text-[10px] font-mono leading-tight">
              <button
                onClick={() => setExpanded(isOpen ? null : e.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-1.5 text-left hover:bg-white/5 rounded px-1 -mx-1 py-0.5 transition-colors"
              >
                <span className={e.status === 'running' ? 'text-[#56bdf8] animate-pulse' : 'text-[#22c55e]'}>
                  {e.status === 'running' ? '◌' : '✓'}
                </span>
                <span className="text-white/70 shrink-0">{e.name}</span>
                {detail && <span className="text-white/40 truncate">· {detail}</span>}
              </button>
              {isOpen && (
                <pre className="mt-1 ml-3 mb-1 p-2 rounded-lg bg-black/50 border border-white/10 text-[9px] text-[#56bdf8]/80 whitespace-pre-wrap break-words max-h-40 overflow-y-auto scrollbar-thin">
                  {prettyInput(e.input)}
                </pre>
              )}
            </div>
          )
        })}
      </div>
    </HudPanel>
  )
}
