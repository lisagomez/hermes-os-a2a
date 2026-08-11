import { SectionHeader } from '@/shared/components/ui'
import { VersionApprovalsTimeline } from '@/features/contratos/components/version-approvals-timeline'
import { getContractVersions } from '@/features/contratos/services'

export default async function VistaVersiones() {
  const historiales = await getContractVersions()
  return (
    <section>
      <SectionHeader
        titulo="Versiones y aprobaciones"
        descripcion="Historial por contrato: qué cambió en cada versión, en qué estado quedó y quién aprobó qué, con fecha."
      />
      <VersionApprovalsTimeline historiales={historiales} />
    </section>
  )
}
