'use client'

import { useEffect } from 'react'

/**
 * Registra el service worker (solo en producción / https). Sin efecto en dev
 * para no interferir con el HMR de Next.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // silencioso: el panel funciona igual sin SW
      })
    }
    window.addEventListener('load', onLoad)
    return () => window.removeEventListener('load', onLoad)
  }, [])

  return null
}
