'use client'

import { ActividadFeed } from './ActividadFeed'
import { ConversacionesPanel } from './ConversacionesPanel'
import { TableroLeads } from './TableroLeads'
import type { CrmVista } from './types'

/**
 * Workspace CRM: el TABLERO kanban es la única vista (decisión de Elisa
 * 2026-08-08: la pestaña "Embudo y tabla" se retiró; mover con select vive
 * solo en la historia de git). Debajo, el feed de Actividad (👤/🤖) y el
 * resumen de conversaciones CRM.
 */
export function CrmWorkspace({
  vista,
  accionMover,
}: {
  vista: CrmVista
  accionMover: (formData: FormData) => Promise<void>
}) {
  const { conversaciones, leads, movimientos } = vista

  return (
    <div className="space-y-4">
      <TableroLeads leads={leads} movimientos={movimientos} accionMover={accionMover} />
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <ActividadFeed movimientos={movimientos} leads={leads} />
        <ConversacionesPanel conversaciones={conversaciones} />
      </div>
    </div>
  )
}
