import type { ReactNode } from 'react'
import { avatarPorId } from '@/features/shell/avatares'
import { TabsNav } from '@/features/shell/components/tabs-nav'

/**
 * Segmento del Avatar de Contratos.
 * Trazabilidad (INVESTIGACION-SINTESIS.md): firmas corporativas/comerciales (§3.3) — trazabilidad de cláusulas y versiones, aprobaciones visibles, repositorio de precedentes.
 */
const avatar = avatarPorId('contratos')

export default function LayoutAvatardeContratos({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-5">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          {avatar.nombre}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{avatar.persona}</p>
      </header>
      <TabsNav vistas={avatar.vistas} />
      <div className="mt-6">{children}</div>
    </div>
  )
}
