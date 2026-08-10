import type { ReactNode } from 'react'
import { avatarPorId } from '@/features/shell/avatares'
import { TabsNav } from '@/features/shell/components/tabs-nav'

/**
 * Segmento del Avatar Fiscal.
 * Trazabilidad (INVESTIGACION-SINTESIS.md): socio fiscal (§3.1, §4.2, §5.2 de la investigación) — exige trazabilidad, fuentes y validación humana; intake guiado, criterios, alertas y resumen de caso.
 */
const avatar = avatarPorId('fiscal')

export default function LayoutAvatarFiscal({
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
