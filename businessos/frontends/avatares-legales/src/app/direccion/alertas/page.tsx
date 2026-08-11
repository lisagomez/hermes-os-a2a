import { SectionHeader } from '@/shared/components/ui'
import { ExecutiveAlertsPanel } from '@/features/direccion/components/executive-alerts-panel'
import { getExecutiveAlerts } from '@/features/direccion/services'

export default async function VistaAlertasEjecutivas() {
  const alertas = await getExecutiveAlerts()
  return (
    <section>
      <SectionHeader
        titulo="Alertas ejecutivas"
        descripcion="Lo que socios y gerencia deben ver hoy: cambios regulatorios de alto impacto, señales operativas e hitos."
      />
      <ExecutiveAlertsPanel alertas={alertas} />
    </section>
  )
}
