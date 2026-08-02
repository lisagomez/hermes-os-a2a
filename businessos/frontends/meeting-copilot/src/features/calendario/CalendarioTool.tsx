'use client'

import { useEffect, useState } from 'react'
import { CalendarClock, ExternalLink, RefreshCw } from 'lucide-react'
import { Callout, Card, Chip, EmptyState, SectionHeader } from '@/shared/components/ui'
import { fmtFechaCorta, fmtHora } from '@/shared/lib/format'

interface EventoCalendario {
  id: string
  title: string
  start_at: string
  end_at: string
  all_day: boolean
  location: string | null
  calendar_name: string | null
  account_email: string | null
  hangout_link: string | null
  status: string | null
  synced_at: string | null
}

interface RespuestaEventos {
  eventos: EventoCalendario[]
  total: number
  ultimaSincronizacion: string | null
  error?: string
}

/**
 * Lee el mirror `calendar_events` que ya mantiene control-interno (patrón "un
 * mirror, una pluma" — ver docs/CALENDAR-AND-CRONS.md de esa app). Esta
 * herramienta NO tiene su propio OAuth: si la tabla está vacía es porque el
 * pipeline gog/Google Calendar no está activo todavía, no un bug de aquí.
 */
export function CalendarioTool() {
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error' | 'no-autenticado'>('cargando')
  const [datos, setDatos] = useState<RespuestaEventos | null>(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let cancelado = false

    // No reseteamos a 'cargando' de forma sincrona: en un refresco manual la
    // vista anterior se queda visible hasta que llega la respuesta (evita
    // setState sincrono en el cuerpo del efecto).
    fetch('/api/calendar/events')
      .then(async (res) => {
        if (cancelado) return
        if (res.status === 401) {
          setEstado('no-autenticado')
          return
        }
        const json = (await res.json()) as RespuestaEventos
        if (cancelado) return
        if (!res.ok) {
          setEstado('error')
          return
        }
        setDatos(json)
        setEstado('listo')
      })
      .catch(() => {
        if (!cancelado) setEstado('error')
      })

    return () => {
      cancelado = true
    }
  }, [intento])

  return (
    <div className="space-y-4">
      <SectionHeader
        titulo="Google Calendar"
        descripcion="Próximos eventos sincronizados desde Google Calendar (mirror compartido con control-interno)."
        acciones={
          <button
            type="button"
            onClick={() => setIntento((n) => n + 1)}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[13px] font-medium text-ink-secondary hover:bg-surface-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Actualizar
          </button>
        }
      />

      {estado === 'cargando' && (
        <Card className="p-4 text-[13px] text-ink-secondary">Cargando eventos…</Card>
      )}

      {estado === 'no-autenticado' && (
        <Callout tono="warning" titulo="Sesión requerida">
          Inicia sesión para ver el calendario.
        </Callout>
      )}

      {estado === 'error' && (
        <Callout tono="danger" titulo="No se pudo consultar el calendario">
          Intenta actualizar. Si persiste, revisa los logs del servidor.
        </Callout>
      )}

      {estado === 'listo' && datos && datos.eventos.length === 0 && (
        <EmptyState
          icono={CalendarClock}
          titulo="Sin eventos sincronizados"
          descripcion="La integración de Google Calendar (pipeline gog de control-interno) todavía no está activa en este entorno — no hay ningún calendario conectado, así que el mirror está vacío. Esto no es un error: activar la integración requiere `gog auth add <cuenta>` y las variables GOOGLE_CALENDAR_ACCOUNT/GOG_KEYRING_PASSWORD (ver docs/CALENDAR-AND-CRONS.md en control-interno)."
        />
      )}

      {estado === 'listo' && datos && datos.eventos.length > 0 && (
        <div className="space-y-2">
          {datos.ultimaSincronizacion && (
            <p className="text-[12px] text-ink-muted">
              Última sincronización: {fmtFechaCorta(datos.ultimaSincronizacion)} {fmtHora(datos.ultimaSincronizacion)}
            </p>
          )}
          {datos.eventos.map((ev) => (
            <Card key={ev.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{ev.title || '(sin título)'}</p>
                  <p className="mt-0.5 text-[12px] text-ink-secondary">
                    {ev.all_day
                      ? fmtFechaCorta(ev.start_at)
                      : `${fmtFechaCorta(ev.start_at)} · ${fmtHora(ev.start_at)}–${fmtHora(ev.end_at)}`}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {ev.calendar_name && <Chip>{ev.calendar_name}</Chip>}
                    {ev.account_email && <Chip tono="neutral">{ev.account_email}</Chip>}
                  </div>
                </div>
                {ev.hangout_link && (
                  <a
                    href={ev.hangout_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-accent hover:underline"
                  >
                    Meet <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
