'use client'

// Semáforo de disponibilidad inmediata: SIEMPRE derivado del motor de slots
// (jamás un campo almacenado que pueda mentir).

import { useMemo } from 'react'
import type { Asesor } from './types'
import { ETIQUETA_SEMAFORO, semaforoDisponibilidad, type Semaforo } from './slots'
import { useAgendaStore } from './store'

const PUNTO: Record<Semaforo, string> = {
  inmediata: 'bg-success',
  proximos_dias: 'bg-warning',
  sin_agenda: 'bg-danger',
}

export function useSemaforo(asesor: Asesor): Semaforo {
  const disponibilidad = useAgendaStore((s) => s.disponibilidad)
  const excepciones = useAgendaStore((s) => s.excepciones)
  const citas = useAgendaStore((s) => s.citas)
  return useMemo(() => {
    const reglas = disponibilidad.find((d) => d.asesorId === asesor.id)?.reglas ?? []
    return semaforoDisponibilidad({
      zonaHorariaAsesor: asesor.zonaHoraria,
      reglas,
      excepciones: excepciones.filter((e) => e.asesorId === asesor.id),
      citasOcupadas: citas
        .filter((c) => c.asesorId === asesor.id && ['solicitada', 'aprobada', 'confirmada', 'en_curso'].includes(c.estado))
        .map((c) => ({ inicio: c.inicio, fin: c.fin })),
      duracionMin: asesor.duracionDefaultMin,
      bufferMin: asesor.bufferMin,
      ahora: new Date().toISOString(),
    })
  }, [asesor, disponibilidad, excepciones, citas])
}

export function SemaforoDisponibilidad({ asesor }: { asesor: Asesor }) {
  const semaforo = useSemaforo(asesor)
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-secondary" data-testid="semaforo-disponibilidad" data-semaforo={semaforo}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${PUNTO[semaforo]}`} />
      {ETIQUETA_SEMAFORO[semaforo]}
    </span>
  )
}
