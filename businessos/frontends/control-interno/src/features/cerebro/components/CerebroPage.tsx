'use client'
// Artificial Brain — the surface where the system looks at itself, organized in
// ROOMS (each room answers one question the owner has):
//   · Neuronas (KNOWS): atlas of your curated knowledge — a 2D constellation.
//     The graph ENDS IN ACTION: slice/question → artifact via synthesis.
//   · Acciones (OPERATES): what the brain did today and what it costs.
//
// Two more rooms (Plasticidad = SHAPES, Metabolismo = SELF-REGULATE) are part of
// the pattern but need your own nightly "organ" writing their tables, so they
// ship as docs (schema + write contract), not empty UI — see
// docs/ARTIFICIAL-BRAIN.md. White-label: Neuronas reads MEMORY_ROOT (empty by
// default); Acciones reads your daemon's cron runs via /api/openclaw/event.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, RefreshCw, Search, Sparkles, X } from 'lucide-react'
import type { CerebroGraph, CerebroNodeType } from '../types'
import { TYPE_META } from '../types'
import { GraphCanvas } from './GraphCanvas'
import { NodePanel } from './NodePanel'
import { SynthesisPanel } from './SynthesisPanel'
import { AccionesRoom } from './AccionesRoom'

const ALL_TYPES = Object.keys(TYPE_META) as CerebroNodeType[]

type PanelMode = 'node' | 'synthesis' | null

// The four rooms = the four verbs of a self-governing system. The loop is
// COMPLETE — there is no fifth room (every new "organ" goes through the ledger).
type SalaId = 'neuronas' | 'acciones'
const SALAS: Array<{ id: SalaId; label: string; hint: string }> = [
  { id: 'neuronas', label: 'Neuronas', hint: 'What it knows (KNOWS)' },
  { id: 'acciones', label: 'Acciones', hint: 'What it does & what it costs (OPERATES)' },
]

export function CerebroPage() {
  const [sala, setSala] = useState<SalaId>('neuronas')
  const [graph, setGraph] = useState<CerebroGraph | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleTypes, setVisibleTypes] = useState<CerebroNodeType[]>(ALL_TYPES)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chain, setChain] = useState<string[]>([])
  const [slice, setSlice] = useState<string[]>([])
  const [panel, setPanel] = useState<PanelMode>(null)

  // The room persists (localStorage) and accepts a deep-link ?sala=acciones.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fromUrl = params.get('sala')
    const saved = window.localStorage.getItem('businessos:sala')
    const target = fromUrl ?? saved
    if (target && SALAS.some((s) => s.id === target)) setSala(target as SalaId)
  }, [])
  const switchSala = (s: SalaId) => {
    setSala(s)
    window.localStorage.setItem('businessos:sala', s)
  }

  const load = useCallback(async (refresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/cerebro/graph${refresh ? '?refresh=1' : ''}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: CerebroGraph = await res.json()
      setGraph(data)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setLoading(false)
    }
  }, [])

  // The graph loads lazily: only when Neuronas is (or becomes) on screen.
  const hasLoadedGraph = useRef(false)
  useEffect(() => {
    if (sala !== 'neuronas' || hasLoadedGraph.current) return
    hasLoadedGraph.current = true
    load()
  }, [sala, load])

  const nodesById = useMemo(
    () => new Map((graph?.nodes ?? []).map((n) => [n.id, n])),
    [graph],
  )

  const typeCounts = useMemo(() => {
    const counts = {} as Record<CerebroNodeType, number>
    for (const t of ALL_TYPES) counts[t] = 0
    for (const n of graph?.nodes ?? []) counts[n.type]++
    return counts
  }, [graph])

  const handleSelect = useCallback((id: string | null, additive: boolean) => {
    if (id && additive) {
      // shift/cmd+click: build the slice for synthesis
      setSlice((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
      setPanel((p) => (p === null ? 'synthesis' : p))
      return
    }
    if (!id) {
      setSelectedId(null)
      setPanel((p) => (p === 'node' ? null : p))
      return
    }
    setSelectedId(id)
    setChain((prev) => (prev[prev.length - 1] === id ? prev : [...prev, id]))
    setPanel('node')
  }, [])

  const handleNavigate = useCallback((id: string) => {
    setSelectedId(id)
    setChain((prev) => (prev[prev.length - 1] === id ? prev : [...prev, id]))
    setPanel('node')
  }, [])

  const handleBack = useCallback(() => {
    setChain((prev) => {
      if (prev.length <= 1) return prev
      const next = prev.slice(0, -1)
      setSelectedId(next[next.length - 1])
      return next
    })
  }, [])

  const handleAddToSlice = useCallback((id: string) => {
    setSlice((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }, [])

  const handleSynthesizeNeighborhood = useCallback(
    (id: string) => {
      const hood = new Set<string>([id])
      for (const e of graph?.edges ?? []) {
        if (e.kind === 'tag') continue
        if (e.source === id) hood.add(e.target)
        if (e.target === id) hood.add(e.source)
      }
      setSlice([...hood].slice(0, 15))
      setPanel('synthesis')
    },
    [graph],
  )

  const toggleType = (t: CerebroNodeType) => {
    setVisibleTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    )
  }

  const showPanel = panel !== null

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle px-4 py-2.5">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-extrabold tracking-tight text-foreground">
            Artificial Brain
          </h1>
          {/* Room switcher */}
          <div className="flex overflow-hidden rounded-lg border border-border text-[10px] font-bold">
            {SALAS.map((s) => (
              <button
                key={s.id}
                onClick={() => switchSala(s.id)}
                title={s.hint}
                className={`px-2.5 py-1.5 transition-colors ${
                  sala === s.id
                    ? 'bg-primary/20 text-accent-purple'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {sala === 'neuronas' && graph?.ok && (
            <span className="hidden text-[10px] text-muted lg:inline">
              {graph.nodes.length} nodes · {graph.edges.length} links ·{' '}
              {graph.meta.isolatedCount} isolated
            </span>
          )}
        </div>

        {sala === 'neuronas' && (
          <>
            {/* Search */}
            <div className="relative ml-auto w-44 sm:w-60">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the brain…"
                className="w-full rounded-lg border border-border bg-card py-1.5 pl-8 pr-7 text-xs text-foreground placeholder:text-muted/60 focus:border-primary/50 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setPanel(panel === 'synthesis' ? null : 'synthesis')}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                panel === 'synthesis'
                  ? 'border-gold bg-gold/15 text-gold'
                  : 'border-gold/40 text-gold hover:bg-gold/10'
              }`}
            >
              <Sparkles className="size-3.5" />
              Synthesize
              {slice.length > 0 && (
                <span className="rounded-full bg-gold px-1.5 text-[9px] font-bold text-black">
                  {slice.length}
                </span>
              )}
            </button>
            <button
              onClick={() => load(true)}
              className="icon-btn size-8"
              title="Re-scan memory"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </>
        )}
      </div>

      {/* Acciones room (OPERATES) — mirror of the brain's activity */}
      {sala === 'acciones' && (
        <div className="min-h-0 flex-1 bg-background">
          <AccionesRoom />
        </div>
      )}

      {/* Neuronas room (KNOWS) — the graph */}
      {sala === 'neuronas' && (
      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1 bg-background">
          {loading && !graph && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 text-xs text-muted">
                <Loader2 className="size-4 animate-spin text-accent-purple" />
                Scanning the brain…
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="max-w-sm rounded-xl border border-error/40 bg-card px-4 py-3 text-center text-xs text-error">
                {error}
              </div>
            </div>
          )}
          {graph && !graph.ok && (
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <div className="glass-panel max-w-md rounded-2xl px-5 py-4 text-center">
                <p className="text-sm font-semibold text-foreground">
                  Point <code>MEMORY_ROOT</code> at your curated markdown
                </p>
                <p className="mt-1 text-xs text-muted">
                  This room reads <code>.claude/memory</code> and{' '}
                  <code>.claude/knowledge</code> server-side from the folder in your
                  <code> MEMORY_ROOT</code> env var. It&apos;s empty by default — nothing is
                  inherited. See <code>docs/ARTIFICIAL-BRAIN.md</code>.
                </p>
              </div>
            </div>
          )}
          {graph?.ok && (
            <GraphCanvas
              nodes={graph.nodes}
              edges={graph.edges}
              visibleTypes={visibleTypes}
              query={query}
              selectedId={selectedId}
              multiSelection={slice}
              onSelect={handleSelect}
            />
          )}

          {/* Legend / type filters */}
          {graph?.ok && (
            <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
              {ALL_TYPES.map((t) => {
                const active = visibleTypes.includes(t)
                const meta = TYPE_META[t]
                return (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold backdrop-blur transition-all ${
                      active
                        ? 'border-border bg-card/80 text-foreground'
                        : 'border-border-subtle bg-card/40 text-muted/50 line-through'
                    }`}
                    title={`${meta.label} (${typeCounts[t]}) — click to ${active ? 'hide' : 'show'}`}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: meta.color, opacity: active ? 1 : 0.35 }}
                    />
                    {meta.label}
                    <span className="font-normal text-muted">{typeCounts[t]}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Interaction hint */}
          {graph?.ok && !showPanel && (
            <div className="pointer-events-none absolute right-3 top-3 hidden rounded-lg bg-card/70 px-2.5 py-1.5 text-[10px] text-muted backdrop-blur md:block">
              click = open node · shift+click = build slice · double click = fit
            </div>
          )}
        </div>

        {/* Side panel (overlay on mobile). Both panels stay MOUNTED while the
            aside is open and toggle with CSS, so opening a node does NOT unmount
            an in-progress synthesis. */}
        {showPanel && (
          <aside className="absolute inset-y-0 right-0 z-10 w-full border-l border-border-subtle bg-surface md:static md:w-[420px] md:shrink-0">
            {selectedId && (
              <div className={`h-full ${panel === 'node' ? '' : 'hidden'}`}>
                <NodePanel
                  nodeId={selectedId}
                  chain={chain}
                  onNavigate={handleNavigate}
                  onBack={handleBack}
                  onClose={() => {
                    setPanel(null)
                    setSelectedId(null)
                  }}
                  onAddToSlice={handleAddToSlice}
                  onSynthesizeNeighborhood={handleSynthesizeNeighborhood}
                  inSlice={selectedId ? slice.includes(selectedId) : false}
                />
              </div>
            )}
            <div className={`h-full ${panel === 'synthesis' ? '' : 'hidden'}`}>
              <SynthesisPanel
                nodesById={nodesById}
                slice={slice}
                onRemoveFromSlice={handleAddToSlice}
                onClearSlice={() => setSlice([])}
                onClose={() => setPanel(null)}
              />
            </div>
          </aside>
        )}
      </div>
      )}
    </div>
  )
}
