'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/shared/contexts/theme-context'

const iconByTheme = {
  dark: Moon,
  light: Sun,
  system: Monitor,
}

const labelByTheme = {
  dark: 'Dark',
  light: 'Light',
  system: 'System',
}

export function ThemeToggle({ compact = false, binary = false }: { compact?: boolean; binary?: boolean }) {
  const { theme, resolvedTheme, cycleTheme, toggleTheme } = useTheme()
  // En modo binario el boton refleja el tema RESUELTO (dark/light) y alterna entre
  // ambos — identico al atajo Cmd+Option+T. En modo ciclo muestra los 3 estados.
  const displayKey = binary ? resolvedTheme : theme
  const Icon = iconByTheme[displayKey]
  const label = labelByTheme[displayKey]

  return (
    <button
      type="button"
      onClick={binary ? toggleTheme : cycleTheme}
      className={compact ? 'icon-btn size-9' : 'nav-item w-full'}
      title={binary ? `Theme: ${label} · ⌘⌥T` : `Theme: ${label} (${resolvedTheme})`}
      aria-label={`Theme: ${label}`}
    >
      <Icon className="size-5 md:size-[15px]" />
      {!compact && <span>{label}</span>}
    </button>
  )
}
