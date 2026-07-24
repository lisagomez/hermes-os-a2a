import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { isAllowed } from '@/lib/auth/allowlist'

/**
 * Puerta de entrada del panel. TODA ruta (salvo las públicas de login/auth)
 * exige un usuario autenticado Y en la allowlist del equipo. Sin esto, el
 * panel —que expone datos de negocio con service_role— sería público en Vercel.
 */
const PUBLIC_PATHS = ['/login', '/auth/callback', '/auth/otp', '/auth/signout']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabaseResponse, user } = await updateSession(request)

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
  if (isPublic) return supabaseResponse

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    if (pathname !== '/') url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (!isAllowed(user.email)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('denied', '1')
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  // Corre en todo menos assets estáticos y del PWA (manifest, sw, iconos).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|apple-touch-icon|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)',
  ],
}
