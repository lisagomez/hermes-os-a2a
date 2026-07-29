'use client'

// Bandeja de solicitudes entrantes (patrón Acuity): el asesor aprueba ✓,
// reasigna → o rechaza. Al aprobar, el notificador mock registra el par
// email+WhatsApp y la cita pasa a confirmada; con pago pendiente, el candado
// se muestra — no se esconde.

import { useState } from 'react'
import { Inbox } from 'lucide-react'
import { Button, Callout, Card, Chip, Dialog } from '@/shared/components/ui'
import { fmtFecha } from '@/shared/lib/format'
import type { Asesor, Cita, NotificacionPendiente } from './types'
import { ETIQUETA_DEPTH } from './types'
import { etiquetaTz, fmtHoraEnTz } from './slots'
import { aprobarCita, reasignarCita, rechazarCita } from './pipeline'
import { useAgendaStore } from './store'

interface Resultado {
  tipo: 'aprobada' | 'reasignada' | 'rechazada' | 'error'
  mensaje: string
  notificaciones?: NotificacionPendiente[]
}

function SolicitudItem({ cita, asesor, onResultado }: { cita: Cita; asesor: Asesor; onResultado: (r: Resultado) => void }) {
  const asesores = useAgendaStore((s) => s.asesores)
  const [reasignando, setReasignando] = useState(false)
  const destinos = asesores.filter((a) => a.activo && a.id !== asesor.id)
  const pagoPendiente = cita.pagoEstado === 'pendiente'

  const aprobar = async () => {
    const { resultado, notificaciones } = await aprobarCita(cita.id)
    if (!resultado.ok) return onResultado({ tipo: 'error', mensaje: resultado.motivo })
    onResultado({ tipo: 'aprobada', mensaje: `Cita de ${cita.cliente.nombre} confirmada.`, notificaciones })
  }

  const reasignar = async (destinoId: string) => {
    setReasignando(false)
    const r = await reasignarCita(cita.id, destinoId)
    if (!r.ok) return onResultado({ tipo: 'error', mensaje: r.motivo })
    const destino = destinos.find((d) => d.id === destinoId)
    onResultado({ tipo: 'reasignada', mensaje: `Solicitud de ${cita.cliente.nombre} reasignada a ${destino?.nombre ?? destinoId}.` })
  }

  const rechazar = async () => {
    const r = await rechazarCita(cita.id)
    if (!r.ok) return onResultado({ tipo: 'error', mensaje: r.motivo })
    onResultado({ tipo: 'rechazada', mensaje: `Solicitud de ${cita.cliente.nombre} rechazada.` })
  }

  return (
    <div className="space-y-2 border-b border-line-subtle py-3 first:pt-0 last:border-b-0" data-testid="solicitud-item">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink">{cita.cliente.nombre}</p>
          <p className="text-[12px] text-ink-secondary">
            {fmtFecha(cita.inicio)} · {fmtHoraEnTz(cita.inicio, asesor.zonaHoraria)} — {etiquetaTz(asesor.zonaHoraria, cita.inicio)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Chip tono={cita.sessionDepth === 'discovery' ? 'accent' : 'neutral'}>{ETIQUETA_DEPTH[cita.sessionDepth]}</Chip>
          {pagoPendiente ? <Chip tono="warning">Pago pendiente</Chip> : null}
        </div>
      </div>

      {cita.brief && cita.brief.length > 0 ? (
        <details className="rounded-s bg-surface-muted px-3 py-2" data-testid="brief-solicitud">
          <summary className="cursor-pointer text-[12px] font-medium text-ink-secondary">Brief de discovery ({cita.brief.length})</summary>
          <ul className="mt-2 space-y-1.5">
            {cita.brief.map((b, i) => (
              <li key={i} className="text-[12px]">
                <span className="text-ink-muted">{b.pregunta}</span>{' '}
                <span className="text-ink">{b.respuesta}</span>
              </li>
            ))}
          </ul>
          {cita.resumenIaBrief ? <p className="mt-2 border-t border-line-subtle pt-2 text-[12px] italic text-ink-secondary">{cita.resumenIaBrief}</p> : null}
        </details>
      ) : null}

      {pagoPendiente ? (
        <Callout tono="warning" variante="inline">
          <p className="text-[12px]">El servicio exige pago previo: la aprobación queda bloqueada hasta registrarse el pago (seam Polar).</p>
        </Callout>
      ) : null}

      <div className="flex items-center gap-2">
        <Button variante="primary" tamano="sm" onClick={aprobar} disabled={pagoPendiente} data-testid="boton-aprobar">
          ✓ Aprobar
        </Button>
        <Button tamano="sm" onClick={() => setReasignando(true)} data-testid="boton-reasignar">
          → Reasignar
        </Button>
        <Button variante="ghost" tamano="sm" onClick={rechazar} data-testid="boton-rechazar">
          Rechazar
        </Button>
      </div>

      <Dialog abierto={reasignando} onCerrar={() => setReasignando(false)} etiqueta="Reasignar solicitud" data-testid="dialog-reasignar">
        <div className="space-y-3 p-5">
          <h3 className="text-[14px] font-semibold text-ink">Reasignar a…</h3>
          <div className="space-y-1.5">
            {destinos.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => reasignar(d.id)}
                className="flex w-full items-center justify-between gap-2 rounded-s border border-line px-3 py-2 text-left transition-colors hover:bg-surface-muted"
                data-testid={`reasignar-a-${d.id}`}
              >
                <span className="text-[13px] font-medium text-ink">{d.nombre}</span>
                <span className="text-[12px] text-ink-secondary">{d.especialidad}</span>
              </button>
            ))}
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export function BandejaSolicitudes({ asesor }: { asesor: Asesor }) {
  const citas = useAgendaStore((s) => s.citas)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const solicitudes = citas.filter((c) => c.asesorId === asesor.id && c.estado === 'solicitada')

  return (
    <Card className="p-4" data-testid="bandeja-solicitudes">
      <h2 className="text-[14px] font-semibold text-ink">Solicitudes entrantes</h2>
      <p className="mb-2 text-[12px] text-ink-secondary">Citas esperando tu decisión: aprobar, reasignar o rechazar.</p>

      {resultado ? (
        <Callout tono={resultado.tipo === 'error' ? 'danger' : 'success'} variante="inline" className="mb-2" data-testid="notificaciones-cita">
          <p className="text-[12px] font-medium">{resultado.mensaje}</p>
          {resultado.notificaciones ? (
            <ul className="mt-1 space-y-0.5">
              {resultado.notificaciones.map((n) => (
                <li key={n.id} className="text-[11px] text-ink-secondary">
                  {n.estado === 'enviada' ? '✓' : '✗'} {n.canal} → {n.destinatario} <span className="text-ink-muted">({n.procedencia.fuente})</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Callout>
      ) : null}

      {solicitudes.length === 0 ? (
        <div className="flex items-center gap-2 py-4 text-[12px] text-ink-muted">
          <Inbox className="h-4 w-4" /> Sin solicitudes pendientes.
        </div>
      ) : (
        solicitudes.map((c) => <SolicitudItem key={c.id} cita={c} asesor={asesor} onResultado={setResultado} />)
      )}
    </Card>
  )
}
