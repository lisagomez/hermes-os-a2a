'use client'

import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

type Tono = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

const TONOS: Record<Tono, string> = {
  neutral: 'bg-surface-muted text-ink-secondary',
  accent: 'bg-accent-muted text-accent',
  success: 'bg-success-muted text-success',
  warning: 'bg-warning-muted text-warning',
  danger: 'bg-danger-muted text-danger',
  info: 'bg-info-muted text-info',
}

export function Chip({ tono = 'neutral', children }: { tono?: Tono; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${TONOS[tono]}`}>
      {children}
    </span>
  )
}

export function tonoScore(total: number): Tono {
  if (total >= 70) return 'success'
  if (total >= 50) return 'warning'
  return 'danger'
}

export function ScoreChip({ total }: { total: number }) {
  return <Chip tono={tonoScore(total)}>{total} / 100</Chip>
}

export function Card({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div className={`card ${className}`} id={id}>
      {children}
    </div>
  )
}

export function SectionHeader({ titulo, descripcion, acciones }: { titulo: string; descripcion?: string; acciones?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-lg font-semibold text-ink">{titulo}</h1>
        {descripcion ? <p className="mt-0.5 text-[13px] text-ink-secondary">{descripcion}</p> : null}
      </div>
      {acciones ? <div className="flex items-center gap-2">{acciones}</div> : null}
    </div>
  )
}

export function EmptyState({
  icono: Icono = Inbox,
  titulo,
  descripcion,
  accion,
}: {
  icono?: LucideIcon
  titulo: string
  descripcion: string
  accion?: ReactNode
}) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      <Icono className="h-8 w-8 text-ink-muted" strokeWidth={1.5} />
      <p className="text-sm font-semibold text-ink">{titulo}</p>
      <p className="max-w-sm text-[13px] text-ink-secondary">{descripcion}</p>
      {accion ? <div className="mt-2">{accion}</div> : null}
    </div>
  )
}

export function Stat({ etiqueta, valor, detalle, tono = 'neutral' }: { etiqueta: string; valor: string; detalle?: string; tono?: Tono }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{etiqueta}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{valor}</p>
      {detalle ? <p className={`mt-0.5 text-[12px] ${tono === 'neutral' ? 'text-ink-secondary' : TONOS[tono].split(' ')[1]}`}>{detalle}</p> : null}
    </div>
  )
}

export function ProgressBar({ valor, tono = 'accent' }: { valor: number; tono?: Tono }) {
  const color =
    tono === 'success' ? 'bg-success' : tono === 'warning' ? 'bg-warning' : tono === 'danger' ? 'bg-danger' : 'bg-accent'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
      <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${Math.min(100, Math.max(0, valor))}%` }} />
    </div>
  )
}
