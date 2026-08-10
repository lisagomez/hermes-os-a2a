import { SectionHeader } from '@/shared/components/ui'
import { FiscalCriteriaPanel } from '@/features/fiscal/components/fiscal-criteria-panel'
import { fetchFiscalCriteria } from '@/features/fiscal/services'

export default async function VistaCriteriosFiscales() {
  const criterios = await fetchFiscalCriteria()
  return (
    <section>
      <SectionHeader
        titulo="Criterios aplicables"
        descripcion="Reglas del grafo regulatorio y criterios internos del despacho, con fuente, nivel de riesgo y estado de validación humana."
      />
      <FiscalCriteriaPanel criterios={criterios} />
    </section>
  )
}
