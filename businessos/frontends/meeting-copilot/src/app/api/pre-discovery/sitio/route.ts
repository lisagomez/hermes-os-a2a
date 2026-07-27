// Fetch del sitio del lead (capa SEPARADA del análisis: sin LLM aquí).
// Errores siempre claros y visibles — la web inválida es un estado del producto.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { extraerEnlacesRelevantes, htmlATexto } from '@/features/pre-discovery/html'

const Cuerpo = z.object({ url: z.string().min(4) })
const MAX_BYTES = 500_000

function normalizarUrl(url: string): string | null {
  const conEsquema = /^https?:\/\//i.test(url) ? url : `https://${url}`
  try {
    const u = new URL(conEsquema)
    if (!['http:', 'https:'].includes(u.protocol)) return null
    return u.toString()
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = Cuerpo.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: 'Cuerpo inválido: se requiere {url}.' }, { status: 400 })

  const url = normalizarUrl(parsed.data.url)
  if (!url) return NextResponse.json({ error: `URL inválida: "${parsed.data.url}".` }, { status: 400 })

  const controlador = new AbortController()
  const timeout = setTimeout(() => controlador.abort(), 8000)
  try {
    const respuesta = await fetch(url, {
      signal: controlador.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'MeetingCopilot-PreDiscovery/1.0 (+analisis previo a entrevista)' },
    })
    if (!respuesta.ok) {
      return NextResponse.json({ error: `El sitio respondió ${respuesta.status}. Verifica la URL o continúa el análisis sin sitio.` }, { status: 502 })
    }
    const tipo = respuesta.headers.get('content-type') ?? ''
    if (!tipo.includes('text/html') && !tipo.includes('text/plain')) {
      return NextResponse.json({ error: `El contenido no es HTML (${tipo}).` }, { status: 502 })
    }
    const lector = respuesta.body?.getReader()
    let html = ''
    if (lector) {
      const decodificador = new TextDecoder()
      let bytes = 0
      for (;;) {
        const { done, value } = await lector.read()
        if (done) break
        bytes += value.byteLength
        html += decodificador.decode(value, { stream: true })
        if (bytes >= MAX_BYTES) {
          void lector.cancel()
          break
        }
      }
    } else {
      html = (await respuesta.text()).slice(0, MAX_BYTES)
    }
    const resultado = htmlATexto(html)
    if (resultado.texto.length < 100) {
      return NextResponse.json({ error: 'El sitio devolvió muy poco texto legible (¿SPA sin SSR?). Continúa sin sitio o pega contenido a mano.' }, { status: 502 })
    }
    return NextResponse.json({ url, ...resultado, enlacesRelevantes: extraerEnlacesRelevantes(html, url) })
  } catch (e) {
    const mensaje = e instanceof Error && e.name === 'AbortError' ? 'Timeout (8 s) al leer el sitio.' : `No se pudo leer el sitio: ${e instanceof Error ? e.message : String(e)}`
    return NextResponse.json({ error: mensaje }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}
