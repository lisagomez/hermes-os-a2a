import { getDataSource } from '@/features/dashboard/services'
import { PRESUPUESTO_MENSUAL_USD } from '@/features/dashboard/types'

export const dynamic = 'force-dynamic'

export default async function AiSpendPage() {
  const spend = await getDataSource().aiSpend()
  const total = spend.porVertical.find((v) => v.vertical === 'TOTAL')?.costo_usd ?? 0
  return (
    <div>
      <h1 className="text-2xl font-bold">AI Spend</h1>
      <p className="mt-1 text-sm text-slate-400">
        Gasto de {spend.mes}: ${total.toFixed(2)} de ${PRESUPUESTO_MENSUAL_USD} presupuestados.
        (Vista completa en Fase 2.)
      </p>
    </div>
  )
}
