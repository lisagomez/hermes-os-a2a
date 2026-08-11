import type { ReactNode } from 'react'
import type { RiskLevel } from '@/shared/types'

/**
 * Primitivas de UI de la piel "legal sobria". Componentes de presentación
 * puros (sin estado): usables desde server y client components.
 */

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-card border border-line bg-surface p-5 shadow-1 ${className}`}
    >
      {children}
    </div>
  )
}

export function Chip({
  children,
  tono = 'neutro',
}: {
  children: ReactNode
  /** 'acento' para estados de flujo destacados; nunca sustituye a RiskBadge. */
  tono?: 'neutro' | 'acento'
}) {
  const clases =
    tono === 'acento'
      ? 'bg-accent-muted text-accent'
      : 'bg-surface-muted text-ink-secondary'
  return (
    <span
      className={`inline-flex items-center rounded-control px-2.5 py-0.5 text-xs font-medium ${clases}`}
    >
      {children}
    </span>
  )
}

/** Único componente que usa la paleta de riesgo (decisión C4, ver tokens.css). */
export function RiskBadge({ nivel }: { nivel: RiskLevel }) {
  const estilos: Record<RiskLevel, { clases: string; etiqueta: string }> = {
    alto: { clases: 'bg-risk-alto-muted text-risk-alto', etiqueta: 'Riesgo alto' },
    medio: {
      clases: 'bg-risk-medio-muted text-risk-medio',
      etiqueta: 'Riesgo medio',
    },
    bajo: { clases: 'bg-risk-bajo-muted text-risk-bajo', etiqueta: 'Riesgo bajo' },
  }
  const { clases, etiqueta } = estilos[nivel]
  return (
    <span
      className={`inline-flex items-center rounded-control px-2.5 py-0.5 text-xs font-semibold ${clases}`}
    >
      {etiqueta}
    </span>
  )
}

export function SectionHeader({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string
  descripcion?: string
  acciones?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
          {titulo}
        </h2>
        {descripcion ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-secondary">
            {descripcion}
          </p>
        ) : null}
      </div>
      {acciones ? <div className="flex items-center gap-2">{acciones}</div> : null}
    </div>
  )
}

export function EmptyState({
  titulo,
  descripcion,
}: {
  titulo: string
  descripcion?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
      <p className="font-display text-lg font-semibold text-ink">{titulo}</p>
      {descripcion ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
          {descripcion}
        </p>
      ) : null}
    </div>
  )
}

export function Stat({
  etiqueta,
  valor,
  detalle,
}: {
  etiqueta: string
  valor: string
  detalle?: string
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-1">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {etiqueta}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">
        {valor}
      </p>
      {detalle ? <p className="mt-1 text-xs text-ink-secondary">{detalle}</p> : null}
    </div>
  )
}

export function ProgressBar({
  valor,
  etiqueta,
}: {
  /** 0–100. */
  valor: number
  etiqueta?: string
}) {
  const acotado = Math.max(0, Math.min(100, valor))
  return (
    <div>
      {etiqueta ? (
        <div className="mb-1 flex justify-between text-xs text-ink-secondary">
          <span>{etiqueta}</span>
          <span className="tabular-nums">{acotado}%</span>
        </div>
      ) : null}
      <div
        className="h-1.5 overflow-hidden rounded-control bg-surface-muted"
        role="progressbar"
        aria-valuenow={acotado}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full bg-accent" style={{ width: `${acotado}%` }} />
      </div>
    </div>
  )
}
