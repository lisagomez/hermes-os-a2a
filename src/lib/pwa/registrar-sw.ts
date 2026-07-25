/**
 * Registro del service worker, aislado de React para poder probarlo sin DOM
 * (el gate `tests` corre el runner de Playwright SIN navegador).
 *
 * El bug que corrige: suscribirse a `window.load` desde un `useEffect` llega
 * TARDE en la mayoría de cargas (la hidratación ocurre después de `load`), así
 * que el evento ya disparó y el SW no se registraba nunca. Si el documento ya
 * está `complete`, hay que registrar de una vez.
 */

type NavegadorConSW = {
  serviceWorker?: { register: (url: string) => Promise<unknown> }
}

type DocumentoLike = { readyState: string }

type VentanaLike = {
  addEventListener: (tipo: 'load', cb: () => void) => void
  removeEventListener: (tipo: 'load', cb: () => void) => void
}

export const RUTA_SW = '/sw.js'

/** Devuelve la función de limpieza (quita el listener si lo puso). */
export function registrarServiceWorker(
  nav: NavegadorConSW,
  doc: DocumentoLike,
  win: VentanaLike
): () => void {
  const sw = nav.serviceWorker
  if (!sw) return () => {}

  const registrar = () => {
    // Silencioso a propósito: el panel funciona igual sin SW.
    Promise.resolve(sw.register(RUTA_SW)).catch(() => {})
  }

  if (doc.readyState === 'complete') {
    registrar()
    return () => {}
  }

  win.addEventListener('load', registrar)
  return () => win.removeEventListener('load', registrar)
}
