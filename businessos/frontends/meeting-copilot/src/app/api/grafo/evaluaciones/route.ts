// Proxy server-side al GRAFO REGULATORIO (contrato POST /evaluaciones de
// businessos/grafo). GRAFO_URL es opcional: sin ella → 503 y el cliente usa el
// mock fiel. Validación al estilo grafo-a2a: una respuesta sin disclaimer o sin
// fuentes citadas NO es un dictamen del grafo y se rechaza.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validarRespuestaGrafo } from '@/features/pre-discovery/grafo'

const Cuerpo = z.object({
  contexto: z.object({
    jurisdiccion: z.string().default('MX'),
    dimension: z.enum(['fiscal', 'contable', 'contractual', 'regulatorio']),
    regimen: z.string(),
    fecha: z.string().nullable().default(null),
  }),
  conceptos: z.array(z.object({ descripcion: z.string().min(1), importe: z.number().min(0).nullable().default(null) })).min(1).max(10),
})

export async function POST(req: Request) {
  const grafoUrl = process.env.GRAFO_URL
  if (!grafoUrl) {
    return NextResponse.json(
      { error: 'GRAFO_URL no está configurada en este entorno: se usará el mock fiel del grafo (mismas reglas de fail-safe y citas).' },
      { status: 503 }
    )
  }

  const json = await req.json().catch(() => null)
  const parsed = Cuerpo.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: 'Cuerpo inválido para /api/grafo/evaluaciones.' }, { status: 400 })

  const controlador = new AbortController()
  const timeout = setTimeout(() => controlador.abort(), 6000)
  // El puente público (grafo-gate) exige token Bearer; server-side only — el
  // token jamás toca el navegador. Sin GRAFO_TOKEN se habla sin header (grafo
  // directo en despliegues dentro de hermes-net).
  const encabezados: Record<string, string> = { 'Content-Type': 'application/json' }
  if (process.env.GRAFO_TOKEN) encabezados.Authorization = `Bearer ${process.env.GRAFO_TOKEN}`
  try {
    const respuesta = await fetch(`${grafoUrl.replace(/\/$/, '')}/evaluaciones`, {
      method: 'POST',
      signal: controlador.signal,
      headers: encabezados,
      body: JSON.stringify(parsed.data),
    })
    if (!respuesta.ok) {
      return NextResponse.json({ error: `El grafo respondió ${respuesta.status}.` }, { status: 502 })
    }
    const data = (await respuesta.json()) as unknown
    if (!validarRespuestaGrafo(data)) {
      // Regla de oro: sin disclaimer o sin fuentes, esto NO es un dictamen del grafo.
      return NextResponse.json({ error: 'La respuesta del grafo no cumple el contrato (disclaimer/fuentes) — se rechaza.' }, { status: 502 })
    }
    return NextResponse.json({ ...data, conexion: 'grafo' })
  } catch (e) {
    const mensaje = e instanceof Error && e.name === 'AbortError' ? 'Timeout (6 s) consultando el grafo.' : String(e)
    return NextResponse.json({ error: mensaje }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}
