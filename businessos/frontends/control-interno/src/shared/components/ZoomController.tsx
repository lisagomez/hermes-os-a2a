'use client'

import { useEffect } from 'react'

/**
 * Browser-like UI zoom (Cmd/Ctrl +, Cmd/Ctrl -, Cmd/Ctrl 0 to reset).
 *
 * Scales the whole app via CSS `zoom` on <html> (works in the Tauri WKWebView too,
 * where Chrome's native zoom isn't available) and persists the level to localStorage.
 */
const KEY = 'mc-ui-zoom'
const MIN = 0.6
const MAX = 1.8
const STEP = 0.1

function applyZoom(z: number) {
  const root = document.documentElement
  const safeZoom = Number.isFinite(z) && z > 0 ? z : 1

  root.style.setProperty('zoom', String(safeZoom))
  root.style.setProperty('--ui-zoom', String(safeZoom))

  // Only publish the zoomed pixel height/width when there is REAL zoom. At
  // zoom=1 (always on mobile) these would resolve to window.innerHeight, which
  // in an iOS standalone PWA (viewport-fit=cover) does NOT cover the full
  // physical screen — leaving a black band below the content. Unset them so the
  // shell's height fallback lands on 100% of the fixed-inset-0 .mission-shell
  // (true fullscreen). Desktop zoom (!=1) still uses the explicit pixel values.
  if (safeZoom === 1) {
    root.style.removeProperty('--ui-zoomed-app-h')
    root.style.removeProperty('--ui-zoomed-app-w')
  } else {
    root.style.setProperty('--ui-zoomed-app-h', `${window.innerHeight / safeZoom}px`)
    root.style.setProperty('--ui-zoomed-app-w', `${window.innerWidth / safeZoom}px`)
  }

  // --app-h is owned solely by DashboardShell's visualViewport sync (one source
  // of truth). It already listens to visualViewport.resize, so it covers the
  // zoom + keyboard case without a competing write here.
}

export function ZoomController() {
  useEffect(() => {
    const stored = Number.parseFloat(localStorage.getItem(KEY) ?? '1')
    let zoom = Number.isFinite(stored) && stored > 0 ? stored : 1
    applyZoom(zoom)

    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return
      // En el lienzo (/draw3) el zoom lo maneja la CAMARA del canvas (Cmd+0/=/-),
      // no el zoom CSS del UI. Si no, Cmd+0 reseteaba el UI en vez del canvas, y
      // Cmd+= zoomeaba el UI metiendo offsets en las coordenadas del puntero.
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/draw3')) return
      let next: number | null = null
      if (e.key === '=' || e.key === '+') next = Math.min(MAX, Math.round((zoom + STEP) * 100) / 100)
      else if (e.key === '-' || e.key === '_') next = Math.max(MIN, Math.round((zoom - STEP) * 100) / 100)
      else if (e.key === '0') next = 1
      else return
      e.preventDefault()
      zoom = next
      applyZoom(zoom)
      try {
        localStorage.setItem(KEY, String(zoom))
      } catch {
        // ignore (private mode / storage disabled)
      }
    }
    const onResize = () => applyZoom(zoom)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    window.visualViewport?.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
      window.visualViewport?.removeEventListener('resize', onResize)
    }
  }, [])

  return null
}
