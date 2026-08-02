// Proxy server-side al daemon BUZÓN A2A (:4900, aún no desplegado — SPEC-buzon-a2a
// §6.1). BUZON_A2A_URL es opcional: sin ella → 503 y la UI opera 100% con el
// store mock. Patrón EXACTO de /api/grafo/evaluaciones: env-gate, AbortController
// con timeout 6s, 502 en fallo del daemon o de red.

import { NextResponse } from 'next/server'

export async function GET() {
  const buzonUrl = process.env.BUZON_A2A_URL
  if (!buzonUrl) {
    return NextResponse.json(
      { error: 'BUZON_A2A_URL no está configurada en este entorno: la UI opera con el store mock del buzón.' },
      { status: 503 }
    )
  }

  const controlador = new AbortController()
  const timeout = setTimeout(() => controlador.abort(), 6000)
  try {
    const respuesta = await fetch(`${buzonUrl.replace(/\/$/, '')}/health`, {
      method: 'GET',
      signal: controlador.signal,
    })
    if (!respuesta.ok) {
      return NextResponse.json({ error: `El daemon del buzón respondió ${respuesta.status}.` }, { status: 502 })
    }
    const data = (await respuesta.json().catch(() => ({}))) as unknown
    return NextResponse.json({ ...(typeof data === 'object' && data ? data : {}), conexion: 'buzon-a2a' })
  } catch (e) {
    const mensaje = e instanceof Error && e.name === 'AbortError' ? 'Timeout (6 s) consultando el daemon del buzón.' : String(e)
    return NextResponse.json({ error: mensaje }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}
