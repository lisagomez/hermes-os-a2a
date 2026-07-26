'use client'

import Link from 'next/link'
import { ArrowUpRight, X } from 'lucide-react'
import { useUiStore } from '@/shared/stores/ui-store'
import { LauncherGrid } from './LauncherGrid'

/** Launcher estilo "apps de Google": popover anclado a la topbar. */
export function LauncherPopover() {
  const { launcherAbierto, setLauncher } = useUiStore()
  if (!launcherAbierto) return null

  return (
    <div className="fixed inset-0 z-40" onClick={() => setLauncher(false)} data-testid="launcher-popover">
      <div
        className="card absolute right-4 top-14 flex max-h-[75vh] w-[26rem] flex-col overflow-hidden shadow-[var(--shadow-2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <p className="text-[13px] font-semibold text-ink">Herramientas</p>
          <div className="flex items-center gap-1">
            <Link
              href="/herramientas"
              onClick={() => setLauncher(false)}
              className="flex items-center gap-1 rounded px-2 py-1 text-[12px] font-medium text-accent hover:bg-accent-muted"
            >
              Ver todas <ArrowUpRight className="h-3 w-3" />
            </Link>
            <button
              type="button"
              onClick={() => setLauncher(false)}
              className="rounded p-1 text-ink-muted hover:text-ink"
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto p-4">
          <LauncherGrid compacto />
        </div>
      </div>
    </div>
  )
}
