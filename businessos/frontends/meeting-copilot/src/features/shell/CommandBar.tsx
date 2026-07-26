'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CalendarDays, Search, Wrench } from 'lucide-react'
import { useUiStore } from '@/shared/stores/ui-store'
import { useAppStore } from '@/features/domain/store'
import { CATALOGO_HERRAMIENTAS } from '@/features/launcher/catalogo'
import { resolverRutaHerramienta } from '@/features/launcher/rutas'
import { Chip } from '@/shared/components/ui'
import { fmtFecha } from '@/shared/lib/format'

interface Resultado {
  tipo: 'reunion' | 'herramienta' | 'comando'
  etiqueta: string
  detalle: string
  ruta: string
}

const COMANDOS: Resultado[] = [
  { tipo: 'comando', etiqueta: 'Nueva conversación', detalle: 'Subir audio o pegar transcripción', ruta: '/reuniones/nueva' },
  { tipo: 'comando', etiqueta: 'Ver scorecards del equipo', detalle: 'Vista manager', ruta: '/manager' },
  { tipo: 'comando', etiqueta: 'Configurar playbooks', detalle: 'Dimensiones y banco de preguntas', ruta: '/playbooks' },
]

// El panel se monta FRESCO en cada apertura: el estado inicial de consulta/cursor
// vive en el mount, sin efectos de reseteo.
function PanelComandos({ cerrar }: { cerrar: () => void }) {
  const reuniones = useAppStore((s) => s.reuniones)
  const ultimaAnalizada = useAppStore((s) => s.ultimaReunionAnalizada)
  const [consulta, setConsulta] = useState('')
  const [cursor, setCursor] = useState(0)
  const router = useRouter()

  const resultados = useMemo<Resultado[]>(() => {
    const q = consulta.trim().toLowerCase()
    const deReuniones: Resultado[] = reuniones.map((r) => ({
      tipo: 'reunion',
      etiqueta: r.titulo,
      detalle: `${r.cuenta} · ${fmtFecha(r.fecha)}`,
      ruta: `/reuniones/${r.id}/transcripcion`,
    }))
    const deHerramientas: Resultado[] = CATALOGO_HERRAMIENTAS.map((h) => ({
      tipo: 'herramienta',
      etiqueta: h.nombre,
      detalle: h.descripcion,
      ruta: resolverRutaHerramienta(h.ruta, ultimaAnalizada),
    }))
    const todo = [...deReuniones, ...deHerramientas, ...COMANDOS]
    if (!q) return todo.slice(0, 9)
    return todo.filter((r) => `${r.etiqueta} ${r.detalle}`.toLowerCase().includes(q)).slice(0, 9)
  }, [consulta, reuniones, ultimaAnalizada])

  const abrir = (r: Resultado) => {
    cerrar()
    router.push(r.ruta)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24" onClick={cerrar} data-testid="command-bar">
      <div className="card w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Search className="h-4 w-4 text-ink-muted" />
          <input
            autoFocus
            value={consulta}
            onChange={(e) => {
              setConsulta(e.target.value)
              setCursor(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') setCursor((c) => Math.min(c + 1, resultados.length - 1))
              if (e.key === 'ArrowUp') setCursor((c) => Math.max(c - 1, 0))
              if (e.key === 'Enter' && resultados[cursor]) abrir(resultados[cursor])
            }}
            placeholder="Escribe para buscar…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto py-1">
          {resultados.length === 0 && (
            <li className="px-4 py-6 text-center text-[13px] text-ink-secondary">Sin resultados para “{consulta}”.</li>
          )}
          {resultados.map((r, i) => (
            <li key={`${r.tipo}-${r.etiqueta}`}>
              <button
                type="button"
                onClick={() => abrir(r)}
                onMouseEnter={() => setCursor(i)}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left ${i === cursor ? 'bg-surface-muted' : ''}`}
              >
                {r.tipo === 'reunion' ? (
                  <CalendarDays className="h-4 w-4 shrink-0 text-ink-muted" />
                ) : r.tipo === 'herramienta' ? (
                  <Wrench className="h-4 w-4 shrink-0 text-ink-muted" />
                ) : (
                  <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{r.etiqueta}</span>
                  <span className="block truncate text-[12px] text-ink-secondary">{r.detalle}</span>
                </span>
                <Chip>{r.tipo}</Chip>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function CommandBar() {
  const { commandBarAbierta, setCommandBar } = useUiStore()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandBar(true)
      }
      if (e.key === 'Escape') setCommandBar(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setCommandBar])

  if (!commandBarAbierta) return null
  return <PanelComandos cerrar={() => setCommandBar(false)} />
}
