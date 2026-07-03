import { getDataSource } from '@/features/dashboard/services'

export const dynamic = 'force-dynamic'

export default async function GrafoPage() {
  const vista = await getDataSource().grafoVista()
  return (
    <div>
      <h1 className="text-2xl font-bold">Grafo</h1>
      <p className="mt-1 text-sm text-slate-400">
        {vista.salud
          ? `${vista.salud.reglas_total} reglas en ${vista.salud.ambitos.length} ámbitos · ${vista.evaluaciones.length} evaluaciones recientes`
          : 'Grafo inalcanzable'}
        {' '}(Vista completa en Fase 3.)
      </p>
    </div>
  )
}
