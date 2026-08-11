import { CheckCircle2, Circle, CircleDot } from 'lucide-react'
import { Card, Chip, ProgressBar } from '@/shared/components/ui'
import type { ChecklistCaso, EstadoTarea } from '@/features/litigio/types'

/**
 * TrialChecklists — checklists operativas por tipo de juicio.
 * Dolor que ataca (INVESTIGACION-SINTESIS.md §2): tareas obligatorias sin
 * estado visible ni responsable. Los estados son de FLUJO (iconos + texto,
 * decisión C4): nada de semáforo aquí.
 */

const ICONO_ESTADO: Record<
  EstadoTarea,
  { Icono: typeof CheckCircle2; clase: string; etiqueta: string }
> = {
  completada: { Icono: CheckCircle2, clase: 'text-accent', etiqueta: 'Completada' },
  en_curso: { Icono: CircleDot, clase: 'text-ink-secondary', etiqueta: 'En curso' },
  pendiente: { Icono: Circle, clase: 'text-ink-muted', etiqueta: 'Pendiente' },
}

function ChecklistCard({ checklist }: { checklist: ChecklistCaso }) {
  const completadas = checklist.tareas.filter(
    (tarea) => tarea.estado === 'completada',
  ).length
  const avance = Math.round((completadas / checklist.tareas.length) * 100)

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <Chip tono="acento">{checklist.plantilla}</Chip>
        <Chip>{checklist.practica}</Chip>
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold text-ink">
        {checklist.cliente}
      </h3>
      <p className="font-mono text-xs text-ink-muted">{checklist.casoId}</p>

      <div className="mt-4">
        <ProgressBar
          valor={avance}
          etiqueta={`${completadas} de ${checklist.tareas.length} tareas`}
        />
      </div>

      <ul className="mt-4 space-y-2.5">
        {checklist.tareas.map((tarea) => {
          const { Icono, clase, etiqueta } = ICONO_ESTADO[tarea.estado]
          return (
            <li key={tarea.id} className="flex items-start gap-2.5">
              <Icono
                size={16}
                strokeWidth={1.75}
                aria-hidden
                className={`mt-0.5 shrink-0 ${clase}`}
              />
              <span className="min-w-0 text-sm">
                <span
                  className={`${
                    tarea.estado === 'completada'
                      ? 'text-ink-muted line-through'
                      : 'text-ink'
                  }`}
                >
                  {tarea.tarea}
                </span>
                {tarea.obligatoria ? (
                  <span
                    className="ml-1 font-semibold text-ink-secondary"
                    title="Tarea obligatoria"
                  >
                    *
                  </span>
                ) : null}
                <span className="block text-xs text-ink-muted">
                  {etiqueta} · {tarea.responsable}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-[11px] text-ink-muted">* obligatoria para la etapa</p>
    </Card>
  )
}

export function TrialChecklists({ checklists }: { checklists: ChecklistCaso[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {checklists.map((checklist) => (
        <ChecklistCard key={checklist.id} checklist={checklist} />
      ))}
    </div>
  )
}
