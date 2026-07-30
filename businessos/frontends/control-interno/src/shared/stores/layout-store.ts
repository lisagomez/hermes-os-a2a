import { create } from 'zustand'

type ViewType = 'kanban' | 'list' | 'ops' | 'calendar'

interface LayoutState {
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  selectedView: ViewType
  chatSessionsPanelOpen: boolean
  drawSidebarOpen: boolean
  drawFullscreen: boolean
  /** Secciones del sidebar jerárquico plegadas (default: todo abierto). */
  seccionesCerradas: string[]
  toggleSeccion: (id: string) => void
  toggleLeftSidebar: () => void
  toggleRightSidebar: () => void
  setSelectedView: (view: ViewType) => void
  closeLeftSidebar: () => void
  closeRightSidebar: () => void
  toggleChatSessionsPanel: () => void
  closeChatSessionsPanel: () => void
  toggleDrawSidebar: () => void
  closeDrawSidebar: () => void
  toggleDrawFullscreen: () => void
  exitDrawFullscreen: () => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  leftSidebarOpen: true,
  rightSidebarOpen: false,
  selectedView: 'kanban',
  chatSessionsPanelOpen: false,
  drawSidebarOpen: true,
  drawFullscreen: false,
  seccionesCerradas: [],
  toggleSeccion: (id) =>
    set((s) => ({
      seccionesCerradas: s.seccionesCerradas.includes(id)
        ? s.seccionesCerradas.filter((x) => x !== id)
        : [...s.seccionesCerradas, id],
    })),
  toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
  toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
  setSelectedView: (view) => set({ selectedView: view }),
  closeLeftSidebar: () => set({ leftSidebarOpen: false }),
  closeRightSidebar: () => set({ rightSidebarOpen: false }),
  toggleChatSessionsPanel: () => set((s) => ({ chatSessionsPanelOpen: !s.chatSessionsPanelOpen })),
  closeChatSessionsPanel: () => set({ chatSessionsPanelOpen: false }),
  toggleDrawSidebar: () => set((s) => ({ drawSidebarOpen: !s.drawSidebarOpen })),
  closeDrawSidebar: () => set({ drawSidebarOpen: false }),
  toggleDrawFullscreen: () => set((s) => ({ drawFullscreen: !s.drawFullscreen })),
  exitDrawFullscreen: () => set({ drawFullscreen: false }),
}))
