'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getDataSource } from '@/features/dashboard/services'
import { ETAPAS_MOVIBLES } from '@/features/dashboard/types'

/**
 * Única acción de escritura del dashboard: mover un lead de etapa desde /crm.
 * Entrada validada con Zod (regla del proyecto); el check constraint de la BD
 * es el backstop. Tras mover, se revalida /crm para que el embudo y la tabla
 * reflejen la nueva etapa en la misma respuesta.
 */
const schema = z.object({
  lead_id: z.string().min(1),
  etapa: z.enum(ETAPAS_MOVIBLES),
})

export async function moverLeadEtapa(formData: FormData): Promise<void> {
  const { lead_id, etapa } = schema.parse({
    lead_id: formData.get('lead_id'),
    etapa: formData.get('etapa'),
  })
  await getDataSource().moverLeadEtapa(lead_id, etapa)
  revalidatePath('/crm')
}
