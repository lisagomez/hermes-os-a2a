'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { authDeshabilitada } from '@/shared/lib/auth/acceso'
import { createClient } from '@/shared/lib/supabase/server'
import { moverLeadEtapaDb } from './data'
import { etapaMovibleSchema } from './types'

/**
 * Única acción de escritura del workspace CRM: mover un lead de etapa.
 * Entrada validada con Zod; el check constraint de la BD es el backstop.
 * Tras mover, se revalida /crm para que el embudo y la tabla reflejen la
 * nueva etapa en la misma respuesta.
 *
 * Cinturón extra al middleware (que ya protege /crm fail-closed): la action
 * exige un usuario autenticado salvo AUTH_DISABLED=1 (dev/smoke — entorno
 * que además no tiene service_role, así que la escritura ahí es imposible).
 */
const schema = z.object({
  lead_id: z.string().min(1),
  etapa: etapaMovibleSchema,
})

export async function moverLeadEtapa(formData: FormData): Promise<void> {
  if (!authDeshabilitada()) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
  }
  const { lead_id, etapa } = schema.parse({
    lead_id: formData.get('lead_id'),
    etapa: formData.get('etapa'),
  })
  await moverLeadEtapaDb(lead_id, etapa)
  revalidatePath('/crm')
}
