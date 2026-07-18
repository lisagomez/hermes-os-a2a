/**
 * URL base del sitio, saneada.
 *
 * NEXT_PUBLIC_SITE_URL en Vercel llego a tener un newline literal al final:
 * el JSON de los endpoints draw3 devolvia `"url": "https://...\n/draw3/..."`
 * y rompia a cualquier consumidor (jq, agentes). Trim + validacion de scheme
 * con fallback al host local.
 */
export function siteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim()
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw.replace(/\/+$/, '')
  }
  return 'http://localhost:3000'
}
