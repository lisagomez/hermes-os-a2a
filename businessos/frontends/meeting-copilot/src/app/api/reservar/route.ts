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

  // Fase Supabase: validar token firmado + rate-limit → INSERT en agenda_citas
  // (estado 'solicitada'; el exclusion constraint es la garantía anti doble-reserva).
  return NextResponse.json({ error: 'Escritura a agenda_citas pendiente de la fase Supabase.' }, { status: 501 })
}
