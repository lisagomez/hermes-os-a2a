import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/shared/lib/supabase/middleware'
import { isAllowed } from '@/shared/lib/auth/allowlist'
import {
  authConfigurada,
  authDeshabilitada,
  decidirAcceso,
  esRutaPublica,
} from '@/shared/lib/auth/acceso'

/**
 * Puerta de entrada del copiloto. TODA ruta (páginas Y /api/*, salvo las
 * públicas de login/auth) exige un usuario autenticado Y en la allowlist del
 * equipo — patrón Mission Control (doctrina 2026-07-24). Sin esto, la app en
 * Vercel expone públicamente las rutas /api/asesor/* que gastan OpenRouter.
 *
 * AUTH_DISABLED=1 es el escape explícito para el dev local mock-first
 * (sin Supabase); nunca se fija en producción.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Sin config o deshabilitada, no se puede/debe crear el cliente Supabase.
  const conConfig = authConfigurada()
  const sinSesion = !conConfig || authDeshabilitada() || esRutaPublica(pathname)
  const { supabaseResponse, user } = sinSesion
    ? { supabaseResponse: NextResponse.next({ request }), user: null }
    : await updateSession(request)

  const decision = decidirAcceso({
    pathname,
    authDeshabilitada: authDeshabilitada(),
    authConfigurada: conConfig,
    email: user?.email,
    permitido: isAllowed(user?.email),
  })

  if (decision.tipo === 'pasar') return supabaseResponse

  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.search = ''
  if (decision.tipo === 'login' && decision.next) url.searchParams.set('next', decision.next)
  if (decision.tipo === 'denegado') url.searchParams.set('denied', '1')
  if (decision.tipo === 'sin-config') url.searchParams.set('error', 'config')
  return NextResponse.redirect(url)
}

export const config = {
  // Corre en todo menos assets estáticos.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)',
  ],
}
