'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { canAccessRoute, landingRouteFor } from '@/lib/permissions'
import type { UserRole } from '@/types/database'

const CACHED_ROLE_KEY = 'mc_cachedRole'
const VALID_ROLES: UserRole[] = ['owner', 'admin', 'member']

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, role, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const checkedRef = useRef(false)

  // Render optimista: el rol cacheado de la última sesión resuelta pinta el
  // contenido AL INSTANTE (sin esperar el round-trip auth+profile, que en red
  // mala tarda segundos). Es solo percepción de UI — cada API sigue validando
  // server-side, y si el rol real difiere al resolver, el guard corrige abajo.
  // Se lee en useEffect (no en el initializer) para no romper la hidratación:
  // el server siempre renderiza el placeholder.
  const [cachedRole, setCachedRole] = useState<UserRole | null>(null)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CACHED_ROLE_KEY) as UserRole | null
      if (stored && VALID_ROLES.includes(stored)) setCachedRole(stored)
    } catch { /* storage bloqueado */ }
  }, [])

  // Auth resuelto = no cargando Y (sin sesión | profile presente). Un usuario CON
  // sesión pero con profile aún en null (fetch en vuelo / reintentando) NO se trata
  // como 'member': de lo contrario el owner es expulsado de las rutas owner-only
  // durante el arranque y se dispara el loop de redirect (móvil/red lenta).
  const authResolved = !loading && (!user || profile !== null)

  useEffect(() => {
    if (!authResolved) return
    if (!canAccessRoute(pathname, role)) {
      // Mandar a una ruta que ESTE rol sí pueda ver y que no redirija. Antes esto
      // era router.replace('/'), pero '/' reenvía a '/chat' (owner-only) y para un
      // no-owner eso era un loop infinito (el parpadeo). landingRouteFor rompe el ciclo.
      const landing = landingRouteFor(role)
      if (pathname !== landing) router.replace(landing)
    } else {
      checkedRef.current = true
      // Solo cachear el rol de una sesión REAL (user presente). Sin esto, la
      // ventana logged-out (user null → role default 'member') contaminaba el
      // cache y degradaba el render optimista del owner.
      if (user && role) {
        try { localStorage.setItem(CACHED_ROLE_KEY, role) } catch { /* storage bloqueado */ }
      }
    }
  }, [pathname, role, user, authResolved, router])

  // Antes del primer check exitoso, mostrar un contenedor estable (no `null`, que
  // colapsa el main y produce el flash blanco→contenido). El bg del shell se ve.
  // Excepción: con rol cacheado que da acceso, pintamos el contenido de inmediato.
  if (!checkedRef.current) {
    const optimistic = !authResolved && cachedRole !== null && canAccessRoute(pathname, cachedRole)
    if (!authResolved && !optimistic) return <div className="h-full" aria-hidden />
    if (authResolved && !canAccessRoute(pathname, role)) return <div className="h-full" aria-hidden />
  }

  return <>{children}</>
}
