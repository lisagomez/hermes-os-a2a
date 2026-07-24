// Service worker de Mission Control.
// Diseño DELIBERADAMENTE conservador: es un panel con datos de negocio y auth.
// NUNCA cacheamos navegaciones/HTML ni respuestas de Supabase → jamás se sirve
// una página sensible obsoleta ni se salta el redirect de login. Solo cacheamos
// assets estáticos e inmutables (iconos, /_next/static) para instalabilidad y
// carga rápida del shell.

const CACHE = 'mc-static-v1'

const PRECACHE = [
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/manifest.webmanifest',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  const esEstaticoInmutable =
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/_next/static/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname === '/manifest.webmanifest')

  if (!esEstaticoInmutable) return // navegaciones, datos, cross-origin → red directa

  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copia = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copia))
          }
          return res
        })
    )
  )
})
