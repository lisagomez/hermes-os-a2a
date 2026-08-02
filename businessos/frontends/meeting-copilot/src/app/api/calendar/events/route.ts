// Lectura del mirror `calendar_events` que ya define control-interno ("un
// mirror, una pluma": ver businessos/frontends/control-interno/docs/CALENDAR-AND-CRONS.md).
// Esta ruta NO escribe ni maneja OAuth propio — solo lee lo que el pipeline
// gog/control-interno ya sincronizó a Supabase. Si esa tabla está vacía es
// porque el pipeline (gog auth + GOOGLE_CALENDAR_ACCOUNT) no está activo
// todavía, no un error de esta app.
import { NextResponse } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('calendar_events')
    .select(
      'id, title, start_at, end_at, all_day, location, calendar_name, account_email, hangout_link, status, synced_at'
    )
    .is('deleted_at', null)
    .neq('status', 'cancelled')
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(20)

  if (error) {
    console.error('[calendar/events] query falló:', error.message)
    return NextResponse.json({ error: 'No se pudo consultar el calendario' }, { status: 500 })
  }

  const eventos = data ?? []
  const ultimaSincronizacion = eventos.reduce<string | null>(
    (max, e) => (e.synced_at && (!max || e.synced_at > max) ? e.synced_at : max),
    null
  )

  return NextResponse.json({ eventos, total: eventos.length, ultimaSincronizacion })
}
