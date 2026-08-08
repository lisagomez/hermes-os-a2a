// Puente server-side al waterfall de enriquecimiento (businessos/enriquecimiento-a2a),
// que vive en hermes-net y NO es alcanzable desde Vercel: se entra por
// `enriquecimiento-gate` con token Bearer. El token es server-only — jamás toca
// el navegador, igual que GRAFO_TOKEN.
//
// Dos cosas que este proxy hace y conviene decir en voz alta:
//
// 1) El servicio exige que el lead EXISTA en public.leads (su ledger cuelga de
//    ahí). Un caso de Pre-Discovery no nace siendo un lead del CRM, así que
//    aquí se asegura la fila con origen 'copilot' — el origen que el CHECK ya
//    contempla — sin pisar la etapa si alguien la movió (ignore-duplicates).
// 2) Sin ENRIQUECIMIENTO_URL responde 503 y el bloque se declara NO disponible.
//    No hay mock: inventar datos de contacto de una empresa real sería
//    exactamente el fallo que este servicio existe para evitar.

import { NextResponse } from 'next/server'
import { z } from 'zod'

const Cuerpo = z.object({
  leadId: z.string().min(1).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/, 'lead_id inválido'),
  empresa: z.string().max(200).optional(),
  contacto: z.string().max(200).optional(),
  telefono: z.string().max(60).optional(),
  rfc: z.string().max(13).optional(),
  campos: z.array(z.enum(['email', 'telefono', 'razon_social'])).min(1).max(3).default(['email', 'telefono']),
})

const TIMEOUT_MS = 60_000

function supabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
}

/** Asegura la fila en public.leads. `resolution=ignore-duplicates` para no pisar
 *  la etapa del funnel si el lead ya vive en el CRM (un escritor por origen). */
async function asegurarLead(leadId: string, empresa: string, contacto: string, telefono: string): Promise<string | null> {
  const url = supabaseUrl()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return 'Supabase no configurado en este entorno: el enriquecimiento necesita el lead registrado.'
  const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/leads?on_conflict=lead_id`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify({
      lead_id: leadId,
      origen: 'copilot',
      empresa,
      contacto,
      telefono,
      etapa: 'nuevo',
      mensaje: 'Alta automática desde un caso de Pre-Discovery (Meeting Copilot).',
    }),
  })
  if (!r.ok && r.status !== 409) {
    const detalle = await r.text().catch(() => '')
    return `no se pudo registrar el lead (${r.status}): ${detalle.slice(0, 160)}`
  }
  return null
}

export async function POST(req: Request) {
  const base = process.env.ENRIQUECIMIENTO_URL
  const token = process.env.ENRIQUECIMIENTO_TOKEN
  if (!base) {
    return NextResponse.json(
      { error: 'ENRIQUECIMIENTO_URL no está configurada en este entorno: el enriquecimiento no está disponible (no hay modo demo: inventar datos de contacto de una empresa real es justo lo que este servicio evita).' },
      { status: 503 }
    )
  }

  const json = await req.json().catch(() => null)
  const parsed = Cuerpo.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Cuerpo inválido para /api/pre-discovery/enriquecer.' }, { status: 400 })
  }
  const { leadId, empresa = '', contacto = '', telefono = '', rfc, campos } = parsed.data

  const fallo = await asegurarLead(leadId, empresa, contacto, telefono)
  if (fallo) return NextResponse.json({ error: fallo }, { status: 502 })

  const peticion: Record<string, unknown> = { lead_id: leadId, campos }
  if (empresa) peticion.empresa = empresa
  if (contacto) peticion.contacto = contacto
  if (rfc) peticion.rfc = rfc

  const controlador = new AbortController()
  const timeout = setTimeout(() => controlador.abort(), TIMEOUT_MS)
  const encabezados: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) encabezados.Authorization = `Bearer ${token}`

  try {
    const respuesta = await fetch(`${base.replace(/\/$/, '')}/rpc`, {
      method: 'POST',
      signal: controlador.signal,
      headers: encabezados,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: leadId,
        method: 'SendMessage',
        // parts[0].data lleva la petición DIRECTA (gotcha del wire A2A v1).
        params: { message: { messageId: `pd-${leadId}-${Date.now()}`, role: 'ROLE_USER', parts: [{ data: peticion }] } },
      }),
    })
    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => '')
      return NextResponse.json({ error: `el enriquecimiento respondió ${respuesta.status}: ${detalle.slice(0, 200)}` }, { status: 502 })
    }
    const cuerpo = (await respuesta.json()) as {
      error?: { message?: string }
      result?: { task?: TareaA2A } & TareaA2A
    }
    if (cuerpo.error) {
      return NextResponse.json({ error: `JSON-RPC: ${cuerpo.error.message ?? 'error sin mensaje'}` }, { status: 502 })
    }
    const tarea = cuerpo.result?.task ?? cuerpo.result
    const estado = tarea?.status?.state
    if (estado !== 'TASK_STATE_COMPLETED') {
      const razon = (tarea?.status?.message?.parts ?? []).map((p) => p.text).filter(Boolean).join(' ')
      // Fallo del servicio = fallo declarado, nunca un éxito a medias.
      return NextResponse.json({ error: razon || `la tarea terminó en ${estado ?? 'estado desconocido'}` }, { status: 502 })
    }
    const datos = (tarea?.artifacts ?? []).flatMap((a) => (a.parts ?? []).map((p) => p.data)).find(Boolean)
    if (!datos) return NextResponse.json({ error: 'el enriquecimiento no devolvió artefacto.' }, { status: 502 })
    return NextResponse.json({ datos })
  } catch (e) {
    const mensaje = e instanceof Error && e.name === 'AbortError' ? `Timeout (${TIMEOUT_MS / 1000} s) llamando al enriquecimiento.` : String(e)
    console.warn(`[pre-discovery/enriquecer] ${mensaje}`)
    return NextResponse.json({ error: mensaje }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}

interface TareaA2A {
  status?: { state?: string; message?: { parts?: { text?: string }[] } }
  artifacts?: { parts?: { data?: unknown }[] }[]
}
