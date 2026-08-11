import { SectionHeader } from '@/shared/components/ui'
import { ClauseReviewPanel } from '@/features/contratos/components/clause-review-panel'
import { RegulatoryRiskPanel } from '@/features/contratos/components/regulatory-risk-panel'
import {
  fetchContractRegulatoryRisks,
  fetchSuggestedClauses,
  getContractOperations,
} from '@/features/contratos/services'

const CONTRATO_EN_REVISION = 'CON-2026-0001'

export default async function VistaClausulas() {
  const [operaciones, clausulas, riesgos] = await Promise.all([
    getContractOperations(),
    fetchSuggestedClauses(CONTRATO_EN_REVISION),
    fetchContractRegulatoryRisks(CONTRATO_EN_REVISION),
  ])
  const operacion = operaciones.find((op) => op.id === CONTRATO_EN_REVISION)

  return (
    <section>
      <SectionHeader
        titulo="Revisión de cláusulas"
        descripcion={`${operacion?.nombre ?? ''} — cada cláusula llega con texto propuesto, riesgo con motivo y fuente. El abogado acepta, edita o descarta; nada se incorpora sin decisión humana.`}
      />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_24rem]">
        <ClauseReviewPanel clausulas={clausulas} />
        <RegulatoryRiskPanel riesgos={riesgos} />
      </div>
    </section>
  )
}
