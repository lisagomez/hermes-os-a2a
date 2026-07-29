/**
 * Host canónico en producción, extraído como función PURA (sin Next) para
 * testearla con vitest — patrón acceso.ts.
 *
 * Por qué existe (incidente 2026-07-29): las URLs por-deployment de Vercel
 * (meeting-copilot-<hash>-….vercel.app) sirven la MISMA app de producción,
 * pero las cookies son por-host. Quien solicita el magic link desde una de
 * ellas fija la cookie PKCE `code-verifier` en ese host, y el enlace del
 * correo aterriza en NEXT_PUBLIC_SITE_URL (el dominio canónico) → el
 * intercambio del código falla y el login muere con "el enlace expiró"
 * aunque el token verificó bien. Redirigir TODO tráfico de producción al
 * host canónico elimina la clase completa del bug.
 *
 * Solo aplica con VERCEL_ENV=production: los previews (VERCEL_ENV=preview)
 * y el dev local (sin VERCEL_ENV) se sirven tal cual.
 */
export function destinoCanonico(params: {
  /** Host que pidió el cliente (x-forwarded-host ?? host). */
  host: string | null | undefined
  pathname: string
  /** Query string con el '?' incluido, o ''. */
  search: string
  siteUrl: string | undefined
  vercelEnv: string | undefined
}): string | null {
  const { host, pathname, search, siteUrl, vercelEnv } = params
  if (vercelEnv !== 'production') return null
  if (!siteUrl || !host) return null

  let canonico: URL
  try {
    canonico = new URL(siteUrl)
  } catch {
    return null
  }

  if (host.toLowerCase() === canonico.host.toLowerCase()) return null
  return `${canonico.origin}${pathname}${search}`
}
