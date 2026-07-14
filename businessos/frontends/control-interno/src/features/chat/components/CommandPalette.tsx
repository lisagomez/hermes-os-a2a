'use client'
import { useEffect, useRef } from 'react'
import {
  Trash2, Minimize2, Activity, CheckSquare, Bot, BarChart2, HelpCircle, Cpu,
  Sparkles, Brain, Plug, ListTodo, Gauge, Zap, Network, Coins,
  type LucideIcon,
} from 'lucide-react'

export interface SlashCommand {
  name: string
  description: string
}

interface CommandDef extends SlashCommand {
  icon: LucideIcon
  iconClass: string
}

export const SLASH_COMMANDS: CommandDef[] = [
  { name: '/clear',   description: 'Nueva conversación — borra el historial',        icon: Trash2,      iconClass: 'bg-red-500/15 text-red-400' },
  { name: '/compact', description: 'Comprime el contexto (reduce tokens usados)',    icon: Minimize2,   iconClass: 'bg-orange-500/15 text-orange-400' },
  { name: '/status',  description: 'Estado del agente: modelo, tareas activas, sesión', icon: Activity,    iconClass: 'bg-emerald-500/15 text-emerald-400' },
  { name: '/skills',  description: 'Skills disponibles (.claude/skills/)',           icon: Sparkles,    iconClass: 'bg-pink-500/15 text-pink-400' },
  { name: '/memory',  description: 'Memoria persistente (MEMORY.md)',                icon: Brain,       iconClass: 'bg-fuchsia-500/15 text-fuchsia-400' },
  { name: '/mcp',     description: 'Estado de los MCP servers',                      icon: Plug,        iconClass: 'bg-teal-500/15 text-teal-400' },
  { name: '/todos',   description: 'TODO list activo del agente',                    icon: ListTodo,    iconClass: 'bg-lime-500/15 text-lime-400' },
  { name: '/tasks',   description: 'Tareas actuales del Kanban board',               icon: CheckSquare, iconClass: 'bg-blue-500/15 text-blue-400' },
  { name: '/agents',  description: 'Estado en vivo de todos los agentes',            icon: Bot,         iconClass: 'bg-violet-500/15 text-violet-400' },
  { name: '/context', description: 'Cuánto contexto se está usando (tokens)',        icon: BarChart2,   iconClass: 'bg-amber-500/15 text-amber-400' },
  { name: '/model',   description: 'Cambiar modelo de IA',                          icon: Cpu,         iconClass: 'bg-cyan-500/15 text-cyan-400' },
  { name: '/effort',  description: 'Nivel de esfuerzo de razonamiento (low → max)', icon: Gauge,       iconClass: 'bg-amber-500/15 text-amber-400' },
  { name: '/fast',    description: 'Fast mode: ~2.5x velocidad en Opus 4.8 (toggle)', icon: Zap,       iconClass: 'bg-yellow-500/15 text-yellow-400' },
  { name: '/ultracode', description: 'Ultracode: xhigh + workflows multi-agente (toggle)', icon: Network, iconClass: 'bg-violet-500/15 text-violet-400' },
  { name: '/usage',   description: 'Costo y tokens del agente (7/30 días)',             icon: Coins,      iconClass: 'bg-emerald-500/15 text-emerald-400' },
  { name: '/help',    description: 'Ver todos los comandos disponibles',             icon: HelpCircle,  iconClass: 'bg-card-active text-muted' },
]

interface Props {
  query: string
  selectedIndex: number
  onSelect: (cmd: string) => void
  onClose: () => void
}

export function CommandPalette({ query, selectedIndex, onSelect, onClose }: Props) {
  const filtered = SLASH_COMMANDS.filter((c) =>
    c.name.slice(1).startsWith(query.toLowerCase())
  )
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Scroll selected item into view on keyboard navigation
  useEffect(() => {
    if (!listRef.current) return
    const items = listRef.current.querySelectorAll<HTMLElement>('[data-cmd]')
    items[selectedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!filtered.length) return null

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 w-full bg-card/96 backdrop-blur-xl border border-border rounded-2xl shadow-[0_-4px_6px_-2px_rgba(0,0,0,0.35),0_-16px_48px_rgba(0,0,0,0.75)] overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 py-2 border-b border-border-subtle bg-card/40">
        <div className="w-4 h-4 rounded-md bg-brand/15 flex items-center justify-center">
          <span className="text-[9px] font-bold text-brand-ink leading-none">/</span>
        </div>
        <span className="text-[10px] text-muted uppercase tracking-widest font-semibold">Comandos</span>
        <span className="ml-auto text-[9px] text-muted/60 hidden sm:block font-mono">
          ↑↓ · Tab/Enter · Esc
        </span>
      </div>

      {/* Command list */}
      <ul
        ref={listRef}
        role="listbox"
        aria-label="Comandos del agente"
        className="py-1 max-h-56 overflow-y-auto overscroll-contain"
      >
        {filtered.map((cmd, i) => {
          const Icon = cmd.icon
          const active = i === selectedIndex
          return (
            <li key={cmd.name} data-cmd role="option" aria-selected={active}>
              <button
                onMouseDown={(e) => { e.preventDefault(); onSelect(cmd.name) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  active ? 'bg-violet-500/[0.10]' : 'hover:bg-card'
                }`}
              >
                {/* Icon bubble */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cmd.iconClass}`}>
                  <Icon size={15} strokeWidth={1.75} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <span className={`block text-[13px] font-mono font-semibold transition-colors ${active ? 'text-foreground' : 'text-foreground/80'}`}>
                    {cmd.name}
                  </span>
                  <span className={`block text-[11px] truncate mt-0.5 transition-colors ${active ? 'text-muted' : 'text-muted/80'}`}>
                    {cmd.description}
                  </span>
                </div>

                {/* Enter hint */}
                {active && (
                  <span className="shrink-0 text-[9px] font-mono text-violet-400/60 bg-violet-500/10 px-1.5 py-0.5 rounded-md hidden sm:block">
                    Enter
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
