/** HTML → texto plano legible (sin dependencias): quita scripts/styles/tags.
 *  Puro y testeable; lo consume /api/pre-discovery/sitio. */
export function htmlATexto(html: string): { titulo: string; descripcionMeta: string; texto: string } {
  const titulo = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? ''
  const descripcionMeta =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]?.trim() ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1]?.trim() ??
    ''
  const texto = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<(br|p|div|li|h[1-6]|tr|section|article)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { titulo, descripcionMeta, texto: texto.slice(0, 20_000) }
}

/** Enlaces internos que suelen concentrar señales regulatorias (Hermes-Regulatory-Scan):
 *  /services, /compliance, /certifications, /legal, /privacy, /terms, /aviso…
 *  Solo mismo host, dedupe, máximo 5 — el pipeline decide cuántos compilar. */
export function extraerEnlacesRelevantes(html: string, baseUrl: string): string[] {
  const RELEVANTE = /(servic|solucion|solution|compliance|regulat|certif|licen|legal|privac|aviso|terms|t[ée]rminos|about|nosotros)/i
  const enlaces = new Set<string>()
  let base: URL
  try {
    base = new URL(baseUrl)
  } catch {
    return []
  }
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) {
    try {
      const u = new URL(m[1], base)
      if (u.host !== base.host || !['http:', 'https:'].includes(u.protocol)) continue
      if (!RELEVANTE.test(u.pathname)) continue
      u.hash = ''
      const limpio = u.toString()
      if (limpio !== base.toString()) enlaces.add(limpio)
    } catch {
      // href malformado: se ignora
    }
    if (enlaces.size >= 5) break
  }
  return [...enlaces]
}
