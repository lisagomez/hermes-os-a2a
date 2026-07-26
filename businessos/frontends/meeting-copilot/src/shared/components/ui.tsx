'use client'

import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import { useEffect, type ComponentProps, type ReactNode } from 'react'

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

type BotonVariante = 'primary' | 'secondary' | 'ghost'
type BotonTamano = 'md' | 'sm'

const VARIANTE_BOTON: Record<BotonVariante, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'inline-flex items-center gap-1.5 rounded-s font-medium text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink',
}

export function Button({
  variante = 'secondary',
  tamano = 'md',
  className = '',
  type = 'button',
  ...rest
}: { variante?: BotonVariante; tamano?: BotonTamano } & ComponentProps<'button'>) {
  const tamanoCls =
    tamano === 'sm' ? 'px-2 py-1 text-[11px]' : variante === 'ghost' ? 'px-3 py-1.5 text-[13px]' : ''
  return <button type={type} className={`${VARIANTE_BOTON[variante]} ${tamanoCls} ${className}`.trim()} {...rest} />
}

export function Table({ className = '', ...rest }: ComponentProps<'table'>) {
  return <table className={`w-full text-left ${className}`.trim()} {...rest} />
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">{children}</tr>
    </thead>
  )
}

export function TH({ className = '', ...rest }: ComponentProps<'th'>) {
  return <th className={`px-4 py-2.5 font-medium ${className}`.trim()} {...rest} />
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line-subtle">{children}</tbody>
}

export function TRow({ className = '', ...rest }: ComponentProps<'tr'>) {
  return <tr className={`text-[13px] hover:bg-surface-muted ${className}`.trim()} {...rest} />
}

export function TCell({ className = '', ...rest }: ComponentProps<'td'>) {
  return <td className={`px-4 py-2.5 ${className}`.trim()} {...rest} />
}

export function Dialog({
  abierto,
  onCerrar,
  etiqueta,
  posicion = 'centro',
  className = '',
  children,
  ...rest
}: {
  abierto: boolean
  onCerrar: () => void
  etiqueta: string
  posicion?: 'centro' | 'alta'
  children: ReactNode
} & Omit<ComponentProps<'div'>, 'children' | 'role'>) {
  useEffect(() => {
    if (!abierto) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [abierto, onCerrar])

  if (!abierto) return null
  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-black/40 ${posicion === 'alta' ? 'items-start pt-24' : 'items-center p-6'}`}
      onClick={onCerrar}
      {...rest}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        className={`card w-full max-w-xl overflow-hidden bg-surface-raised shadow-[var(--shadow-2)] ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

/** Grupo de opciones excluyentes (pills). Dos presentaciones:
 *  - `segmentado`: contenedor con borde + p-0.5 y pills internas (patrón ThemeToggle
 *    / selector de atribución de RecorderView).
 *  - `suelto`: pills independientes con borde propio y gap (patrón tabs de
 *    NuevaConversacion / selector de PlaybooksView).
 *  El look por sitio se conserva vía `claseBoton` (padding/tipografía) y
 *  `claseInactiva` (tinta del estado inactivo). */
export function PillToggle<T extends string>({
  opciones,
  valor,
  onCambio,
  etiqueta,
  variante = 'segmentado',
  claseBoton = '',
  claseInactiva = 'text-ink-secondary hover:text-ink',
  className = '',
}: {
  opciones: { id: T; contenido: ReactNode; title?: string; testid?: string }[]
  valor: T
  onCambio: (id: T) => void
  /** aria-label del grupo. */
  etiqueta: string
  variante?: 'segmentado' | 'suelto'
  claseBoton?: string
  claseInactiva?: string
  className?: string
}) {
  const contenedor =
    variante === 'segmentado' ? 'flex items-center rounded-s border border-line bg-surface p-0.5' : 'flex flex-wrap gap-2'
  return (
    <div className={`${contenedor} ${className}`.trim()} role="group" aria-label={etiqueta}>
      {opciones.map((o) => {
        const activa = valor === o.id
        const clase =
          variante === 'segmentado'
            ? `rounded-md transition-colors ${activa ? 'bg-accent-muted text-accent' : claseInactiva}`
            : `rounded-s border transition-colors ${activa ? 'border-accent bg-accent-muted text-accent' : `border-line bg-surface ${claseInactiva}`}`
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onCambio(o.id)}
            title={o.title}
            aria-pressed={activa}
            data-testid={o.testid}
            className={`${clase} ${claseBoton}`.trim()}
          >
            {o.contenido}
          </button>
        )
      })}
    </div>
  )
}

type TonoCallout = Exclude<Tono, 'neutral'>

const CARD_CALLOUT: Record<TonoCallout, string> = {
  accent: 'border-accent bg-accent-muted',
  success: 'border-success bg-success-muted',
  warning: 'border-warning bg-warning-muted',
  danger: 'border-danger bg-danger-muted',
  info: 'border-info bg-info-muted',
}

const FONDO_CALLOUT: Record<TonoCallout, string> = {
  accent: 'bg-accent-muted',
  success: 'bg-success-muted',
  warning: 'bg-warning-muted',
  danger: 'bg-danger-muted',
  info: 'bg-info-muted',
}

const TINTA_CALLOUT: Record<TonoCallout, string> = {
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
}

/** Card tonal para avisos con contexto (alertas del coach, errores con acción).
 *  - `card` (default): card con borde y fondo del tono.
 *  - `inline`: bloque plano `bg-{tono}-muted` sin borde ni sombra (errores inline).
 *  `titulo`/`icono` son atajos para el layout icono + eyebrow; composiciones más
 *  ricas (chips en el título, testids internos) van directo en `children`. */
export function Callout({
  tono,
  titulo,
  icono: Icono,
  variante = 'card',
  className = '',
  children,
  ...rest
}: {
  tono: TonoCallout
  titulo?: string
  icono?: LucideIcon
  variante?: 'card' | 'inline'
  children: ReactNode
} & Omit<ComponentProps<'div'>, 'children'>) {
  const cuerpo =
    Icono || titulo ? (
      <div className="flex items-start gap-2">
        {Icono ? <Icono className={`mt-0.5 h-4 w-4 shrink-0 ${TINTA_CALLOUT[tono]}`} /> : null}
        <div className="min-w-0 flex-1">
          {titulo ? (
            <p className={`text-[12px] font-semibold uppercase tracking-wide ${TINTA_CALLOUT[tono]}`}>{titulo}</p>
          ) : null}
          {children}
        </div>
      </div>
    ) : (
      children
    )
  const base =
    variante === 'inline' ? `rounded-s px-3 py-2 ${FONDO_CALLOUT[tono]}` : `card ${CARD_CALLOUT[tono]}`
  return (
    <div className={`${base} ${className}`.trim()} {...rest}>
      {cuerpo}
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
