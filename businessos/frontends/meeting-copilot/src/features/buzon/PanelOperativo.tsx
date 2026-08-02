'use client'

// Panel operativo de un buzón activo/pausado (SPEC §11.9-§11.12): semáforo de
// salud, Pausar/Desconectar SIEMPRE visibles, propuestas de relajamiento
// progresivo y la traducción de gates a lenguaje natural para el cliente.

import Link from 'next/link'
import { useState } from 'react'
import { AlertTriangle, Pause, Play, PowerOff } from 'lucide-react'
import { Button, Callout, Card, Chip } from '@/shared/components/ui'
import type { Buzon } from './types'
import { rebotesEnAlerta, saludDe } from './salud'
import { useBuzonStore } from './store'
import { mensajeClienteDeGate } from './gatesLenguaje'
import type { Severidad } from './types'

// Tailwind necesita clases completas y literales en el fuente (v4 escanea el
// código, no evalúa strings en runtime) — nunca `text-${variable}`.
const TEXTO_SEVERIDAD: Record<Severidad, string> = {
  CRITICA: 'text-danger',
  ALTA: 'text-warning',
  MEDIA: 'text-info',
}

function SemaforoSalud({ buzon }: { buzon: Buzon }) {
  const salud = useBuzonStore((s) => saludDe(s.salud, buzon.id))
  const pendientes = useBuzonStore((s) => s.salientes.filter((c) => c.buzonId === buzon.id && c.estado === 'pendiente_aprobacion').length)

  return (
    <div className="flex flex-wrap items-center gap-3 text-[12px]" data-testid="semaforo-salud">
      <Link href="/buzon/bitacora" className="inline-flex items-center gap-1 hover:underline" title="Ver bitácora de entregabilidad">
        <span className={`h-2 w-2 rounded-full ${salud.entregabilidadPct >= 98 ? 'bg-success' : 'bg-warning'}`} />
        Entregabilidad {salud.entregabilidadPct}%
      </Link>
      <Link href="/buzon/bitacora" className="inline-flex items-center gap-1 hover:underline" title="Ver bitácora de rebotes">
        <span className={`h-2 w-2 rounded-full ${salud.rebotes > 0 ? 'bg-danger' : 'bg-success'}`} />
        Rebotes {salud.rebotes}
      </Link>
      <Link href="/buzon/bitacora" className="inline-flex items-center gap-1 hover:underline" title="Ver bitácora de DMARC">
        <span className={`h-2 w-2 rounded-full ${salud.dmarcOk ? 'bg-success' : 'bg-danger'}`} />
        DMARC {salud.dmarcOk ? 'ok' : 'falla'}
      </Link>
      <Link href="/buzon/politicas" className="inline-flex items-center gap-1 hover:underline" title="Ver política de cuota">
        <span className={`h-2 w-2 rounded-full ${salud.cuotaPct < 80 ? 'bg-success' : 'bg-warning'}`} />
        Cuota {salud.cuotaPct}%
      </Link>
      <Link href="/buzon/aprobaciones" className="inline-flex items-center gap-1 hover:underline" title="Ir a aprobaciones">
        <span className={`h-2 w-2 rounded-full ${pendientes > 0 ? 'bg-warning' : 'bg-success'}`} />
        Por aprobar {pendientes}
      </Link>
    </div>
  )
}

function TarjetaRelajamiento({ buzon }: { buzon: Buzon }) {
  const relajamientos = useBuzonStore((s) => s.relajamientos.filter((r) => r.buzonId === buzon.id && r.estado === 'propuesto'))
  const decidirRelajamiento = useBuzonStore((s) => s.decidirRelajamiento)
  const [descartadas, setDescartadas] = useState<string[]>([])

  const visibles = relajamientos.filter((r) => !descartadas.includes(r.id))
  if (visibles.length === 0) return null

  return (
    <>
      {visibles.map((r) => (
        <Callout key={r.id} tono="accent" data-testid="propuesta-relajamiento" data-relajamiento={r.id}>
          <p className="text-[12px]">
            Los últimos {r.evidencia.rachaAprobaciones} correos de la clase <span className="font-medium text-ink">{r.clase}</span> se aprobaron sin
            cambios, en {r.evidencia.diasActivo} días activo. ¿Quieres que salgan solos? Podrás revertirlo cuando quieras.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              variante="primary"
              tamano="sm"
              onClick={() => decidirRelajamiento(r.id, 'aplicar', 'ui:relajamiento', new Date().toISOString())}
              data-testid="relajamiento-aplicar"
            >
              Sí, envío directo
            </Button>
            <Button tamano="sm" onClick={() => decidirRelajamiento(r.id, 'mantener', 'ui:relajamiento', new Date().toISOString())} data-testid="relajamiento-mantener">
              Mantener aprobación
            </Button>
            <Button
              variante="ghost"
              tamano="sm"
              onClick={() => {
                decidirRelajamiento(r.id, 'recordar_despues', 'ui:relajamiento', new Date().toISOString())
                setDescartadas((d) => [...d, r.id])
              }}
              data-testid="relajamiento-recordar"
            >
              Recordarme después
            </Button>
          </div>
        </Callout>
      ))}
    </>
  )
}

function FeedGatesTraducidos({ buzon }: { buzon: Buzon }) {
  const reportarFalsoPositivo = useBuzonStore((s) => s.reportarFalsoPositivo)
  const salientes = useBuzonStore((s) => s.salientes.filter((c) => c.buzonId === buzon.id))
  const [reportados, setReportados] = useState<string[]>([])

  const bloqueados = salientes.flatMap((c) => c.gates.filter((g) => !g.paso).map((g) => ({ correoId: c.id, hiloId: c.hiloId, gate: g.gate, severidad: g.severidad })))

  if (bloqueados.length === 0) {
    return <p className="text-[12px] text-ink-muted">Sin envíos detenidos por un control de seguridad en este buzón.</p>
  }

  return (
    <div className="space-y-2">
      {bloqueados.map((b, i) => {
        const clave = `${b.correoId}:${b.gate}`
        const traduccion = mensajeClienteDeGate(b.gate)
        return (
          <div key={i} className="flex items-start gap-2 rounded-s border border-line-subtle p-3" data-testid="gate-traducido">
            <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${TEXTO_SEVERIDAD[b.severidad]}`} />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-ink-secondary">{traduccion.mensaje}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {traduccion.enlace ? (
                  <Link href={traduccion.enlace.href} className="text-[11px] text-accent hover:underline">
                    {traduccion.enlace.etiqueta}
                  </Link>
                ) : null}
                {reportados.includes(clave) ? (
                  <Chip tono="neutral">Reportado como falso positivo</Chip>
                ) : (
                  <Button
                    tamano="sm"
                    variante="ghost"
                    onClick={() => {
                      reportarFalsoPositivo(buzon.id, b.gate, 'ui:cliente', new Date().toISOString(), { correoId: b.correoId, hiloId: b.hiloId })
                      setReportados((r) => [...r, clave])
                    }}
                    data-testid="reportar-falso-positivo"
                  >
                    Esto es un falso positivo
                  </Button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function PanelOperativo({ buzon, ahora }: { buzon: Buzon; ahora: string }) {
  const pausarBuzon = useBuzonStore((s) => s.pausarBuzon)
  const reanudarBuzon = useBuzonStore((s) => s.reanudarBuzon)
  const desconectarBuzon = useBuzonStore((s) => s.desconectarBuzon)
  const salud = useBuzonStore((s) => saludDe(s.salud, buzon.id))
  const [confirmarDesconectar, setConfirmarDesconectar] = useState(false)

  return (
    <div className="space-y-4" data-testid="panel-operativo">
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SemaforoSalud buzon={buzon} />
          <div className="flex items-center gap-2" data-testid="controles-pausar-desconectar">
            {buzon.estado === 'activo' ? (
              <Button tamano="sm" onClick={() => pausarBuzon(buzon.id, ahora)} data-testid="pausar-buzon">
                <Pause className="mr-1 inline h-3.5 w-3.5" /> Pausar
              </Button>
            ) : buzon.estado === 'pausado' ? (
              <Button tamano="sm" variante="primary" onClick={() => reanudarBuzon(buzon.id, ahora)} data-testid="reanudar-buzon">
                <Play className="mr-1 inline h-3.5 w-3.5" /> Reanudar
              </Button>
            ) : null}
            <Button tamano="sm" variante="ghost" onClick={() => setConfirmarDesconectar(true)} data-testid="desconectar-buzon">
              <PowerOff className="mr-1 inline h-3.5 w-3.5 text-danger" /> Desconectar
            </Button>
          </div>
        </div>

        {rebotesEnAlerta(salud) ? (
          <Callout tono="danger" variante="inline">
            <p className="text-[12px]">{salud.rebotes} rebote(s) detectado(s) — revisa la bitácora antes de que se acumulen.</p>
          </Callout>
        ) : null}

        {buzon.estado === 'pausado' ? (
          <Callout tono="warning" variante="inline">
            <p className="text-[12px]">Buzón pausado: sigue leyendo y redactando, pero no envía nada hasta que lo reanudes.</p>
          </Callout>
        ) : null}
      </Card>

      {confirmarDesconectar ? (
        <Callout tono="danger" titulo="Confirmar desconexión">
          <p className="mb-2 text-[12px]">Se revocan las credenciales de {buzon.direccion}. La bitácora se conserva íntegra para tu auditoría. Esta acción no se deshace desde aquí.</p>
          <div className="flex gap-2">
            <Button tamano="sm" onClick={() => setConfirmarDesconectar(false)}>Cancelar</Button>
            <Button
              tamano="sm"
              variante="primary"
              onClick={() => {
                desconectarBuzon(buzon.id, ahora)
                setConfirmarDesconectar(false)
              }}
              data-testid="confirmar-desconectar"
            >
              Sí, desconectar
            </Button>
          </div>
        </Callout>
      ) : null}

      <TarjetaRelajamiento buzon={buzon} />

      <Card className="space-y-2 p-4">
        <p className="text-[13px] font-semibold text-ink">Lo que el cliente vería (§11.10)</p>
        <FeedGatesTraducidos buzon={buzon} />
      </Card>
    </div>
  )
}
