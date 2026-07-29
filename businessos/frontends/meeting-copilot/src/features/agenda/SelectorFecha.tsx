'use client'

// Tira horizontal de 14 días (scroll-x en móvil, patrón booking de Calendly).
// Cada día declara si tiene slots libres — el cliente nunca pica a ciegas.

import { useMemo } from 'react'
import { fechaEnTz, sumarDias } from './slots'
import { slotsDeAsesor } from './pipeline'
import { useAgendaStore } from './store'

function etiquetaDia(fecha: string): { dia: string; num: string } {
  const d = new Date(`${fecha}T12:00:00Z`)
  return {
    dia: d.toLocaleDateString('es-MX', { weekday: 'short', timeZone: 'UTC' }),
    num: d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
  }
}

export function SelectorFecha({
  asesorId,
  zonaHorariaAsesor,
  duracionMin,
  ahora,
  seleccionada,
  onSeleccion,
  excluirCitaId,
}: {
  asesorId: string
  zonaHorariaAsesor: string
  duracionMin: number
  ahora: string
  seleccionada: string | null
  onSeleccion: (fecha: string) => void
  excluirCitaId?: string
}) {
  // Suscripción reactiva: si otra vista toma un slot, la tira se recalcula.
  const citas = useAgendaStore((s) => s.citas)
  const disponibilidad = useAgendaStore((s) => s.disponibilidad)
  const excepciones = useAgendaStore((s) => s.excepciones)

  const dias = useMemo(() => {
    // Las suscripciones de arriba solo invalidan el memo (slotsDeAsesor lee el store).
    void citas
    void disponibilidad
    void excepciones
    const hoy = fechaEnTz(ahora, zonaHorariaAsesor)
    return Array.from({ length: 14 }, (_, i) => {
      const fecha = sumarDias(hoy, i)
      const libres = slotsDeAsesor({ asesorId, fecha, ahora, duracionMin, excluirCitaId }).filter((s) => s.disponible)
      return { fecha, libres: libres.length }
    })
  }, [asesorId, zonaHorariaAsesor, duracionMin, ahora, excluirCitaId, citas, disponibilidad, excepciones])

  return (
    <div className="flex gap-2 overflow-x-auto pb-2" data-testid="reserva-selector-fecha">
      {dias.map(({ fecha, libres }) => {
        const activa = seleccionada === fecha
        const { dia, num } = etiquetaDia(fecha)
        return (
          <button
            key={fecha}
            type="button"
            onClick={() => onSeleccion(fecha)}
            disabled={libres === 0}
            data-testid={`fecha-${fecha}`}
            className={`flex min-w-[4.2rem] shrink-0 flex-col items-center gap-0.5 rounded-s border px-2 py-2 transition-colors ${
              activa
                ? 'border-accent bg-accent-muted text-accent'
                : libres === 0
                  ? 'cursor-not-allowed border-line-subtle text-ink-muted opacity-50'
                  : 'border-line bg-surface text-ink-secondary hover:bg-surface-muted'
            }`}
          >
            <span className="text-[11px] font-medium uppercase">{dia}</span>
            <span className="text-[13px] font-semibold">{num}</span>
            <span className={`h-1.5 w-1.5 rounded-full ${libres > 0 ? 'bg-success' : 'bg-line'}`} />
          </button>
        )
      })}
    </div>
  )
}
