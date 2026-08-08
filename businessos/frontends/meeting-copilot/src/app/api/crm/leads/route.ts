// Alta de leads origen 'copilot' desde Pre-Discovery (fix de la fuga
// 2026-08-08). Ruta INTERNA: NO está en RUTAS_PUBLICAS → el middleware
// fail-closed la protege; el getUser() de abajo es el cinturón (patrón
// api/calendar/events). Upsert ignore-duplicates: reintentos no duplican
// ni pisan un lead que el equipo ya avanzó de etapa.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authDeshabilitada } from '@/shared/lib/auth/acceso'
import { createClient } from '@/shared/lib/supabase/server'
import { crmDisponible, crearLeadDb } from '@/features/crm/data'
import { filaLeadPrediscovery } from '@/features/crm/lead-prediscovery'

const altaSchema = z.object({
  empresa: z.string().min(1).max(200),
  contacto: z.string().min(1).max(200),
  giro: z.string().max(200).optional(),
  web: z.string().max(400).optional(),
  linkedin: z.string().max(400).optional(),
  pais: z.string().max(100).optional(),
  telefono: z.string().max(60).optional(),
  email: z.string().max(200).optional(),
  casoId: z.string().max(100).optional(),
})

export async function POST(req: Request) {
  if (!authDeshabilitada()) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  if (!crmDisponible()) {
    // Dev mock-first sin Supabase: se declara, no se finge éxito.
    return NextResponse.json({ error: 'Supabase no configurado (CRM)' }, { status: 503 })
  }
  const parse = altaSchema.safeParse(await req.json().catch(() => null))
  if (!parse.success) {
    return NextResponse.json({ error: 'Entrada inválida' }, { status: 400 })
  }
  const fila = filaLeadPrediscovery(parse.data)
  try {
    await crearLeadDb(fila)
  } catch (err) {
    console.error('[crm/leads] alta NO guardada:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'No se pudo guardar el lead' }, { status: 502 })
  }
  return NextResponse.json({ ok: true, leadId: fila.lead_id }, { status: 201 })
}
