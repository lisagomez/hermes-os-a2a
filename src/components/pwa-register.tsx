'use client'

import { useEffect } from 'react'
import { registrarServiceWorker } from '@/lib/pwa/registrar-sw'

/**
 * Registra el service worker (solo en producción / https). Sin efecto en dev
 * para no interferir con el HMR de Next. La lógica vive en
 * `@/lib/pwa/registrar-sw` para poder probarla sin DOM.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return
    return registrarServiceWorker(navigator, document, window)
  }, [])

  return null
}
