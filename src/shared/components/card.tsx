import type { ReactNode } from 'react'

/**
 * Card canónica del panel (skin `mission`): `rounded-lg border border-line
 * bg-surface p-6`. Componente puro y server-safe (sin hooks): los tests sin
 * navegador lo invocan como función y recorren su árbol JSX.
 *
 * `className` extiende la base; si trae su propio padding (`p-10` empty
 * states, `p-0` wrappers de tabla) la card cede el `p-6` por defecto en vez
 * de dejar dos utilidades de padding compitiendo por orden de CSS.
 * `as` conserva la semántica del sitio de uso (section/article).
 */
export function Card({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
}) {
  const conPadding = /(?:^|\s)p-\d/.test(className ?? '')
  const clases = ['rounded-lg border border-line bg-surface']
  if (!conPadding) clases.push('p-6')
  if (className) clases.push(className)
  return <Tag className={clases.join(' ')}>{children}</Tag>
}
