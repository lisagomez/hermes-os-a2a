import { NextResponse } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'
import { isAllowed } from '@/shared/lib/auth/allowlist'
import { authConfigurada } from '@/shared/lib/auth/acceso'

/**
 * Aterrizaje del magic link (flujo PKCE): intercambia ?code= por sesión.
 * Verifica la allowlist también aquí (defensa en profundidad, además del
 * middleware) y cierra sesión si el correo no está autorizado.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code && authConfigurada()) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (!isAllowed(data.user?.email)) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?denied=1`)
      }
      // Solo paths internos: '//evil.com' sería un redirect protocol-relative.
      const destino = next.startsWith('/') && !next.startsWith('//') ? next : '/'
      return NextResponse.redirect(`${origin}${destino}`)
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
