'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemeMode } from '@/shared/contexts/theme-context'

const MODOS: { modo: ThemeMode; etiqueta: string; Icono: typeof Sun }[] = [
  { modo: 'system', etiqueta: 'Sistema', Icono: Monitor },
  { modo: 'light', etiqueta: 'Claro', Icono: Sun },
  { modo: 'dark', etiqueta: 'Oscuro', Icono: Moon },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex items-center rounded-lg border border-line bg-surface p-0.5" role="group" aria-label="Tema">
      {MODOS.map(({ modo, etiqueta, Icono }) => (
        <button
          key={modo}
          type="button"
          onClick={() => setTheme(modo)}
          title={etiqueta}
          aria-pressed={theme === modo}
          data-testid={`theme-${modo}`}
          className={`rounded-md p-1.5 transition-colors ${
            theme === modo ? 'bg-accent-muted text-accent' : 'text-ink-muted hover:text-ink'
          }`}
        >
          <Icono className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )
}
