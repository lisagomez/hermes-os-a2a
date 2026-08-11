import { SectionHeader } from '@/shared/components/ui'
import { LitigationPipelineBoard } from '@/features/litigio/components/litigation-pipeline-board'
import { getLitigationCases } from '@/features/litigio/services'

export default async function VistaPipelineCasos() {
  const casos = await getLitigationCases()
  return (
    <section>
      <SectionHeader
        titulo="Pipeline de casos"
        descripcion="Todos los asuntos en una sola vista por etapa de litigio, con filtros por práctica y abogado."
      />
      <LitigationPipelineBoard casos={casos} />
    </section>
  )
}
