import { SectionHeader } from '@/shared/components/ui'
import { FiscalCaseIntakeForm } from '@/features/fiscal/components/fiscal-case-intake-form'

export default function VistaIntakeFiscal() {
  return (
    <section>
      <SectionHeader
        titulo="Intake guiado"
        descripcion="Captura lo mínimo del asunto en cuatro pasos. Al enviarse, Hermes clasifica materia y riesgo inicial con el grafo regulatorio y asigna el caso."
      />
      <FiscalCaseIntakeForm />
    </section>
  )
}
