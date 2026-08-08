import { BudgetMeter } from '@/features/dashboard/components/ai-spend/budget-meter'
import { DailySeries } from '@/features/dashboard/components/ai-spend/daily-series'
import { ModelTable } from '@/features/dashboard/components/ai-spend/model-table'
import { VerticalBars } from '@/features/dashboard/components/ai-spend/vertical-bars'
import { getDataSource } from '@/features/dashboard/services'
import { Card } from '@/shared/components/card'
import { SectionTitle } from '@/shared/components/section-title'

export const dynamic = 'force-dynamic'

export default async function AiSpendPage() {
  const spend = await getDataSource().aiSpend()
  const total = spend.porVertical.find((v) => v.vertical === 'TOTAL')?.costo_usd ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Spend</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Misma fuente que el skill budget-report: v_presupuesto_mensual + token_usage.
        </p>
      </div>

      <BudgetMeter totalUsd={total} mes={spend.mes} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card as="section">
          <SectionTitle className="mb-4">Costo diario (USD)</SectionTitle>
          <DailySeries datos={spend.serieDiaria} />
        </Card>
        <Card as="section">
          <SectionTitle className="mb-4">Gasto por vertical</SectionTitle>
          <VerticalBars filas={spend.porVertical} />
        </Card>
      </div>

      <Card as="section">
        <SectionTitle className="mb-4">Desglose por modelo</SectionTitle>
        <ModelTable filas={spend.porModelo} />
      </Card>
    </div>
  )
}
