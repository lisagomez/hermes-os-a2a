import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/shared/lib/supabase/server'
import { isAllowed } from '@/shared/lib/auth/allowlist'
import { authConfigurada } from '@/shared/lib/auth/acceso'

const bodySchema = z.object({ email: z.string().email() })

/**
 * Envía el magic link SOLO a correos de la allowlist. El gate vive en el
 * servidor (no en el cliente) para no exponer la lista del equipo ni permitir
 * email-bombing de direcciones arbitrarias. Respuesta SIEMPRE genérica: no
 * revela si un correo está o no autorizado (sin oráculo de enumeración).
 */
export async function POST(request: Request) {
  const generico = NextResponse.json({
    ok: true,
    message: 'Si tu correo está autorizado, recibirás un enlace de acceso.',
  })

  if (!authConfigurada()) return generico

  let email: string
  try {
    const json = await request.json()
    email = bodySchema.parse(json).email.trim().toLowerCase()
  } catch {
    return generico // no filtramos el motivo
  }

  if (!isAllowed(email)) return generico

  const origin = new URL(request.url).origin
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? origin}/auth/callback`,
      shouldCreateUser: true,
    },
  })
  // La respuesta sigue genérica (sin oráculo de enumeración), pero el fallo
  // JAMÁS es invisible (regla 2026-07-13): el rate-limit de Supabase
  // (2 correos/hora sin SMTP propio) o una config rota se ven en los logs.
  if (error) console.error(`[auth/otp] signInWithOtp falló: ${error.status ?? '?'} ${error.message}`)

  return generico
}
