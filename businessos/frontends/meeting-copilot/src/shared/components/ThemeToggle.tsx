'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemeMode } from '@/shared/contexts/theme-context'
import { PillToggle } from '@/shared/components/ui'

const MODOS: { modo: ThemeMode; etiqueta: string; Icono: typeof Sun }[] = [
  { modo: 'system', etiqueta: 'Sistema', Icono: Monitor },
  { modo: 'light', etiqueta: 'Claro', Icono: Sun },
  { modo: 'dark', etiqueta: 'Oscuro', Icono: Moon },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <PillToggle
      etiqueta="Tema"
      valor={theme}
      onCambio={setTheme}
      claseBoton="p-1.5"
      claseInactiva="text-ink-muted hover:text-ink"
      opciones={MODOS.map(({ modo, etiqueta, Icono }) => ({
        id: modo,
        title: etiqueta,
        testid: `theme-${modo}`,
        contenido: <Icono className="h-3.5 w-3.5" />,
      }))}
    />
  )
}
