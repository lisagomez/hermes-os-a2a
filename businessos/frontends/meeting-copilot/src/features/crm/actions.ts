'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { authDeshabilitada } from '@/shared/lib/auth/acceso'
import { createClient } from '@/shared/lib/supabase/server'
import { moverLeadEtapaDb } from './data'
import { etapaMovibleSchema } from './types'

/**
 * Única acción de escritura de etapa del workspace CRM: mover un lead.
 * Va por la RPC auditada (mover_lead_etapa) con actor 'humano:<email de la
 * sesión>' — cada movimiento del tablero (drag & drop) o de la tabla
 * (select+Mover) queda en leads_movimientos y es visible en Actividad.
 *
 * Cinturón extra al middleware (que ya protege /crm fail-closed): la action
 * exige un usuario autenticado salvo AUTH_DISABLED=1 (dev/smoke — entorno
 * que además no tiene service_role, así que la escritura ahí es imposible).
 */
const schema = z.object({
  lead_id: z.string().min(1),
  etapa: etapaMovibleSchema,
  motivo: z.string().max(300).optional(),
})

export async function moverLeadEtapa(formData: FormData): Promise<void> {
  let actor = 'humano:equipo'
  if (!authDeshabilitada()) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    actor = `humano:${user.email ?? user.id}`
  }
  const { lead_id, etapa, motivo } = schema.parse({
    lead_id: formData.get('lead_id'),
    etapa: formData.get('etapa'),
    motivo: formData.get('motivo') ?? undefined,
  })
  await moverLeadEtapaDb(lead_id, etapa, actor, motivo ?? '')
  revalidatePath('/crm')
}
