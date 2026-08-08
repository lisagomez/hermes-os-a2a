// POST /api/reservar — seam server-side de la reserva PÚBLICA (SPEC §19).
// Esta ruta está FUERA del gate de auth (RUTAS_PUBLICAS): valida su propio
// payload con límites duros y, sin Supabase conectado, responde 503 con
// explicación (la reserva del MVP vive en el navegador, mock-first).
//
// Diseño de rate-limit para la fase real (documentado, NO simulado en mock —
// fingir un límite en el cliente sería seguridad-teatro):
//   - 5 solicitudes/día por email y por IP (contadores en agenda_citas +
//     agenda_enlaces_reserva; ventana deslizante de 24 h).
//   - Al rebasar: 429 con mensaje genérico (sin oráculo de enumeración) y
//     registro para análisis.
//   - El token de EnlaceReserva pasa a ser firmado (HMAC + expiración) y se
//     valida aquí ANTES de tocar la BD.

import { NextResponse } from 'next/server'
import { LIMITE_PAYLOAD_BYTES, esquemaSolicitudReserva } from '@/features/agenda/contratos'
import { filaLeadCopilot } from '@/features/agenda/lead-copilot'

export async function POST(request: Request) {
  const crudo = await request.text()
  if (crudo.length > LIMITE_PAYLOAD_BYTES) {
    return NextResponse.json({ error: `Payload demasiado grande (máx ${LIMITE_PAYLOAD_BYTES} bytes).` }, { status: 413 })
  }

  let json: unknown
  try {
    json = JSON.parse(crudo)
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const parse = esquemaSolicitudReserva.safeParse(json)
  if (!parse.success) {
    return NextResponse.json({ error: 'Solicitud inválida.', detalles: parse.error.issues.map((i) => i.message) }, { status: 400 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        error:
          'La reserva server-side requiere la integración Supabase (post-MVP). ' +
          'En el MVP mock-first la reserva se registra en el navegador y este endpoint solo valida el contrato.',
      },
      { status: 503 }
    )
  }

  // Escritor ÚNICO del origen `copilot` (RUNBOOK P6): la cita solicitada entra
  // al embudo como lead AHORA, aunque agenda_citas siga en fase mock. Upsert por
  // clave natural (email): reintento o re-reserva = la misma fila; el flooding
  // por email queda acotado a una fila por dirección (idempotencia como freno).
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const fila = filaLeadCopilot(parse.data)
  try {
    const r = await fetch(`${url}/rest/v1/leads?on_conflict=lead_id`, {
      method: 'POST',
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        // Upsert: el conflicto es éxito (misma persona, fila actualizada).
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(fila),
      signal: AbortSignal.timeout(8_000),
    })
    if (!r.ok) {
      console.error('[reservar] lead copilot NO guardado: HTTP', r.status, (await r.text()).slice(0, 200))
      return NextResponse.json({ error: 'No se pudo registrar la solicitud.' }, { status: 502 })
    }
  } catch (err) {
    console.error('[reservar] lead copilot NO guardado:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'No se pudo registrar la solicitud.' }, { status: 502 })
  }

  // Fase Supabase pendiente para agenda_citas (token firmado + rate-limit +
  // exclusion constraint anti doble-reserva); la cita del MVP vive en el
  // navegador y esta respuesta lo DICE — nunca finge una cita persistida.
  return NextResponse.json({ ok: true, lead_id: fila.lead_id, cita_persistida: false })
}
