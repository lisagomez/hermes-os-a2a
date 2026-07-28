'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getDataSource } from '@/features/dashboard/services'
import { DECISIONES_CONTRATO } from '@/features/dashboard/types'
import { createClient } from '@/lib/supabase/server'

/**
 * Decisión humana sobre un contrato SC en revisión (Fase 12 F5). Quién decide
 * NO viaja en el form: se toma de la sesión autenticada del panel (allowlist
 * fail-closed del middleware) — el navegador jamás dicta el `aprobado_por`.
 * Rechazar exige motivo (queda en contratos_sc.motivo_rechazo, parte del
 * expediente). El guard de transición (solo desde en_revision) vive en el
 * WHERE del PATCH de la fuente real.
 */
const schema = z.object({
  id: z.string().min(1),
  decision: z.enum(DECISIONES_CONTRATO),
  motivo: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
})

export async function decidirContrato(formData: FormData): Promise<void> {
  const { id, decision, motivo } = schema.parse({
    id: formData.get('id'),
    decision: formData.get('decision'),
    motivo: formData.get('motivo') ?? undefined,
  })
  if (decision === 'rechazado' && !motivo) {
    throw new Error('rechazar exige motivo: el expediente no acepta rechazos mudos')
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    throw new Error('sin sesión autenticada: la decisión es exclusivamente humana')
  }
  await getDataSource().decidirContratoSc(id, decision, user.email, motivo)
  revalidatePath('/contratos')
}
