import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAllowed } from '@/lib/auth/allowlist'

/**
 * Aterrizaje del magic link (flujo PKCE): intercambia ?code= por sesión.
 * Verifica la allowlist también aquí (defensa en profundidad, además del
 * middleware) y cierra sesión si el correo no está autorizado.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (!isAllowed(data.user?.email)) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?denied=1`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
