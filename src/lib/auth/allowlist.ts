/**
 * Allowlist de correos del equipo. FAIL-CLOSED por diseño: si
 * PANEL_ALLOWED_EMAILS no está definida o está vacía, NADIE entra.
 *
 * El panel renderiza datos de negocio con SUPABASE_SERVICE_ROLE_KEY: la
 * allowlist es el candado que hace seguro exponerlo en una URL pública.
 * Config en Vercel: PANEL_ALLOWED_EMAILS="a@x.com,b@y.com" (coma-separado).
 */
export function allowedEmails(): string[] {
  return (process.env.PANEL_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAllowed(email?: string | null): boolean {
  if (!email) return false
  const list = allowedEmails()
  if (list.length === 0) return false // fail-closed: sin allowlist, nadie pasa
  return list.includes(email.toLowerCase())
}
