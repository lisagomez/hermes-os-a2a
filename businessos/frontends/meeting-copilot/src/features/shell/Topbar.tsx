'use client'

import { LayoutGrid, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { ThemeToggle } from '@/shared/components/ThemeToggle'
import { Chip } from '@/shared/components/ui'
import { useUiStore } from '@/shared/stores/ui-store'
import { FUENTE_DATOS } from '@/shared/lib/config'

export function Topbar() {
  const { setCommandBar, setLauncher, launcherAbierto } = useUiStore()

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
      <button
        type="button"
        onClick={() => setCommandBar(true)}
        data-testid="abrir-command-bar"
        className="flex w-full max-w-md items-center gap-2 rounded-s border border-line bg-background px-3 py-1.5 text-left text-[13px] text-ink-muted transition-colors hover:border-accent"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 truncate">Buscar reuniones, herramientas o acciones…</span>
        <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <Chip tono={FUENTE_DATOS === 'mock' ? 'info' : 'success'}>datos: {FUENTE_DATOS}</Chip>
        <Link href="/reuniones/nueva" className="btn-primary" data-testid="nueva-conversacion">
          <Plus className="h-3.5 w-3.5" />
          Nueva conversación
        </Link>
        <button
          type="button"
          onClick={() => setLauncher(!launcherAbierto)}
          title="Herramientas"
          data-testid="abrir-launcher"
          className="rounded-s border border-line bg-surface p-2 text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}
