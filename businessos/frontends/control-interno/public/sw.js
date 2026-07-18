// business-os-new Service Worker — Push + PWA Install + Cache Strategy
// Handles: fetch (cache-first static, stale-while-revalidate app-shell HTML), push, notification click

// v10: app-shell SWR para navegaciones + auto-reparación de version skew.
// El cold open del PWA pintaba en blanco esperando el round-trip del server
// (network-first HTML). Ahora servimos el HTML cacheado AL INSTANTE (keyed por
// pathname, ignora query como ?session=) y revalidamos en background — el shell
// pinta en ~0 y los datos frescos los trae el cliente como siempre.
// SKEW GUARD (verificado empíricamente en v9): tras un deploy, el HTML stale
// del build anterior podía dejar la app medio-hidratada (chunks/RSC del build
// viejo vs server nuevo). Ahora el revalidate compara la FIRMA de assets del
// HTML fresco vs el cacheado; si difiere (deploy nuevo) purga el cache de
// páginas y avisa a los clients para UN reload auto-reparador.
// Reglas iOS-safe: solo GET, solo same-origin, solo respuestas 200 type basic
// sin redirect, nunca range/206.
const CACHE_NAME = 'mc-sw-v10'
const PAGES_CACHE = 'mc-pages-v10'

// Static asset extensions that use cache-first strategy
const CACHEABLE_STATIC = /\.(js|css|png|jpg|jpeg|svg|woff2|woff|ico|webp)$/

// Turbopack/Webpack HMR chunks — must always hit network in dev. The hash in
// the filename changes every reload, so caching them serves dead URLs and
// crashes the Next.js router on hydration.
const HMR_CHUNK = /\/_next\/static\/chunks\/.*(turbopack|hmr|webpack-hmr)/i

// Rutas que NUNCA se sirven desde cache (flujos de auth deben ser frescos)
const NEVER_CACHE_PAGE = /^\/(login|signup|check-email|forgot-password|update-password|auth)/

// Solo cachear respuestas seguras: 200 same-origin sin redirect (un redirect
// a /login cacheado bajo /chat serviría la página equivocada para siempre).
function isCacheableResponse(response) {
  return response && response.status === 200 && response.type === 'basic' && !response.redirected
}

// Firma de build de un HTML: el conjunto de assets /_next/static/ que referencia.
// Cambia en cada deploy (hashes por chunk) — es nuestro detector de deploy nuevo.
function assetSignature(html) {
  const matches = html.match(/\/_next\/static\/[^"']+/g)
  if (!matches) return ''
  return [...new Set(matches)].sort().join('|')
}

// Revalidación con detector de skew: si el HTML fresco trae una firma de assets
// distinta a la del cacheado, hubo deploy — purgamos TODO el cache de páginas
// (cualquier otra ruta cacheada también es del build viejo) y FORZAMOS la
// recarga de los clients con client.navigate(). No sirve postMessage aquí: si
// el shell stale no pudo cargar sus chunks, el JS de la página está MUERTO y
// nadie escucha mensajes — navigate() funciona igual (verificado: ese era el
// hueco de la primera versión del guard). Rate-guard anti-loop: tras el
// navigate, el HTML re-cacheado ya es fresco → firmas iguales → no re-dispara.
let lastSkewReloadAt = 0

async function updatePageCache(pages, pageKey, response, cachedResponse) {
  try {
    const freshClone = response.clone()
    let deployChanged = false
    if (cachedResponse) {
      const [freshHtml, cachedHtml] = await Promise.all([
        response.clone().text(),
        cachedResponse.clone().text(),
      ])
      deployChanged = assetSignature(freshHtml) !== assetSignature(cachedHtml)
    }
    if (deployChanged) {
      await caches.delete(PAGES_CACHE)
      const fresh = await caches.open(PAGES_CACHE)
      await fresh.put(pageKey, freshClone)
      if (Date.now() - lastSkewReloadAt > 15000) {
        lastSkewReloadAt = Date.now()
        const clients = await self.clients.matchAll({ type: 'window' })
        for (const client of clients) {
          try { await client.navigate(client.url) } catch { /* client cerrado */ }
        }
      }
    } else {
      await pages.put(pageKey, freshClone)
    }
  } catch { /* best-effort: la próxima navegación reintenta */ }
}

// ── Install: precache app shell ─────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      await cache.addAll(['/icon.svg', '/manifest.json']).catch(() => {})
      // Warm del shell de las rutas de arranque (best-effort: si no hay sesión
      // el server redirige a /login y isCacheableResponse lo descarta).
      const pages = await caches.open(PAGES_CACHE)
      await Promise.all(
        ['/ml-dashboard', '/chat'].map(async (path) => {
          try {
            const res = await fetch(path, { credentials: 'include' })
            if (isCacheableResponse(res)) await pages.put(path, res)
          } catch { /* offline durante install — se llena en la primera navegación */ }
        })
      )
      await self.skipWaiting()
    })()
  )
})

// ── Activate: clean old caches ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME && n !== PAGES_CACHE)
          .map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  // Red de seguridad contra version skew: si el cliente detecta un chunk 404
  // (deploy nuevo con HTML stale), limpia el cache de páginas y recarga.
  if (event.data?.type === 'CLEAR_PAGES_CACHE') {
    event.waitUntil(caches.delete(PAGES_CACHE))
  }
})

// ── Fetch: strategy per resource type ───────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET requests
  if (request.method !== 'GET') return
  // Range requests (audio/video seeking) — cache.put lanza con 206. Red directa.
  if (request.headers.has('range')) return

  const url = new URL(request.url)

  // Solo same-origin. Supabase/analytics/API/HMR van directo a red.
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return
  if (HMR_CHUNK.test(url.pathname)) return

  // Cache-first: static assets (JS, CSS, images, fonts)
  if (CACHEABLE_STATIC.test(url.pathname) || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Update cache in background (stale-while-revalidate for static)
          event.waitUntil(
            fetch(request).then((response) => {
              if (isCacheableResponse(response)) {
                return caches.open(CACHE_NAME).then((cache) => cache.put(request, response))
              }
            }).catch(() => {})
          )
          return cached
        }
        // Not in cache — fetch and cache
        return fetch(request).then((response) => {
          if (isCacheableResponse(response)) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {})
          }
          return response
        })
      })
    )
    return
  }

  // App-shell SWR: navegaciones HTML. Cacheado al instante + revalidación en
  // background. Key = pathname puro para que /chat?session=xyz (deep-link de
  // push) pinte el MISMO shell cacheado de /chat sin esperar red.
  // Nota: solo request.mode === 'navigate' — los fetch RSC/data de Next NO
  // entran aquí (siguen network-only), esto sirve únicamente el documento.
  if (request.mode === 'navigate') {
    if (NEVER_CACHE_PAGE.test(url.pathname)) return

    const pageKey = url.pathname

    // UN solo fetch fresco por navegación, compartido entre la respuesta (cache
    // miss) y la revalidación. Se pide por pathname con un GET limpio — NO se
    // re-usa la Request navigate original (re-fetchearla como side-request no
    // completaba de forma confiable en Chrome).
    const freshFetch = fetch(pageKey, {
      credentials: 'include',
      cache: 'no-store',
      headers: { accept: 'text/html' },
    })

    // Revalidación + detector de skew — waitUntil registrado SÍNCRONO en el
    // dispatch del evento (registrarlo tarde, tras awaits, no es confiable).
    event.waitUntil(
      (async () => {
        try {
          const pages = await caches.open(PAGES_CACHE)
          const cached = await pages.match(pageKey)
          const cachedClone = cached ? cached.clone() : null
          const response = await freshFetch
          if (isCacheableResponse(response)) {
            await updatePageCache(pages, pageKey, response.clone(), cachedClone)
          }
        } catch { /* offline — la próxima navegación reintenta */ }
      })()
    )

    event.respondWith(
      (async () => {
        const pages = await caches.open(PAGES_CACHE)
        const cached = await pages.match(pageKey)
        if (cached) {
          // Pinta ya (bounded staleness: si hubo deploy, la revalidación de
          // arriba purga y fuerza client.navigate → un reload auto-reparador)
          return cached
        }
        try {
          const response = await freshFetch
          return response.clone()
        } catch {
          // Offline: el shell de /chat es el default de la app; /ml-dashboard
          // queda de respaldo para installs viejos que aún arrancan ahí.
          const fallback = (await pages.match('/chat')) || (await pages.match('/ml-dashboard'))
          return (
            fallback ||
            new Response(
              '<html><body style="background:#0a0a0f;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui"><div style="text-align:center"><h2>Offline</h2><p>Check your connection and try again.</p></div></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            )
          )
        }
      })()
    )
    return
  }
})

// ── Push Events ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  // iOS-safe: SIEMPRE mostrar una notificación por cada push recibido. Apple
  // revoca la suscripción en silencio tras ~3 pushes que no muestran nada
  // (y pushsubscriptionchange NUNCA dispara en iOS para avisarlo). Un push
  // sin data muestra el genérico en vez de tragarse el evento.
  let payload = {}
  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      payload = { title: 'business-os-new', body: event.data.text() }
    }
  }

  const title = payload.title ?? 'business-os-new'
  const options = {
    body: payload.body ?? '',
    icon: payload.icon ?? '/icon.svg',
    badge: '/icon.svg',
    tag: payload.tag ?? 'mc-notification',
    data: { url: payload.url ?? '/', notificationId: payload.notificationId },
    requireInteraction: false,
    silent: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ── Notification Click ────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url ?? '/'

  // Extract session id (if deep-linking to a chat) so we can postMessage to
  // already-open clients — client.navigate to the same route doesn't remount
  // the page, so the in-memory ChatPanel needs an explicit signal to switch.
  let sessionId = null
  try {
    const u = new URL(targetUrl, self.location.origin)
    sessionId = u.searchParams.get('session')
  } catch { /* targetUrl is relative or invalid — ignore */ }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl)
          if (sessionId) {
            client.postMessage({ type: 'open-chat-session', sessionId })
          }
          return client.focus()
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})

// ── Push Subscription Change ──────────────────────────────────────────
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true, applicationServerKey: event.oldSubscription?.options?.applicationServerKey })
      .then((subscription) => {
        return fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription }),
        })
      })
  )
})
