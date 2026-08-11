import type { RiskLevel } from '@/shared/types'

/**
 * Cuadrícula mensual propia (sin librería de calendario — fuera de alcance).
 * Determinista: recibe año/mes por props; jamás consulta "hoy" (eso lo decide
 * el módulo de fixtures, una sola vez, en el servidor).
 *
 * Decisión C4: los eventos van en ficha neutra; solo un evento con `riesgo`
 * declarado pinta el punto de la escala semáforo (riesgo de perder el plazo),
 * nunca "color por tipo de evento".
 */

export type EventoCalendario = {
  id: string
  /** Día del mes (1–31) del mes mostrado. */
  dia: number
  titulo: string
  /** Riesgo asociado al evento (p. ej. plazo procesal crítico). */
  riesgo?: RiskLevel
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const PUNTO_RIESGO: Record<RiskLevel, string> = {
  alto: 'bg-risk-alto',
  medio: 'bg-risk-medio',
  bajo: 'bg-risk-bajo',
}

export function CalendarGrid({
  anio,
  mes,
  eventos,
  diaActual,
}: {
  anio: number
  /** Mes 1–12. */
  mes: number
  eventos: EventoCalendario[]
  /** Día a resaltar como "hoy" (lo aporta el módulo de fixtures). */
  diaActual?: number
}) {
  const diasEnMes = new Date(anio, mes, 0).getDate()
  // getDay(): 0=domingo. Reordenado a semana que empieza en lunes.
  const desplazamiento = (new Date(anio, mes - 1, 1).getDay() + 6) % 7

  const celdas: (number | null)[] = [
    ...Array.from({ length: desplazamiento }, () => null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ]
  while (celdas.length % 7 !== 0) celdas.push(null)

  const eventosPorDia = new Map<number, EventoCalendario[]>()
  for (const evento of eventos) {
    const lista = eventosPorDia.get(evento.dia) ?? []
    lista.push(evento)
    eventosPorDia.set(evento.dia, lista)
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[42rem] rounded-card border border-line bg-surface shadow-1">
        <div className="grid grid-cols-7 border-b border-line bg-surface-muted">
          {DIAS_SEMANA.map((dia) => (
            <div
              key={dia}
              className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-ink-secondary"
            >
              {dia}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {celdas.map((dia, indice) => (
            <div
              key={indice}
              className={`min-h-24 border-b border-e border-line p-1.5 last:border-e-0 ${
                dia === null ? 'bg-surface-muted/40' : ''
              }`}
            >
              {dia !== null ? (
                <>
                  <p
                    className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs tabular-nums ${
                      dia === diaActual
                        ? 'bg-accent font-semibold text-accent-ink'
                        : 'text-ink-secondary'
                    }`}
                  >
                    {dia}
                  </p>
                  <div className="space-y-1">
                    {(eventosPorDia.get(dia) ?? []).map((evento) => (
                      <p
                        key={evento.id}
                        className="flex items-center gap-1.5 truncate rounded-control bg-surface-muted px-1.5 py-0.5 text-[11px] leading-4 text-ink"
                        title={evento.titulo}
                      >
                        {evento.riesgo ? (
                          <span
                            aria-hidden
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${PUNTO_RIESGO[evento.riesgo]}`}
                          />
                        ) : null}
                        <span className="truncate">{evento.titulo}</span>
                      </p>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
