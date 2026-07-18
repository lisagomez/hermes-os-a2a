import type { UserRole } from '@/types/database'

const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/': ['owner', 'admin', 'member'],
  '/board': ['owner', 'admin', 'member'],
  '/chat': ['owner'],
  '/activity': ['owner'],
  '/ops': ['owner', 'admin'],
  '/cron': ['owner'],
  '/calendar': ['owner', 'admin', 'member'],
  '/draw3': ['owner', 'admin'],
  '/settings': ['owner', 'admin', 'member'],
  '/command-center': ['owner'],
  '/conversations': ['owner'],
  '/segundo-cerebro': ['owner'],
  '/finanzas': ['owner'],
}

export function canAccessRoute(pathname: string, role: UserRole): boolean {
  if (role === 'owner') return true

  // Exact match
  const exact = ROUTE_PERMISSIONS[pathname]
  if (exact) return exact.includes(role)

  // Prefix match for dynamic routes like /draw/[id]
  for (const [route, roles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (route !== '/' && pathname.startsWith(route + '/')) {
      return roles.includes(role)
    }
  }

  // Default: owner-only
  return false
}

// Rutas de aterrizaje SEGURAS: páginas reales que NO redirigen server-side.
// OJO: '/' NO va aquí — '/' hace redirect('/chat') (owner-only), así que mandar a
// un no-owner a '/' lo devuelve a '/chat', el guard lo vuelve a expulsar y se forma
// un loop infinito (el parpadeo). Estas rutas se quedan donde aterrizan.
const SAFE_LANDING_ROUTES = ['/board', '/calendar', '/ops', '/settings'] as const

// A dónde mandar a un usuario cuando NO puede ver la ruta actual. Devuelve la primera
// ruta segura que su rol sí puede abrir (owner nunca llega aquí: canAccessRoute=true).
export function landingRouteFor(role: UserRole): string {
  for (const route of SAFE_LANDING_ROUTES) {
    if (canAccessRoute(route, role)) return route
  }
  return '/board'
}
