import { Card } from '@/shared/components/card'
import type { Tarea } from '../../types'
import { EstadoTareaBadge } from './estado-tarea-badge'

/**
 * Lista de tareas del trío. Columnas: task_id, objetivo, estado, intentos, fecha.
 * Si no hay tareas, muestra un empty state claro (nunca una tabla vacía/rota).
 * La fecha se formatea determinista (slice del ISO) para evitar hydration drift.
 */
export function TareasTable({ tareas }: { tareas: Tarea[] }) {
  if (tareas.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm font-medium text-slate-300">Sin tareas todavía</p>
        <p className="mt-1 text-xs text-slate-500">
          Cuando el Coordinador o el host despachen una tarea al trío, aparecerá aquí.
        </p>
      </Card>
    )
  }

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pl-4 pr-2 font-medium">Task</th>
            <th className="py-2 px-2 font-medium">Objetivo</th>
            <th className="py-2 px-2 font-medium">Estado</th>
            <th className="py-2 px-2 text-right font-medium">Intentos</th>
            <th className="py-2 pl-2 pr-4 font-medium">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {tareas.map((t) => (
            <tr key={t.task_id} className="border-b border-slate-800/60 last:border-0">
              <td className="py-2 pl-4 pr-2 align-top">
                <code className="text-xs text-slate-400">{t.task_id}</code>
              </td>
              <td className="py-2 px-2 align-top text-slate-200">{t.objetivo}</td>
              <td className="py-2 px-2 align-top">
                <EstadoTareaBadge estado={t.estado} />
              </td>
              <td className="py-2 px-2 align-top text-right tabular-nums text-slate-400">
                {t.intentos}
              </td>
              <td className="py-2 pl-2 pr-4 align-top text-slate-500">
                <time>{t.created_at.slice(0, 16).replace('T', ' ')}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
