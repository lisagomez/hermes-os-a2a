import { EvaluacionCard } from '@/features/dashboard/components/grafo/evaluacion-card'
import {
  CobrosPanel,
  ContratosPanel,
  FacturasPanel,
} from '@/features/dashboard/components/grafo/operacion-panel'
import { SaludPanel } from '@/features/dashboard/components/grafo/salud-panel'
import { getDataSource } from '@/features/dashboard/services'
import { SectionTitle } from '@/shared/components/section-title'

export const dynamic = 'force-dynamic'

export default async function GrafoPage() {
  const vista = await getDataSource().grafoVista()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Grafo</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Cerebro regulatorio: señala riesgos con fuente citada; no asesora.
        </p>
      </div>

      <SaludPanel salud={vista.salud} />

      <div className="grid gap-6 lg:grid-cols-3">
        <FacturasPanel facturas={vista.facturas} />
        <ContratosPanel contratos={vista.contratos} />
        <CobrosPanel cobros={vista.cobros} />
      </div>

      <section>
        <SectionTitle className="mb-3">
          Evaluaciones recientes ({vista.evaluaciones.length})
        </SectionTitle>
        {vista.evaluaciones.length === 0 ? (
          <p className="text-sm text-ink-muted">Sin evaluaciones persistidas todavía.</p>
        ) : (
          <div className="space-y-4">
            {vista.evaluaciones.map((e) => (
              <EvaluacionCard key={e.id} evaluacion={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
