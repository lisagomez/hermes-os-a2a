import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isAllowed } from '@/lib/auth/allowlist'

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
  // El error se traga a propósito: la respuesta genérica no debe cambiar.
  await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? origin}/auth/callback`,
      shouldCreateUser: true,
    },
  })

  return generico
}
