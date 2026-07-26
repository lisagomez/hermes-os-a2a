import type { ReactNode } from 'react'

/**
 * Jerarquía única de headings del panel (skin `mission`), dos niveles bajo el
 * h1 de página (`text-2xl font-bold`, que se queda en cada page):
 *
 *  - `SectionTitle`: título de card/panel/sección. Antes convivían 4
 *    tratamientos para este mismo nivel; queda el mayoritario
 *    (`text-sm font-medium` en tinta secundaria).
 *  - `MicroLabel`: etiqueta interior de card (listas secundarias tipo
 *    Skills/Checklist): `text-xs` uppercase en tinta apagada.
 *
 * Puros y server-safe (sin hooks), igual que `Card`: los tests sin navegador
 * los invocan como función y recorren su árbol JSX.
 */
export function SectionTitle({
  children,
  className,
  as: Tag = 'h2',
}: {
  children: ReactNode
  className?: string
  as?: 'h2' | 'h3'
}) {
  const clases = ['text-sm font-medium text-ink-secondary']
  if (className) clases.push(className)
  return <Tag className={clases.join(' ')}>{children}</Tag>
}

export function MicroLabel({
  children,
  className,
  as: Tag = 'h3',
}: {
  children: ReactNode
  className?: string
  as?: 'h3' | 'h4'
}) {
  const clases = ['text-xs font-medium uppercase tracking-wide text-ink-muted']
  if (className) clases.push(className)
  return <Tag className={clases.join(' ')}>{children}</Tag>
}
