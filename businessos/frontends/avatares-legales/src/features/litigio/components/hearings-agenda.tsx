'use client'

import { useState } from 'react'
import { Card, Chip, RiskBadge } from '@/shared/components/ui'
import {
  CalendarGrid,
  type EventoCalendario,
} from '@/shared/components/calendar-grid'
import type { AgendaMes, TipoEventoAgenda } from '@/features/litigio/types'

/**
 * HearingsAgenda — agenda de audiencias y plazos del mes.
 * Dolor que ataca (INVESTIGACION-SINTESIS.md §2): un error de calendario es
 * catastrófico. Cuadrícula mensual + cinta de próximos plazos, con filtro por
 * abogado.
 *
 * Decisión C4: el TIPO de evento se distingue con texto (ficha), no con
 * color; el punto de color solo marca el RIESGO de perder el plazo.
 */

const ETIQUETA_TIPO: Record<TipoEventoAgenda, string> = {
  audiencia: 'Audiencia',
  vencimiento: 'Vencimiento',
  promocion: 'Promoción',
}

export function HearingsAgenda({ agenda }: { agenda: AgendaMes }) {
  const [abogado, setAbogado] = useState<string>('todos')

  const abogados = [...new Set(agenda.eventos.map((e) => e.abogado))].sort()
  const filtrados = agenda.eventos.filter(
    (evento) => abogado === 'todos' || evento.abogado === abogado,
  )

  const eventosCalendario: EventoCalendario[] = filtrados.map((evento) => ({
    id: evento.id,
    dia: evento.dia,
    titulo: `${evento.hora} ${ETIQUETA_TIPO[evento.tipo]} · ${evento.cliente}`,
    riesgo: evento.riesgo,
  }))

  const proximos = filtrados
    .filter((evento) => evento.dia >= agenda.diaActual)
    .sort((a, b) => a.dia - b.dia)
    .slice(0, 6)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-lg font-semibold capitalize text-ink">
          {agenda.nombreMes}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="agenda-abogado" className="text-sm text-ink-muted">
            Abogado
          </label>
          <select
            id="agenda-abogado"
            className="rounded-control border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
            value={abogado}
            onChange={(e) => setAbogado(e.target.value)}
          >
            <option value="todos">Todos</option>
            {abogados.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_20rem]">
        <CalendarGrid
          anio={agenda.anio}
          mes={agenda.mes}
          eventos={eventosCalendario}
          diaActual={agenda.diaActual}
        />

        <Card>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Próximos plazos del mes
          </h3>
          <ol className="mt-3 space-y-3">
            {proximos.length === 0 ? (
              <li className="text-sm text-ink-muted">
                Sin plazos próximos con este filtro.
              </li>
            ) : (
              proximos.map((evento, indice) => (
                <li key={evento.id} className="flex items-start gap-3">
                  <span
                    className={`w-16 shrink-0 text-right font-mono text-sm tabular-nums ${
                      indice === 0 ? 'font-semibold text-ink' : 'text-ink-secondary'
                    }`}
                  >
                    día {evento.dia}
                    <span className="block text-xs text-ink-muted">
                      {evento.hora}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Chip>{ETIQUETA_TIPO[evento.tipo]}</Chip>
                      {evento.riesgo ? <RiskBadge nivel={evento.riesgo} /> : null}
                    </span>
                    <span
                      className={`mt-1 block text-sm leading-snug ${
                        indice === 0 ? 'font-semibold text-ink' : 'text-ink-secondary'
                      }`}
                    >
                      {evento.titulo}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      {evento.abogado} · {evento.casoId}
                    </span>
                  </span>
                </li>
              ))
            )}
          </ol>
        </Card>
      </div>
    </div>
  )
}
