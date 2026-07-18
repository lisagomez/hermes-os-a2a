'use client'
import { useEffect, useRef, useState } from 'react'
import { Cpu, Loader2, Check, RotateCcw } from 'lucide-react'

interface ModelInfo {
  value: string
  displayName: string
  description: string
  supportsEffort?: boolean
}

interface Props {
  onSelect: (modelValue: string) => void
  onClose: () => void
}

// Selector de modelos (fase 2 paso 3): lista curada del daemon + check en el
// modelo ACTIVO (la verdad de /models.current). La fila "Default del sistema"
// va separada al final — resetea el override en vez de fijar un id.
export function ModelPicker({ onSelect, onClose }: Props) {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [current, setCurrent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Fetch models + modelo activo desde ClaudeClaw
  useEffect(() => {
    fetch('/api/chat/models')
      .then((r) => r.json())
      .then((data) => {
        const list: ModelInfo[] = data.models ?? []
        setModels(list)
        setCurrent(data.current ?? null)
        // Preseleccionar el modelo activo (teclado arranca donde estás)
        const idx = list.findIndex((m) => m.value === data.current)
        if (idx >= 0) setSelectedIndex(idx)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(0, i - 1))
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(models.length - 1, i + 1))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const model = models[selectedIndex]
        if (model) onSelect(model.value)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [models, selectedIndex, onSelect, onClose])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const items = listRef.current.querySelectorAll<HTMLElement>('[data-model]')
    items[selectedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 w-full bg-card/96 backdrop-blur-xl border border-border rounded-2xl shadow-[0_-4px_6px_-2px_rgba(0,0,0,0.35),0_-16px_48px_rgba(0,0,0,0.75)] overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 py-2 border-b border-border-subtle bg-card/40">
        <div className="w-4 h-4 rounded-md bg-brand/15 flex items-center justify-center">
          <Cpu size={9} className="text-brand-ink" />
        </div>
        <span className="text-[10px] text-muted uppercase tracking-widest font-semibold">Modelo</span>
        <span className="ml-auto text-[9px] text-muted/60 hidden sm:block font-mono">
          ↑↓ · Enter · Esc
        </span>
      </div>

      {/* Model list */}
      {loading ? (
        <div className="flex items-center justify-center py-6 gap-2 text-muted/80">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs">Cargando modelos...</span>
        </div>
      ) : models.length === 0 ? (
        <div className="py-4 px-3.5 text-xs text-muted/80 text-center">
          No se pudieron cargar los modelos
        </div>
      ) : (
        <ul ref={listRef} className="py-1 max-h-72 overflow-y-auto overscroll-contain">
          {models.map((model, i) => {
            const active = i === selectedIndex
            const isCurrent = model.value === current
            const isDefaultRow = model.value === 'default'
            return (
              <li key={model.value} data-model className={isDefaultRow ? 'border-t border-border-subtle mt-1 pt-1' : ''}>
                <button
                  onMouseDown={(e) => { e.preventDefault(); onSelect(model.value) }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    active ? 'bg-brand/[0.08]' : 'hover:bg-card-hover'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isCurrent ? 'bg-brand/20 text-brand-ink' : 'bg-card-active text-muted'
                  }`}>
                    {isDefaultRow ? <RotateCcw size={14} strokeWidth={1.75} /> : <Cpu size={15} strokeWidth={1.75} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`block text-[13px] font-semibold transition-colors ${active || isCurrent ? 'text-foreground' : 'text-foreground/80'}`}>
                      {model.displayName}
                    </span>
                    <span className={`block text-[11px] truncate mt-0.5 transition-colors ${active ? 'text-muted' : 'text-muted/80'}`}>
                      {model.description}
                    </span>
                  </div>
                  {isCurrent && (
                    <Check size={14} className="shrink-0 text-brand-ink" aria-label="Modelo activo" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
