import { expect, test } from '@playwright/test'
import { registrarServiceWorker, RUTA_SW } from '../src/lib/pwa/registrar-sw'

/**
 * Regresión del deploy a Vercel (2026-07-25): el SW no se registraba NUNCA
 * porque solo se suscribía a `window.load`, que ya había disparado cuando
 * corre el efecto de React. Verificado en producción: `getRegistration()`
 * devolvía undefined y `caches.keys()` estaba vacío.
 */

function fakes(readyState: string) {
  const registrados: string[] = []
  const listeners: Array<() => void> = []
  const nav = {
    serviceWorker: {
      register: async (url: string) => {
        registrados.push(url)
        return {}
      },
    },
  }
  const doc = { readyState }
  const win = {
    addEventListener: (_t: 'load', cb: () => void) => listeners.push(cb),
    removeEventListener: (_t: 'load', cb: () => void) => {
      const i = listeners.indexOf(cb)
      if (i >= 0) listeners.splice(i, 1)
    },
  }
  return { nav, doc, win, registrados, listeners }
}

test('documento ya cargado: registra de inmediato, sin esperar a load', () => {
  const { nav, doc, win, registrados, listeners } = fakes('complete')

  registrarServiceWorker(nav, doc, win)

  expect(registrados).toEqual([RUTA_SW])
  expect(listeners).toHaveLength(0)
})

test('documento cargando: espera a load y entonces registra', () => {
  const { nav, doc, win, registrados, listeners } = fakes('loading')

  const limpiar = registrarServiceWorker(nav, doc, win)

  expect(registrados).toHaveLength(0)
  expect(listeners).toHaveLength(1)

  listeners[0]()
  expect(registrados).toEqual([RUTA_SW])

  limpiar()
  expect(listeners).toHaveLength(0)
})

test('navegador sin serviceWorker: no revienta ni suscribe nada', () => {
  const { doc, win, listeners } = fakes('complete')

  const limpiar = registrarServiceWorker({}, doc, win)
  limpiar()

  expect(listeners).toHaveLength(0)
})
