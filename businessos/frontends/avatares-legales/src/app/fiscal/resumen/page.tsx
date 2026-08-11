import { SectionHeader } from '@/shared/components/ui'
import { FiscalCaseSummary } from '@/features/fiscal/components/fiscal-case-summary'
import { getFiscalCases } from '@/features/fiscal/services'

export default async function VistaResumenCaso() {
  const casos = await getFiscalCases()
  return (
    <section>
      <SectionHeader
        titulo="Resumen de cartera"
        descripcion="Riesgos detectados, próximos vencimientos, tareas abiertas y notas de socios en una sola vista."
      />
      <FiscalCaseSummary casos={casos} />
    </section>
  )
}
