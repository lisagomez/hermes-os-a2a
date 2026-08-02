'use client'

// /buzon/aprobaciones — la cola de A5, EL CAMINO CRÍTICO (SPEC §6.3). Sin esto
// A5 firma a ciegas: original saneado, borrador propuesto, destinatarios
// resueltos y su origen, los 11 gates, clase+política, y las 3 decisiones
// posibles (aprobar / rechazar / rechazar y reportar). Un gate CRÍTICO en rojo
// JAMÁS llega aquí: esos borradores viven en rechazado_gates y se ven en el hilo.

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ShieldAlert, XCircle } from 'lucide-react'
import { Button, Callout, Card, Chip, EmptyState, SectionHeader, Stat } from '@/shared/components/ui'
import { SchemaMotivoDecision } from './validacion'
import type { CorreoSaliente } from './types'
import { useBuzonStore } from './store'
import { EntranteCard } from './EntranteCard'
import { GatesResultado } from './GatesResultado'

type Decision = 'aprobar' | 'rechazar' | 'reportar_inyeccion'

function DestinatariosResueltos({ correo }: { correo: CorreoSaliente }) {
  const gateDestinatarios = correo.gates.find((g) => g.gate === 'destinatarios_del_hilo')
  const detalles = gateDestinatarios?.detalles ?? []
  if (detalles.length === 0) {
    return (
      <p className="text-[12px] text-ink-secondary">
        Para: {correo.destinatarios.to.join(', ')}
        {correo.destinatarios.cc.length > 0 ? ` · Cc: ${correo.destinatarios.cc.join(', ')}` : ''}
      </p>
    )
  }
  return (
    <ul className="space-y-0.5 text-[12px] text-ink-secondary" data-testid="destinatarios-resueltos">
      {detalles.map((d, i) => (
        <li key={i}>{d}</li>
      ))}
    </ul>
  )
}

function ItemAprobacion({ correo, onResuelto }: { correo: CorreoSaliente; onResuelto: (mensaje: string, tono: 'success' | 'danger') => void }) {
  const decidirAprobacion = useBuzonStore((s) => s.decidirAprobacion)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const confirmar = (evento: Decision) => {
    if (evento !== 'aprobar') {
      const parsed = SchemaMotivoDecision.safeParse({ motivo })
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? 'Motivo inválido.')
        return
      }
    }
    const r = decidirAprobacion(correo.id, evento, motivo.trim() || undefined)
    if (!r.ok) return setError(r.motivo)
    setError(null)
    onResuelto(
      evento === 'aprobar' ? 'Correo aprobado: queda a la espera del envío.' : evento === 'rechazar' ? 'Correo rechazado; el agente debe redactar de nuevo.' : 'Reportado como intento de inyección: entra al corpus de regresión.',
      evento === 'aprobar' ? 'success' : 'danger'
    )
  }

  return (
    <Card className="space-y-3 p-4" data-testid="item-aprobacion" data-correo={correo.id}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Chip>{correo.clase}</Chip>
          <span className="text-[11px] text-ink-muted">
            Política: {correo.politica.modo} · cuota {correo.politica.cuotaHora}/h, {correo.politica.cuotaHilo}/hilo
          </span>
        </div>
        <Link href={`/buzon/${correo.hiloId}`} className="text-[11px] text-ink-secondary hover:underline">
          Ver hilo completo →
        </Link>
      </div>

      {correo.enRespuestaA ? (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Original saneado</p>
          <EntranteOriginal correoId={correo.enRespuestaA} />
        </div>
      ) : null}

      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Borrador propuesto</p>
        <div className="rounded-s border border-line-subtle p-3">
          <p className="text-[13px] font-medium text-ink">{correo.asunto}</p>
          <p className="mt-1 whitespace-pre-line text-[13px] text-ink-secondary">{correo.cuerpo}</p>
        </div>
      </div>

      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Destinatarios resueltos</p>
        <DestinatariosResueltos correo={correo} />
      </div>

      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Gates ({correo.gates.length}/11)</p>
        <GatesResultado gates={correo.gates} />
      </div>

      {error ? (
        <Callout tono="danger" variante="inline">
          <p className="text-[12px]">{error}</p>
        </Callout>
      ) : null}

      <div className="space-y-2">
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo (obligatorio para rechazar / rechazar y reportar; queda en la bitácora)"
          className="input min-h-16 w-full text-[12px]"
          data-testid="motivo-decision"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button variante="primary" tamano="sm" onClick={() => confirmar('aprobar')} data-testid="boton-aprobar-correo">
            <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> Aprobar
          </Button>
          <Button tamano="sm" onClick={() => confirmar('rechazar')} data-testid="boton-rechazar-correo">
            <XCircle className="mr-1 inline h-3.5 w-3.5" /> Rechazar
          </Button>
          <Button variante="ghost" tamano="sm" onClick={() => confirmar('reportar_inyeccion')} data-testid="boton-rechazar-reportar">
            <span className="inline-flex items-center gap-1 text-danger">
              <ShieldAlert className="h-3.5 w-3.5" /> Rechazar y reportar
            </span>
          </Button>
        </div>
      </div>
    </Card>
  )
}

function EntranteOriginal({ correoId }: { correoId: string }) {
  const entrante = useBuzonStore((s) => s.entrantes.find((e) => e.id === correoId))
  if (!entrante) return <p className="text-[12px] text-ink-muted">Sin correo entrante asociado (borrador iniciado por el agente).</p>
  return <EntranteCard entrante={entrante} />
}

export function ColaAprobaciones() {
  const salientes = useBuzonStore((s) => s.salientes)
  const buzones = useBuzonStore((s) => s.buzones)
  const [resultado, setResultado] = useState<{ mensaje: string; tono: 'success' | 'danger' } | null>(null)

  const pendientes = salientes.filter((s) => s.estado === 'pendiente_aprobacion').sort((a, b) => a.creadoAt.localeCompare(b.creadoAt))

  return (
    <div data-testid="cola-aprobaciones">
      <SectionHeader
        titulo="Aprobaciones"
        descripcion="Cola de A5: ningún correo sale sin tu firma. Un gate CRÍTICO en rojo nunca llega hasta aquí — se ve en el hilo, ya rechazado."
      />

      <div className="mb-4">
        <Stat etiqueta="Pendientes" valor={String(pendientes.length)} tono={pendientes.length > 0 ? 'warning' : 'neutral'} />
      </div>

      {resultado ? (
        <Callout tono={resultado.tono} variante="inline" className="mb-3">
          <p className="text-[12px] font-medium">{resultado.mensaje}</p>
        </Callout>
      ) : null}

      {pendientes.length === 0 ? (
        <EmptyState icono={CheckCircle2} titulo="Bandeja en cero" descripcion="No hay borradores esperando tu aprobación en ningún buzón." />
      ) : (
        <div className="space-y-4">
          {pendientes.map((correo) => (
            <ItemAprobacion
              key={correo.id}
              correo={correo}
              onResuelto={(mensaje, tono) => setResultado({ mensaje: `${mensaje} (${buzones.find((b) => b.id === correo.buzonId)?.direccion ?? correo.buzonId})`, tono })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
