import { BudgetMeter } from '@/features/dashboard/components/ai-spend/budget-meter'
import { DailySeries } from '@/features/dashboard/components/ai-spend/daily-series'
import { ModelTable } from '@/features/dashboard/components/ai-spend/model-table'
import { VerticalBars } from '@/features/dashboard/components/ai-spend/vertical-bars'
import { getDataSource } from '@/features/dashboard/services'

export const dynamic = 'force-dynamic'

export default async function AiSpendPage() {
  const spend = await getDataSource().aiSpend()
  const total = spend.porVertical.find((v) => v.vertical === 'TOTAL')?.costo_usd ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Spend</h1>
        <p className="mt-1 text-sm text-slate-400">
          Misma fuente que el skill budget-report: v_presupuesto_mensual + token_usage.
        </p>
      </div>

      <BudgetMeter totalUsd={total} mes={spend.mes} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-sm font-medium text-slate-400">Costo diario (USD)</h2>
          <DailySeries datos={spend.serieDiaria} />
        </section>
        <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-sm font-medium text-slate-400">Gasto por vertical</h2>
          <VerticalBars filas={spend.porVertical} />
        </section>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-4 text-sm font-medium text-slate-400">Desglose por modelo</h2>
        <ModelTable filas={spend.porModelo} />
      </section>
    </div>
  )
}
