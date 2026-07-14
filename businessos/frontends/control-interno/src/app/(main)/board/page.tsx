'use client'
import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { KanbanBoard, ListView } from '@/features/tasks/components'
import { useTasks } from '@/features/tasks/hooks/useTasks'
import { useLayoutStore } from '@/shared/stores/layout-store'
import { useFiltersStore, type DueHorizon } from '@/shared/stores/filters-store'
import { useTasksStore } from '@/shared/stores/tasks-store'
import { useAuth } from '@/hooks/useAuth'
import { LayoutGrid, List } from 'lucide-react'

const HORIZONS: { key: string; h: DueHorizon; label: string }[] = [
  { key: 'd', h: 'today', label: 'Día' },
  { key: 'w', h: 'week', label: 'Semana' },
  { key: 'm', h: 'month', label: 'Mes' },
]

export default function BoardPage() {
  const searchParams = useSearchParams()
  useTasks()
  const selectedView = useLayoutStore((s) => s.selectedView)
  const setSelectedView = useLayoutStore((s) => s.setSelectedView)
  const { profile, isOwner, loading } = useAuth()
  const setFilter = useFiltersStore((s) => s.setFilter)
  const dueHorizon = useFiltersStore((s) => s.filters.dueHorizon)
  const selectTask = useTasksStore((s) => s.selectTask)
  const tasks = useTasksStore((s) => s.tasks)
  const didAutoFilter = useRef(false)

  // Open task from ?task=ID query param (e.g. from push notification click)
  useEffect(() => {
    const taskId = searchParams.get('task')
    if (taskId && tasks.length > 0) {
      selectTask(taskId)
      window.history.replaceState({}, '', '/board')
    }
  }, [searchParams, tasks, selectTask])

  // Auto-filter members to their own tasks on first load
  useEffect(() => {
    if (loading || didAutoFilter.current) return
    if (!isOwner && profile?.id) {
      setFilter('assigneeId', profile.id)
      didAutoFilter.current = true
    }
  }, [loading, isOwner, profile, setFilter])

  // Lente de horizonte d/w/m (mismas teclas que el calendario, unificado).
  // d=hoy, w=semana, m=mes; misma tecla otra vez o Esc/c lo limpia.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      const match = HORIZONS.find((x) => x.key === k)
      if (match) {
        e.preventDefault()
        setFilter('dueHorizon', dueHorizon === match.h ? null : match.h)
      } else if (e.key === 'Escape' || k === 'c') {
        if (dueHorizon) { e.preventDefault(); setFilter('dueHorizon', null) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dueHorizon, setFilter])

  return (
    <div className="h-full flex flex-col">

      {/* View toggle */}
      <div className="flex items-center gap-1.5 px-4 pt-2 pb-1">
        <button
          onClick={() => setSelectedView('kanban')}
          className={`nav-item min-h-0 px-3 py-1.5 text-xs font-semibold ${selectedView === 'kanban' ? 'nav-item-active -translate-y-px' : ''}`}
        >
          <LayoutGrid size={13} strokeWidth={1.8} />
          Board
        </button>
        <button
          onClick={() => setSelectedView('list')}
          className={`nav-item min-h-0 px-3 py-1.5 text-xs font-semibold ${selectedView === 'list' ? 'nav-item-active -translate-y-px' : ''}`}
        >
          <List size={13} strokeWidth={1.8} />
          List
        </button>

        {/* Lente de horizonte d/w/m (atajos de teclado + clic) */}
        <div className="ml-auto flex items-center gap-1">
          <span className="mr-1 text-[10px] uppercase tracking-wide text-muted/50">Horizonte</span>
          {HORIZONS.map(({ key, h, label }) => (
            <button
              key={h}
              onClick={() => setFilter('dueHorizon', dueHorizon === h ? null : h)}
              title={`Filtrar a ${label.toLowerCase()} · tecla ${key}`}
              className={`nav-item min-h-0 px-2.5 py-1.5 text-xs font-semibold ${dueHorizon === h ? 'nav-item-active -translate-y-px' : ''}`}
            >
              {label}
              <kbd className="ml-1 text-[9px] text-muted/50">{key}</kbd>
            </button>
          ))}
        </div>
      </div>

      {/* View content */}
      <div className="flex-1 min-h-0">
        {selectedView === 'list' ? <ListView /> : <KanbanBoard />}
      </div>
    </div>
  )
}
