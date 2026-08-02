'use client'

// Hilo completo (/buzon/[hilo], SPEC §6.1): entrantes saneados, borradores con
// su estado y gates, historial. Todo lo que A5 necesitaría ver TAMBIÉN vive
// aquí, no solo en la cola — un hilo ya resuelto (enviado/rechazado_gates) se
// audita desde esta pantalla.

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { MailX } from 'lucide-react'
import { Button, Card, Chip, EmptyState, SectionHeader } from '@/shared/components/ui'
import { fmtFecha, fmtHora } from '@/shared/lib/format'
import { ETIQUETA_ESTADO_CORREO, ETIQUETA_ESTADO_HILO } from './types'
import { resumenHilo } from './hilos'
import { useBuzonStore } from './store'
import { EntranteCard } from './EntranteCard'
import { GatesResultado } from './GatesResultado'

export function HiloDetalle() {
  const params = useParams<{ hilo: string }>()
  const entrantes = useBuzonStore((s) => s.entrantes)
  const salientes = useBuzonStore((s) => s.salientes)
  const buzones = useBuzonStore((s) => s.buzones)

  const hilo = params.hilo ? resumenHilo(params.hilo, entrantes, salientes) : null

  if (!hilo) {
    return (
      <EmptyState
        icono={MailX}
        titulo="Hilo no encontrado"
        descripcion="El hilo no existe o aún no llega correo para él."
        accion={
          <Link href="/buzon">
            <Button variante="primary" tamano="sm">Volver al buzón</Button>
          </Link>
        }
      />
    )
  }

  const buzon = buzones.find((b) => b.id === hilo.buzonId)

  return (
    <div data-testid="hilo-detalle" data-hilo={hilo.hiloId}>
      <SectionHeader
        titulo={hilo.asunto}
        descripcion={`${buzon?.direccion ?? hilo.buzonId} · hilo ${hilo.hiloId}`}
        acciones={
          <>
            <Chip>{ETIQUETA_ESTADO_HILO[hilo.estado]}</Chip>
            {hilo.pendientes > 0 ? (
              <Link href="/buzon/aprobaciones">
                <Button variante="primary" tamano="sm">Ir a aprobaciones ({hilo.pendientes})</Button>
              </Link>
            ) : null}
          </>
        }
      />

      <div className="space-y-4">
        <Card className="p-4">
          <h2 className="mb-2 text-[13px] font-semibold text-ink">Entrantes ({hilo.entrantes.length})</h2>
          <div className="space-y-2">
            {hilo.entrantes.map((e) => (
              <EntranteCard key={e.id} entrante={e} />
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 text-[13px] font-semibold text-ink">Borradores y salientes ({hilo.salientes.length})</h2>
          {hilo.salientes.length === 0 ? (
            <p className="text-[12px] text-ink-muted">El agente aún no redacta respuesta para este hilo.</p>
          ) : (
            <div className="space-y-4">
              {hilo.salientes.map((s) => (
                <div key={s.id} className="space-y-2 border-t border-line-subtle pt-3 first:border-t-0 first:pt-0" data-testid="saliente-card" data-saliente={s.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tono={s.estado === 'enviado' ? 'success' : s.estado.startsWith('rechazado') || s.estado === 'reportado_inyeccion' ? 'danger' : 'info'}>
                      {ETIQUETA_ESTADO_CORREO[s.estado]}
                    </Chip>
                    <Chip>{s.clase}</Chip>
                    <span className="text-[11px] text-ink-muted">Política: {s.politica.modo} · cuota {s.politica.cuotaHora}/h, {s.politica.cuotaHilo}/hilo</span>
                  </div>
                  <p className="text-[13px] font-medium text-ink">{s.asunto}</p>
                  <p className="whitespace-pre-line text-[13px] text-ink-secondary">{s.cuerpo}</p>
                  <p className="text-[11px] text-ink-muted">
                    Para: {s.destinatarios.to.join(', ')}
                    {s.destinatarios.cc.length > 0 ? ` · Cc: ${s.destinatarios.cc.join(', ')}` : ''}
                  </p>

                  <details data-testid="detalle-gates">
                    <summary className="cursor-pointer text-[12px] font-medium text-ink-secondary">Gates ({s.gates.length}/11)</summary>
                    <div className="mt-2">
                      <GatesResultado gates={s.gates} />
                    </div>
                  </details>

                  <details data-testid="detalle-historial">
                    <summary className="cursor-pointer text-[12px] font-medium text-ink-secondary">Historial ({s.historial.length})</summary>
                    <ul className="mt-2 space-y-1">
                      {s.historial.map((t, i) => (
                        <li key={i} className="text-[11px] text-ink-secondary">
                          {fmtFecha(t.at)} {fmtHora(t.at)} — <span className="font-medium text-ink">{t.actor}</span> {t.evento} ({t.de ?? '(nuevo)'} → {t.a})
                          {t.detalle ? <span className="italic text-ink-muted"> — {t.detalle}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
