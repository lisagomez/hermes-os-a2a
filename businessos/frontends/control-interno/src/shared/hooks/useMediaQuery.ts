'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Reactive media-query hook (SSR-safe) vía useSyncExternalStore. En el cliente el
 * valor correcto se aplica DURANTE la hidratación (no tras un useEffect), así el
 * shell no parpadea desktop→móvil en cada apertura. El servidor devuelve false
 * (no conoce el viewport) sin disparar hydration error — React lo reconcilia.
 */
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {}
    const mql = window.matchMedia(query)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  const getSnapshot = () =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false
  const getServerSnapshot = () => false

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * "Teléfono" — independiente de la orientación. Verdadero si el viewport es
 * angosto (portrait) O si es un dispositivo táctil con viewport corto (landscape
 * de teléfono, alto ≤ 600px). Así un iPhone girado SIGUE siendo móvil, pero el
 * desktop (puntero fino, viewport alto) y los tablets (táctil pero altos) NO.
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px), (pointer: coarse) and (max-height: 600px)')
}

/** Coarse pointer (finger/stylus) — independent of viewport size. */
function useIsCoarsePointer(): boolean {
  return useMediaQuery('(pointer: coarse)')
}
