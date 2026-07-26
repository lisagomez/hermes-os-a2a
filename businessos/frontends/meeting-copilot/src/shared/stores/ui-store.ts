'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  sidebarColapsado: boolean
  launcherAbierto: boolean
  commandBarAbierta: boolean
  pinned: string[] // slugs de herramientas fijadas
  recientes: { slug: string; ts: number }[]
  toggleSidebar: () => void
  setLauncher: (abierto: boolean) => void
  setCommandBar: (abierta: boolean) => void
  togglePin: (slug: string) => void
  registrarUso: (slug: string) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarColapsado: false,
      launcherAbierto: false,
      commandBarAbierta: false,
      pinned: ['voice-transcription', 'guided-meeting', 'scorecards'],
      recientes: [],
      toggleSidebar: () => set((s) => ({ sidebarColapsado: !s.sidebarColapsado })),
      setLauncher: (abierto) => set({ launcherAbierto: abierto }),
      setCommandBar: (abierta) => set({ commandBarAbierta: abierta }),
      togglePin: (slug) =>
        set((s) => ({
          pinned: s.pinned.includes(slug) ? s.pinned.filter((p) => p !== slug) : [...s.pinned, slug],
        })),
      registrarUso: (slug) =>
        set((s) => ({
          recientes: [{ slug, ts: Date.now() }, ...s.recientes.filter((r) => r.slug !== slug)].slice(0, 8),
        })),
    }),
    {
      name: 'meeting-copilot-ui',
      partialize: (s) => ({ sidebarColapsado: s.sidebarColapsado, pinned: s.pinned, recientes: s.recientes }),
    }
  )
)
