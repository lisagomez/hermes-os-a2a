'use client'

import { useState } from 'react'
import { PillToggle } from '@/shared/components/ui'
import { ActividadFeed } from './ActividadFeed'
import { ConversacionesPanel } from './ConversacionesPanel'
import { EmbudoCanvas } from './EmbudoCanvas'
import { LeadsTable } from './LeadsTable'
import { TableroLeads } from './TableroLeads'
import type { CrmVista } from './types'

/**
 * Workspace CRM con dos vistas sobre los MISMOS datos:
 *  - Tablero (default): kanban por etapa con drag & drop + feed de actividad
 *    (la experiencia operativa: humanos arrastran, los agentes aparecen 🤖).
 *  - Detalle: embudo (silueta), conversaciones CRM y tabla con select+Mover —
 *    el fallback accesible/móvil y la vista de lectura rápida.
 * El toggle es estado local: la URL sigue siendo /crm (una sola entrada de nav).
 */

type Vista = 'tablero' | 'detalle'

export function CrmWorkspace({
  vista,
  accionMover,
}: {
  vista: CrmVista
  accionMover: (formData: FormData) => Promise<void>
}) {
  const [modo, setModo] = useState<Vista>('tablero')
  const { embudo, perdidos, conversaciones, leads, movimientos } = vista

  return (
    <div className="space-y-4">
      <PillToggle<Vista>
        etiqueta="Vista del CRM"
        className="w-fit"
        claseBoton="px-3 py-1 text-[12px]"
        opciones={[
          { id: 'tablero', contenido: 'Tablero', testid: 'crm-vista-tablero' },
          { id: 'detalle', contenido: 'Embudo y tabla', testid: 'crm-vista-detalle' },
        ]}
        valor={modo}
        onCambio={setModo}
      />

      {modo === 'tablero' ? (
        <div className="space-y-4">
          <TableroLeads leads={leads} movimientos={movimientos} accionMover={accionMover} />
          <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
            <ActividadFeed movimientos={movimientos} leads={leads} />
            <ConversacionesPanel conversaciones={conversaciones} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <EmbudoCanvas embudo={embudo} perdidos={perdidos} />
            </div>
            <ConversacionesPanel conversaciones={conversaciones} />
          </div>
          <div>
            <h2 className="text-[13px] font-semibold text-ink">Leads</h2>
            <p className="mt-0.5 mb-3 text-[12px] text-ink-secondary">
              Últimos 50. Mover un lead de etapa (aquí o en el tablero) queda auditado en Actividad.
            </p>
            <LeadsTable leads={leads} accionMover={accionMover} />
          </div>
        </div>
      )}
    </div>
  )
}
