/**
 * Decisión de acceso del middleware, extraída como función PURA (sin Next, sin
 * Supabase) para poder testearla con vitest sin navegador — patrón registrar-sw.
 *
 * Orden de evaluación (fail-closed):
 *  1. Ruta pública → pasa (login y endpoints de auth).
 *  2. AUTH_DISABLED=1 → pasa (escape EXPLÍCITO para dev local mock-first;
 *     jamás se fija en producción).
 *  3. Sin Supabase configurado → 'sin-config' (nadie entra; la página de login
 *     lo explica en vez de tronar).
 *  4. Sin usuario → 'login' (con `next` para volver tras autenticarse).
 *  5. Usuario fuera de la allowlist → 'denegado'.
 *  6. → pasa.
 */
export const RUTAS_PUBLICAS = ['/login', '/auth/callback', '/auth/otp', '/auth/signout']

export type DecisionAcceso =
  | { tipo: 'pasar' }
  | { tipo: 'sin-config' }
  | { tipo: 'login'; next?: string }
  | { tipo: 'denegado' }

export function esRutaPublica(pathname: string): boolean {
  return RUTAS_PUBLICAS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export function decidirAcceso(params: {
  pathname: string
  authDeshabilitada: boolean
  authConfigurada: boolean
  email: string | null | undefined
  permitido: boolean
}): DecisionAcceso {
  const { pathname, authDeshabilitada, authConfigurada, email, permitido } = params

  if (esRutaPublica(pathname)) return { tipo: 'pasar' }
  if (authDeshabilitada) return { tipo: 'pasar' }
  if (!authConfigurada) return { tipo: 'sin-config' }
  if (!email) return { tipo: 'login', next: pathname === '/' ? undefined : pathname }
  if (!permitido) return { tipo: 'denegado' }
  return { tipo: 'pasar' }
}

export function authDeshabilitada(): boolean {
  return process.env.AUTH_DISABLED === '1'
}

export function authConfigurada(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
