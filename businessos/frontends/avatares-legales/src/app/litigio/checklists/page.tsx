import { SectionHeader } from '@/shared/components/ui'
import { TrialChecklists } from '@/features/litigio/components/trial-checklists'
import { getTrialChecklists } from '@/features/litigio/services'

export default async function VistaChecklists() {
  const checklists = await getTrialChecklists()
  return (
    <section>
      <SectionHeader
        titulo="Checklists por juicio"
        descripcion="Plantillas operativas por tipo de juicio instanciadas en cada caso: tareas obligatorias, estado de cumplimiento y responsables."
      />
      <TrialChecklists checklists={checklists} />
    </section>
  )
}
