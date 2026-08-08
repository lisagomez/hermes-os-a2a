'use client'

// Tema tri-estado del panel (portado del canon de meeting-copilot, skin
// ejecutiva). El script anti-flash de layout.tsx pinta ANTES del primer paint;
// este provider solo mantiene el estado vivo y persiste la elección.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: ThemeMode
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: ThemeMode) => void
}

export const THEME_STORAGE_KEY = 'mission-control-theme'
const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: ThemeMode): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light'
  const resolved = theme === 'system' ? getSystemTheme() : theme
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.dataset.theme = resolved
  root.style.colorScheme = resolved
  return resolved
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // Sincronización ÚNICA al montar con localStorage (sistema externo). Hacerlo
  // en el initializer de useState provocaría hydration mismatch: el HTML de SSR
  // se renderiza con el default y el script anti-flash ya pintó el tema real.
  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null
    const next = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ver comentario del bloque
    setThemeState(next)
    setResolvedTheme(applyTheme(next))
  }, [])

  useEffect(() => {
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setResolvedTheme(applyTheme('system'))
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((next: ThemeMode) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, next)
    setThemeState(next)
    setResolvedTheme(applyTheme(next))
  }, [])

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return value
}
