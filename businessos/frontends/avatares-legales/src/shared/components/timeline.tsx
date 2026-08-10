import type { ReactNode } from 'react'

/**
 * Línea de tiempo vertical (alertas regulatorias, versiones de contrato,
 * bitácora de decisiones). Las fechas llegan ya formateadas desde los
 * fixtures (server components) para evitar desajustes de hidratación.
 */

export type EventoTimeline = {
  id: string
  /** Fecha ya formateada para mostrar (p. ej. "12 ago 2026"). */
  fecha: string
  titulo: string
  descripcion?: string
  /** Adornos: RiskBadge, ValidacionChip, GrafoTag… */
  adorno?: ReactNode
}

export function Timeline({ eventos }: { eventos: EventoTimeline[] }) {
  return (
    <ol className="relative space-y-6 border-s border-line ps-6">
      {eventos.map((evento) => (
        <li key={evento.id} className="relative">
          <span
            aria-hidden
            className="absolute -start-[1.72rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-line-strong"
          />
          <p className="font-mono text-xs tabular-nums text-ink-muted">
            {evento.fecha}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">{evento.titulo}</p>
            {evento.adorno}
          </div>
          {evento.descripcion ? (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-secondary">
              {evento.descripcion}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  )
}
