import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isEmailAllowed } from '@/lib/auth-config'
import { isDesktopAuthBypassRequest } from '@/lib/desktop-auth'

// NEXT_PUBLIC_* values are inlined at build time by Next when read as a full,
// static process.env.<NAME> expression (never process.env[name]).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function updateSession(request: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — copy .env.example to .env.local and fill it')
  }

  let supabaseResponse = NextResponse.next({ request })

  // Desktop bypass PRIMERO: la app Tauri (127.0.0.1:3218) no tiene sesión de
  // Supabase — llamar getUser() antes de este check era un round-trip/overhead
  // potencial en CADA request del desktop. Mismo patrón que draw3-auth.ts.
  if (isDesktopAuthBypassRequest(request)) {
    const isDesktopAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/signup')
    if (isDesktopAuthRoute) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return supabaseResponse
  }

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // API routes for webhooks bypass auth (they use bearer tokens)
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
                      request.nextUrl.pathname.startsWith('/signup')
  const isPublicRoute = isAuthRoute ||
                        request.nextUrl.pathname.startsWith('/check-email') ||
                        request.nextUrl.pathname.startsWith('/forgot-password') ||
                        request.nextUrl.pathname.startsWith('/update-password')

  // API routes: bearer-only endpoints pass through (no session cookie).
  // But if a session exists with a non-whitelisted email, block it.
  if (isApiRoute) {
    if (user && !isEmailAllowed(user.email ?? '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return supabaseResponse
  }

  // Not authenticated → login (preserve return URL)
  if (!isPublicRoute && !user) {
    const loginUrl = new URL('/login', request.url)
    const returnTo = request.nextUrl.pathname
    if (returnTo && returnTo !== '/') {
      loginUrl.searchParams.set('next', returnTo)
    }
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated but email not whitelisted → sign out and block
  if (user && !isEmailAllowed(user.email ?? '')) {
    await supabase.auth.signOut()
    const url = new URL('/login', request.url)
    url.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(url)
  }

  // Already authenticated → redirect away from auth pages
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}
