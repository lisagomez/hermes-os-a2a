import { SectionHeader } from '@/shared/components/ui'
import { HearingsAgenda } from '@/features/litigio/components/hearings-agenda'
import { getHearingsAgenda } from '@/features/litigio/services'

export default async function VistaAgendaPlazos() {
  const agenda = await getHearingsAgenda()
  return (
    <section>
      <SectionHeader
        titulo="Agenda y plazos"
        descripcion="Audiencias, vencimientos y promociones del mes en una cuadrícula única. El punto de color marca el riesgo de perder el plazo."
      />
      <HearingsAgenda agenda={agenda} />
    </section>
  )
}
