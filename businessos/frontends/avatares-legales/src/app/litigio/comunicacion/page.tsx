import { SectionHeader } from '@/shared/components/ui'
import { ClientCommsPanel } from '@/features/litigio/components/client-comms-panel'
import { getClientCommunications } from '@/features/litigio/services'

export default async function VistaComunicacion() {
  const comunicaciones = await getClientCommunications()
  return (
    <section>
      <SectionHeader
        titulo="Comunicación con clientes"
        descripcion="Bitácora de actualizaciones por caso. Los borradores que redacta Hermes quedan marcados como sugeridos y requieren aprobación humana antes de enviarse."
      />
      <ClientCommsPanel comunicaciones={comunicaciones} />
    </section>
  )
}
