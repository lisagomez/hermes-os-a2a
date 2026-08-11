import type { ReactNode } from 'react'
import { avatarPorId } from '@/features/shell/avatares'
import { TabsNav } from '@/features/shell/components/tabs-nav'

/**
 * Segmento del Avatar de Litigio.
 * Trazabilidad (INVESTIGACION-SINTESIS.md): coordinador de litigio (§3.2, §4.3) — perder un plazo es catastrófico; pipeline único, agenda, checklists y comunicación con clientes.
 */
const avatar = avatarPorId('litigio')

export default function LayoutAvatardeLitigio({
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
