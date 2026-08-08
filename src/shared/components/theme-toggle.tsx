'use client'

// Selector de tema del panel: glifos Unicode (doctrina MC: sin lucide),
// aria-label + title en texto — el estado nunca es color-solo.

import { useTheme, type ThemeMode } from '@/shared/contexts/theme-context'

const MODOS: { modo: ThemeMode; etiqueta: string; glifo: string }[] = [
  { modo: 'system', etiqueta: 'Sistema', glifo: '◐' },
  { modo: 'light', etiqueta: 'Claro', glifo: '☀' },
  { modo: 'dark', etiqueta: 'Oscuro', glifo: '☾' },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <div
      role="group"
      aria-label="Tema del panel"
      className="flex items-center gap-0.5 rounded-full border border-line bg-surface-muted p-0.5"
    >
      {MODOS.map(({ modo, etiqueta, glifo }) => (
        <button
          key={modo}
          type="button"
          title={etiqueta}
          aria-label={`Tema ${etiqueta.toLowerCase()}`}
          aria-pressed={theme === modo}
          onClick={() => setTheme(modo)}
          className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
            theme === modo
              ? 'bg-surface text-ink shadow-sm'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          <span aria-hidden>{glifo}</span>
        </button>
      ))}
    </div>
  )
}
