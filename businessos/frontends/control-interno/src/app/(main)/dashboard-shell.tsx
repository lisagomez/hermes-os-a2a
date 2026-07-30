'use client'
import { useState, useCallback, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Header } from '@/shared/components/Header'
import { SearchDialog } from '@/features/search/components'
import { SidebarNav } from '@/shared/components/SidebarNav'
import { useLayoutStore } from '@/shared/stores/layout-store'
import { useIsMobile } from '@/shared/hooks/useMediaQuery'
import { useGlobalShortcuts } from '@/shared/hooks/useGlobalShortcuts'
import { useAskAgent } from '@/shared/hooks/useAskAgent'
import { KeyboardShortcutsHelp } from '@/shared/components/KeyboardShortcutsHelp'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { RouteGuard } from '@/shared/components/RouteGuard'
import { Breadcrumb } from '@/shared/components/Breadcrumb'
import { KeepAliveRouter } from '@/shared/components/KeepAliveRouter'
import { RuntimeStatusPill } from '@/shared/components/RuntimeStatusPill'
import { ZoomController } from '@/shared/components/ZoomController'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { leftSidebarOpen, closeLeftSidebar, toggleLeftSidebar, drawFullscreen } = useLayoutStore()
  const [helpOpen, setHelpOpen] = useState(false)
  const pathname = usePathname()
  // "Móvil" independiente de la orientación: un teléfono en landscape (ancho > 768)
  // ya no se trata como desktop, así el header y el sidebar-overlay siguen visibles.
  const isMobile = useIsMobile()

  // Persist last visited route for cross-session restore (desktop)
  useEffect(() => {
    if (pathname) {
      localStorage.setItem('mc_lastRoute', pathname)
    }
  }, [pathname])

  // El sidebar arranca ABIERTO también en móvil (decisión de producto: es
  // su hub de navegación al abrir). NO auto-cerrarlo al arrancar — el intento
  // anterior producía un parpadeo abre→cierra en cada cold open. Se cierra al
  // elegir una sección (SidebarNav.handleNavigate) o al tocar el backdrop.

  // Auto-exit fullscreen when navigating away from Draw
  useEffect(() => {
    if (drawFullscreen && !pathname?.startsWith('/draw3')) {
      useLayoutStore.getState().exitDrawFullscreen()
    }
  }, [pathname, drawFullscreen])

  // AI-first: crear tarea = pedírsela al agente (el chat se abre con el draft listo).
  const askAgent = useAskAgent()
  const handleCreateTask = useCallback(() => {
    askAgent('Crea una tarea: ')
  }, [askAgent])

  const handleShowHelp = useCallback(() => {
    setHelpOpen(true)
  }, [])

  useGlobalShortcuts({
    onCreateTask: handleCreateTask,
    onShowHelp: handleShowHelp,
  })

  // Atajo global Cmd+Option+S — abre/cierra el panel de atajos desde cualquier lugar
  // (incluso con foco en un input). Gotcha Mac: Option+S produce 'ß', usar e.code.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.code === 'KeyS') {
        e.preventDefault()
        setHelpOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Sync keyboard metrics from the visual viewport. ALL routes (incl. /chat)
  // shrink the app shell to the visual viewport height when the keyboard opens.
  // The chat composer is an in-flow flex child, so it rides up flush above the
  // keyboard with no fixed positioning, no translate, no gap — one coordinate
  // system. (Single source of truth: do NOT also set --app-h in ZoomController.)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    let rafId: number
    let fullHeight = Math.max(window.innerHeight, vv.height, document.documentElement.clientHeight)
    const currentUiZoom = () => {
      const raw = window.getComputedStyle(document.documentElement).getPropertyValue('--ui-zoom')
      const zoom = Number.parseFloat(raw)
      return Number.isFinite(zoom) && zoom > 0 ? zoom : 1
    }
    const clearViewportVars = () => {
      document.documentElement.style.removeProperty('--app-h')
      document.documentElement.style.removeProperty('--visual-viewport-h')
      document.documentElement.style.removeProperty('--visual-viewport-top')
      document.documentElement.style.removeProperty('--keyboard-bottom')
    }
    const sync = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const root = document.documentElement
        const zoom = currentUiZoom()
        const active = document.activeElement as HTMLElement | null
        const activeEditable = !!active && (
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'INPUT' ||
          active.isContentEditable
        )
        if (!activeEditable) {
          fullHeight = Math.max(fullHeight, window.innerHeight, vv.height, root.clientHeight)
        }
        const layoutHeight = Math.max(window.innerHeight, root.clientHeight)
        const viewportBase = Math.max(fullHeight, layoutHeight)
        const keyboardInset = Math.max(0, layoutHeight - vv.height - vv.offsetTop)
        const keyboardDelta = Math.max(0, viewportBase - vv.height - vv.offsetTop)
        const isKeyboard = activeEditable && (keyboardDelta > 80 || vv.height < viewportBase * 0.82)
        root.classList.toggle('keyboard-open', isKeyboard)
        root.style.setProperty('--visual-viewport-h', `${vv.height / zoom}px`)
        root.style.setProperty('--visual-viewport-top', `${vv.offsetTop / zoom}px`)
        root.style.setProperty('--keyboard-bottom', `${keyboardInset / zoom}px`)
        if (isKeyboard) {
          root.style.setProperty('--app-h', `${vv.height / zoom}px`)
        } else {
          root.style.removeProperty('--app-h')
          clearViewportVars()
        }
      })
    }
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    window.addEventListener('resize', sync)
    sync()
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      cancelAnimationFrame(rafId)
      clearViewportVars()
    }
  }, [])

  // Reset viewport after keyboard dismissal (iOS can leave state stuck)
  useEffect(() => {
    const handleFocusOut = (e: FocusEvent) => {
      const related = e.relatedTarget as HTMLElement | null
      if (related?.tagName === 'TEXTAREA' || related?.tagName === 'INPUT' || related?.isContentEditable) return
      setTimeout(() => {
        document.documentElement.style.removeProperty('--app-h')
        document.documentElement.style.removeProperty('--visual-viewport-h')
        document.documentElement.style.removeProperty('--visual-viewport-top')
        document.documentElement.style.removeProperty('--keyboard-bottom')
        document.documentElement.classList.remove('keyboard-open')
        window.scrollTo(0, 0)
      }, 300)
    }
    document.addEventListener('focusout', handleFocusOut)
    return () => document.removeEventListener('focusout', handleFocusOut)
  }, [])

  // Anti-pan: iOS pans the layout viewport to "reveal" the caret on focus, even
  // though the shell already shrank to the visual viewport (caret is visible).
  // That pan is the "input jumps up too much" bug — the composer ends up a full
  // keyboard-height too high. Undo it REACTIVELY on every visual-viewport scroll
  // while an editable is focused, instead of 3 fixed-timer shots that miss frames
  // mid-animation. One handler, tied to the actual pan event, so it can't
  // overshoot and can't get stuck. scrollTo(0,0) when already at 0 is a no-op, so
  // this converges instead of looping. Inner list scroll ([data-scroll-region])
  // fires element scroll, not window/visualViewport scroll, so it's unaffected.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const isEditable = (el: Element | null) =>
      !!el && ((el as HTMLElement).tagName === 'TEXTAREA' ||
        (el as HTMLElement).tagName === 'INPUT' ||
        (el as HTMLElement).isContentEditable)
    const pin = () => {
      if (!isEditable(document.activeElement)) return
      if (window.scrollY !== 0 || vv.offsetTop > 0.5) window.scrollTo(0, 0)
    }
    const onFocusIn = (e: FocusEvent) => {
      if (!isEditable(e.target as Element | null)) return
      requestAnimationFrame(pin)
    }
    vv.addEventListener('scroll', pin)
    window.addEventListener('scroll', pin, { passive: true })
    window.addEventListener('focusin', onFocusIn)
    return () => {
      vv.removeEventListener('scroll', pin)
      window.removeEventListener('scroll', pin)
      window.removeEventListener('focusin', onFocusIn)
    }
  }, [])

  // While the keyboard is open, block the document from panning under it. Scroll
  // stays allowed inside the messages list ([data-scroll-region]); everywhere
  // else the touch drag is cancelled so iOS can't shift the fixed shell.
  //
  // EXCEPCIÓN (bug input móvil): un target EDITABLE (textarea/input/contentEditable)
  // también queda exento — con el teclado abierto el foco ESTÁ en el composer, así
  // que un preventDefault ciego mataba el scroll dentro del textarea Y la selección
  // de texto (arrastrar para seleccionar dispara touchmove). El commit d0ea377 añadió
  // CSS de scroll pero era inerte porque el gesto se cancelaba aquí, aguas arriba.
  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!document.documentElement.classList.contains('keyboard-open')) return
      const target = e.target as HTMLElement | null
      if (target?.closest('[data-scroll-region], textarea, input, [contenteditable]:not([contenteditable="false"])')) return
      e.preventDefault()
    }
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => document.removeEventListener('touchmove', onTouchMove)
  }, [])

  // Shell height = 26-may known-good: var(--app-h, 100dvh). --app-h is set only
  // while the keyboard is open (shrinks the shell above it); otherwise 100dvh
  // fills the screen. --ui-zoomed-app-h sits between them for desktop zoom and is
  // unset at zoom=1 (mobile), so mobile resolves to 100dvh exactly like 26-may.
  const appHeight = 'var(--app-h, var(--ui-zoomed-app-h, 100dvh))'
  const appWidth = 'var(--ui-zoomed-app-w, 100vw)'
  return (
    <div className="fixed inset-0 mission-shell">
    <ZoomController />
    <div
      className="flex flex-col overflow-hidden"
      style={{
        height: appHeight,
        width: appWidth,
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      {/* Header — solo móvil (incluye landscape de teléfono). Desktop usa sidebar
          rail + Cmd+Ctrl+H. isMobile en vez del breakpoint de ancho para que el
          header NO desaparezca al girar el teléfono. */}
      {!drawFullscreen && isMobile && <Header />}

      {/* Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile overlay (incluye landscape de teléfono) */}
        {leftSidebarOpen && !drawFullscreen && isMobile && (
          <div
            className="fixed inset-0 bg-black/50 z-30"
            onClick={closeLeftSidebar}
          />
        )}

        {/* Left Sidebar — hidden in fullscreen */}
        {!drawFullscreen && (
          <aside
            // En móvil cerrado el sidebar solo se desplaza fuera de pantalla
            // (transform), pero sigue vivo en el árbol de accesibilidad — iOS
            // Speak Screen ("Abrir lector") lo leía ANTES que los mensajes.
            // inert + aria-hidden lo sacan del árbol de verdad.
            inert={isMobile && !leftSidebarOpen}
            aria-hidden={isMobile && !leftSidebarOpen}
            className={
              isMobile
                ? `${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed z-40 w-64 bg-surface/90 backdrop-blur-xl border-r border-border-subtle shadow-depth-rest-soft transition-all duration-300 ease-in-out left-0 top-[calc(env(safe-area-inset-top,0px)+3.5rem)] flex flex-col overflow-hidden shrink-0 [--sidebar-header-offset:3.5rem]`
                : `relative z-0 ${leftSidebarOpen ? 'w-60' : 'w-[4.5rem]'} bg-surface/90 backdrop-blur-xl border-r border-border-subtle shadow-depth-rest-soft transition-all duration-300 ease-in-out flex flex-col overflow-visible shrink-0 [--sidebar-header-offset:0px]`
            }
            style={{ height: 'calc(var(--app-h, var(--ui-zoomed-app-h, 100dvh)) - env(safe-area-inset-top, 0px) - var(--sidebar-header-offset, 0px))' }}
          >
            <button
              onClick={toggleLeftSidebar}
              className={`icon-btn absolute -right-3 top-1/2 z-20 size-7 -translate-y-1/2 ${isMobile ? 'hidden' : 'flex'}`}
              title={leftSidebarOpen ? 'Colapsar sidebar (⌃⌘H)' : 'Expandir sidebar (⌃⌘H)'}
              aria-label={leftSidebarOpen ? 'Colapsar sidebar' : 'Expandir sidebar'}
            >
              {leftSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
            <SidebarNav collapsed={!leftSidebarOpen} />
          </aside>
        )}

        {/* Main Content — `relative` so pages can fill it with `absolute inset-0` (reliable scroll).
            El wrapper keyed por sección anima la ENTRADA de cada ruta (transición global premium);
            es absolute inset-0 para que el transform no rompa el posicionamiento de las páginas.
            Breadcrumb: barra delgada solo-desktop derivada del árbol (nav.config). */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {!isMobile && <Breadcrumb />}
          <main className="relative flex-1 overflow-hidden min-w-0">
            <RouteGuard>
              <div key={pathname?.split('/')[1] ?? ''} className="page-enter absolute inset-0">
                <KeepAliveRouter>{children}</KeepAliveRouter>
              </div>
            </RouteGuard>
          </main>
        </div>
      </div>

      {!drawFullscreen && (
        <>
          {/* Punto verde de runtime: solo desktop (en móvil no se necesita). */}
          {!isMobile && <RuntimeStatusPill />}
          <SearchDialog />
          <KeyboardShortcutsHelp isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
        </>
      )}
    </div>
    </div>
  )
}
