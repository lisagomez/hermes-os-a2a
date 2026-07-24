import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieToSet = { name: string; value: string; options: CookieOptions }

/**
 * Refresca la sesión de Supabase en el edge y devuelve el usuario.
 * Patrón oficial @supabase/ssr: la respuesta que se retorna DEBE ser la que
 * lleva las cookies actualizadas (si no, la sesión se pierde entre requests).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
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

  // getUser() (no getSession) valida el JWT contra Supabase: fuente de verdad.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}
