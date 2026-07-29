'use client'

// M5 — Profundidad de servicio / marketplace: decide el TIPO de sesión antes
// de agendar. Ruta A (quick): tarjeta → asesor → selector de horario, sin
// fricción. Ruta B (discovery): mini-formulario primero; el brief viaja a la
// reserva y llega a la bandeja del asesor.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Layers } from 'lucide-react'
import { Button, Callout, Card, Chip, Dialog, EmptyState, SectionHeader } from '@/shared/components/ui'
import { fmtPrecio } from '@/shared/lib/format'
import type { RespuestaDiscovery, Servicio } from './types'
import { useAgendaStore } from './store'
import { SemaforoDisponibilidad } from './SemaforoDisponibilidad'
import { FormularioDiscovery } from './FormularioDiscovery'

function TarjetaServicio({ servicio, onElegir }: { servicio: Servicio; onElegir: () => void }) {
  return (
    <Card className="flex h-full flex-col gap-2 p-4" data-testid="tarjeta-servicio" data-servicio={servicio.slug}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[14px] font-semibold text-ink">{servicio.nombre}</p>
        <Chip tono={servicio.sessionDepth === 'discovery' ? 'accent' : 'neutral'}>
          {servicio.sessionDepth === 'discovery' ? 'Discovery' : 'Rápida'}
        </Chip>
      </div>
      <p className="text-[12px] leading-snug text-ink-secondary">{servicio.descripcion}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip>{servicio.duracionMin} min</Chip>
        <Chip tono={servicio.precioCentavos > 0 ? 'warning' : 'success'}>{fmtPrecio(servicio.precioCentavos, servicio.moneda)}</Chip>
        {servicio.requierePago ? <Chip tono="warning">Pago previo</Chip> : null}
      </div>
      <div className="mt-auto pt-2">
        <Button variante="primary" tamano="sm" className="w-full" onClick={onElegir} data-testid={`elegir-${servicio.slug}`}>
          {servicio.sessionDepth === 'discovery' ? 'Configurar sesión' : 'Reservar'}
        </Button>
      </div>
    </Card>
  )
}

export function CatalogoServicios() {
  const router = useRouter()
  // El filtro NO va en el selector (array nuevo por render = bucle) — regla activos/store.
  const serviciosCrudos = useAgendaStore((s) => s.servicios)
  const asesoresCrudos = useAgendaStore((s) => s.asesores)
  const servicios = useMemo(
    () => serviciosCrudos.filter((x) => x.activo).sort((a, b) => a.orden - b.orden),
    [serviciosCrudos]
  )
  const asesores = useMemo(() => asesoresCrudos.filter((a) => a.activo), [asesoresCrudos])

  const [elegido, setElegido] = useState<Servicio | null>(null)
  const [brief, setBrief] = useState<RespuestaDiscovery[] | null>(null)

  const rapidos = servicios.filter((s) => s.sessionDepth === 'quick')
  const parametrizados = servicios.filter((s) => s.sessionDepth === 'discovery')
  // Discovery pide brief antes de elegir asesor; quick va directo al selector.
  const pasoDialogo = elegido === null ? null : elegido.sessionDepth === 'discovery' && brief === null ? 'brief' : 'asesor'

  const irAReserva = (asesorSlug: string) => {
    if (!elegido) return
    const q = new URLSearchParams({ servicio: elegido.slug, depth: elegido.sessionDepth })
    if (elegido.sessionDepth === 'discovery' && brief) q.set('brief', encodeURIComponent(JSON.stringify(brief)))
    router.push(`/reservar/${asesorSlug}?${q.toString()}`)
  }

  const cerrar = () => {
    setElegido(null)
    setBrief(null)
  }

  return (
    <div data-testid="catalogo-servicios">
      <SectionHeader
        titulo="Servicios"
        descripcion="Marketplace: elige algo puntual sin configuración, o una sesión parametrizada que prepara al asesor."
      />

      <Callout tono="info" variante="inline" className="mb-4">
        <p className="text-[12px]">
          Catálogo demo — mock declarado. El decisor de profundidad es el cliente; la inferencia por IA del primer mensaje
          queda como seam futuro (session_depth ya viaja desde el día 1).
        </p>
      </Callout>

      <section className="mb-6">
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-muted">Servicio rápido</h2>
        {rapidos.length === 0 ? (
          <EmptyState icono={Layers} titulo="Sin servicios rápidos" descripcion="El catálogo demo se restaura al recargar." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rapidos.map((s) => (
              <TarjetaServicio key={s.id} servicio={s} onElegir={() => setElegido(s)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-muted">Sesión parametrizada</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {parametrizados.map((s) => (
            <TarjetaServicio key={s.id} servicio={s} onElegir={() => setElegido(s)} />
          ))}
        </div>
      </section>

      <Dialog abierto={pasoDialogo !== null} onCerrar={cerrar} etiqueta="Configurar reserva" data-testid="dialog-servicio">
        <div className="space-y-3 p-5">
          {pasoDialogo === 'brief' && elegido ? (
            <>
              <h3 className="text-[14px] font-semibold text-ink">{elegido.nombre}: cuéntanos el contexto</h3>
              <p className="text-[12px] text-ink-secondary">Estas respuestas alimentan el brief del asesor antes de la llamada.</p>
              <FormularioDiscovery onListo={setBrief} />
            </>
          ) : null}
          {pasoDialogo === 'asesor' && elegido ? (
            <>
              <h3 className="text-[14px] font-semibold text-ink">¿Con quién?</h3>
              <div className="space-y-1.5">
                {asesores.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => irAReserva(a.slug)}
                    className="flex w-full items-center justify-between gap-2 rounded-s border border-line px-3 py-2 text-left transition-colors hover:bg-surface-muted"
                    data-testid={`servicio-asesor-${a.slug}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-ink">{a.nombre}</span>
                      <span className="block truncate text-[11px] text-ink-secondary">{a.especialidad}</span>
                    </span>
                    <SemaforoDisponibilidad asesor={a} />
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </Dialog>
    </div>
  )
}
