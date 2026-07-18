'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: ThemeMode
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: ThemeMode) => void
  cycleTheme: () => void
  toggleTheme: () => void
}

const STORAGE_KEY = 'business-os-theme'
const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: ThemeMode): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'dark'
  const resolved = theme === 'system' ? getSystemTheme() : theme
  const root = document.documentElement

  root.classList.toggle('dark', resolved === 'dark')
  root.dataset.theme = resolved
  root.style.colorScheme = resolved

  return resolved
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    const nextTheme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'dark'

    setThemeState(nextTheme)
    setResolvedTheme(applyTheme(nextTheme))
  }, [])

  useEffect(() => {
    if (theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setResolvedTheme(applyTheme('system'))

    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    window.localStorage.setItem(STORAGE_KEY, nextTheme)
    setThemeState(nextTheme)
    setResolvedTheme(applyTheme(nextTheme))
  }, [])

  const cycleTheme = useCallback(() => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'
    setTheme(nextTheme)
  }, [setTheme, theme])

  // Toggle binario dark<->light (atajo Cmd+Option+T y boton del sidebar).
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [resolvedTheme, setTheme])

  // Atajo global Cmd+Option+T. Gotcha Mac: Option+T produce el caracter '†', por
  // lo que e.key NO es 't' — hay que matchear contra e.code === 'KeyT'.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.code === 'KeyT') {
        e.preventDefault()
        toggleTheme()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleTheme])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, cycleTheme, toggleTheme }),
    [cycleTheme, resolvedTheme, setTheme, theme, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used within ThemeProvider')
  return value
}

const themeStorageKey = STORAGE_KEY
