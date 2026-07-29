'use client'

// M3b — Reprogramación por el cliente (/reservar/cita/[token], pública).
// En mock el token es el id de la cita (el real será firmado server-side).
// Regla: solo citas CONFIRMADAS y con ≥REPROGRAMAR_HORAS_MIN de antelación;
// el nuevo horario vuelve a solicitada (re-aprobación del asesor).

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { CalendarClock, SearchX } from 'lucide-react'
import { Callout, Card, Chip, EmptyState } from '@/shared/components/ui'
import { fmtFecha } from '@/shared/lib/format'
import { REPROGRAMAR_HORAS_MIN } from './types'
import { etiquetaTz, fmtHoraEnTz } from './slots'
import { reprogramarCita } from './pipeline'
import { useAgendaStore, useAsesor } from './store'
import { SelectorFecha } from './SelectorFecha'
import { SelectorSlots } from './SelectorSlots'

export function ReprogramarCita() {
  const params = useParams<{ token: string }>()
  const cita = useAgendaStore((s) => s.citas.find((c) => c.id === params.token) ?? null)
  const asesor = useAsesor(cita?.asesorId ?? null)

  const ahora = useMemo(() => new Date().toISOString(), [])
  const tzCliente = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
  const [fecha, setFecha] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  if (!cita || !asesor) {
    return (
      <Envoltura>
        <EmptyState
          icono={SearchX}
          titulo="Cita no encontrada"
          descripcion="El enlace de reprogramación no es válido o la cita ya no existe."
        />
      </Envoltura>
    )
  }

  const duracionMin = Math.round((new Date(cita.fin).getTime() - new Date(cita.inicio).getTime()) / 60_000)
  const margenOk = new Date(cita.inicio).getTime() - new Date(ahora).getTime() >= REPROGRAMAR_HORAS_MIN * 3_600_000

  if (exito) {
    return (
      <Envoltura>
        <Card className="space-y-3 p-5 text-center" data-testid="reprogramar-exito">
          <CalendarClock className="mx-auto h-8 w-8 text-success" />
          <h2 className="text-[15px] font-semibold text-ink">Reprogramación enviada</h2>
          <p className="text-[13px] text-ink-secondary">
            Nuevo horario: {fmtFecha(exito)} · {fmtHoraEnTz(exito, tzCliente)} ({etiquetaTz(tzCliente, exito)})
          </p>
          <Chip tono="warning">Estado: solicitada (el asesor volverá a confirmar)</Chip>
        </Card>
      </Envoltura>
    )
  }

  return (
    <Envoltura>
      <div data-testid="reprogramar-cita">
        <Card className="mb-4 space-y-1 p-4">
          <h1 className="text-[15px] font-semibold text-ink">Reprogramar tu cita</h1>
          <p className="text-[13px] text-ink-secondary">
            Con {asesor.nombre} — hoy agendada: {fmtFecha(cita.inicio)} · {fmtHoraEnTz(cita.inicio, tzCliente)} (
            {etiquetaTz(tzCliente, cita.inicio)})
          </p>
        </Card>

        {cita.estado !== 'confirmada' ? (
          <EmptyState
            icono={CalendarClock}
            titulo="Esta cita no puede reprogramarse"
            descripcion={`Solo una cita confirmada se reprograma; la tuya está en estado "${cita.estado}". Si necesitas moverla, contacta a tu asesor.`}
          />
        ) : !margenOk ? (
          <EmptyState
            icono={CalendarClock}
            titulo="Ya no hay margen para reprogramar"
            descripcion={`La reprogramación en línea requiere al menos ${REPROGRAMAR_HORAS_MIN} horas de antelación. Contacta a tu asesor para moverla.`}
          />
        ) : (
          <Card className="space-y-4 p-4">
            {error ? (
              <Callout tono="danger" variante="inline">
                <p className="text-[12px]">{error}</p>
              </Callout>
            ) : null}
            <SelectorFecha
              asesorId={asesor.id}
              zonaHorariaAsesor={asesor.zonaHoraria}
              duracionMin={duracionMin}
              ahora={ahora}
              seleccionada={fecha}
              onSeleccion={setFecha}
              excluirCitaId={cita.id}
            />
            {fecha ? (
              <SelectorSlots
                asesorId={asesor.id}
                fecha={fecha}
                duracionMin={duracionMin}
                ahora={ahora}
                zonaHorariaCliente={tzCliente}
                excluirCitaId={cita.id}
                onElegir={async (inicio) => {
                  setError(null)
                  const r = await reprogramarCita(cita.id, inicio, { ahora })
                  if (!r.ok) setError(r.motivo)
                  else setExito(inicio)
                }}
              />
            ) : (
              <p className="text-[12px] text-ink-muted">Elige el nuevo día.</p>
            )}
          </Card>
        )}
      </div>
    </Envoltura>
  )
}

function Envoltura({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  )
}
