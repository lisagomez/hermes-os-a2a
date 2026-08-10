import { SectionHeader } from '@/shared/components/ui'
import { RegulatoryAlertsTimeline } from '@/features/fiscal/components/regulatory-alerts-timeline'
import { getRegulatoryAlerts } from '@/features/fiscal/services'

export default async function VistaAlertasRegulatorias() {
  const alertas = await getRegulatoryAlerts()
  return (
    <section>
      <SectionHeader
        titulo="Alertas regulatorias"
        descripcion="Vigilancia del grafo sobre DOF, SAT, RMF y jurisprudencia, cruzada contra la cartera del despacho."
      />
      <RegulatoryAlertsTimeline alertas={alertas} />
    </section>
  )
}
