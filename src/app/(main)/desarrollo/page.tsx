import { TareasTable } from '@/features/dashboard/components/desarrollo/tareas-table'
import { getDataSource } from '@/features/dashboard/services'

export const dynamic = 'force-dynamic'

export default async function DesarrolloPage() {
  const tareas = await getDataSource().desarrollo()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Desarrollo</h1>
        <p className="mt-1 text-sm text-slate-400">
          Tareas del trío (Ejecutor + Supervisor): últimas 20 desde la tabla{' '}
          <code className="text-slate-500">tareas</code>. La escribe el trío con
          service_role; aquí solo se observa.
        </p>
      </div>

      <TareasTable tareas={tareas} />
    </div>
  )
}
