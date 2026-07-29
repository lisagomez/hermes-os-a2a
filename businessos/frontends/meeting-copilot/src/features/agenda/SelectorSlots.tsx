'use client'

// Grid de horarios del día elegido: SOLO slots realmente libres (los ocupados
// no se muestran). Las horas se proyectan a la TZ del CLIENTE con la zona
// escrita explícita — nunca una hora ambigua.

import { useMemo } from 'react'
import { CalendarX2 } from 'lucide-react'
import { EmptyState } from '@/shared/components/ui'
import { etiquetaTz, fmtHoraEnTz } from './slots'
import { slotsDeAsesor } from './pipeline'
import { useAgendaStore } from './store'

export function SelectorSlots({
  asesorId,
  fecha,
  duracionMin,
  ahora,
  zonaHorariaCliente,
  onElegir,
  excluirCitaId,
}: {
  asesorId: string
  fecha: string
  duracionMin: number
  ahora: string
  zonaHorariaCliente: string
  onElegir: (inicioIso: string) => void
  excluirCitaId?: string
}) {
  const citas = useAgendaStore((s) => s.citas)

  const libres = useMemo(() => {
    void citas
    return slotsDeAsesor({ asesorId, fecha, ahora, duracionMin, excluirCitaId }).filter((s) => s.disponible)
  }, [asesorId, fecha, ahora, duracionMin, excluirCitaId, citas])

  if (libres.length === 0) {
    return (
      <EmptyState
        icono={CalendarX2}
        titulo="Sin horarios este día"
        descripcion="Todos los espacios están tomados o bloqueados. Prueba otro día de la tira de fechas."
      />
    )
  }

  return (
    <div>
      <p className="mb-2 text-[12px] text-ink-secondary">
        Horas en tu zona: <span className="font-medium text-ink">{etiquetaTz(zonaHorariaCliente, libres[0].inicio)}</span>
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" data-testid="reserva-slots">
        {libres.map((s) => (
          <button
            key={s.inicio}
            type="button"
            onClick={() => onElegir(s.inicio)}
            data-testid="reserva-slot"
            className="rounded-s border border-line bg-surface px-2 py-2 text-[13px] font-medium text-ink transition-colors hover:border-accent hover:bg-accent-muted hover:text-accent"
          >
            {fmtHoraEnTz(s.inicio, zonaHorariaCliente)}
          </button>
        ))}
      </div>
    </div>
  )
}
