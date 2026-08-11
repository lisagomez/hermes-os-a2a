import { SectionHeader } from '@/shared/components/ui'
import { FirmOverview360 } from '@/features/direccion/components/firm-overview-360'
import { getFirmOverview } from '@/features/direccion/services'

export default async function VistaPanorama360() {
  const panorama = await getFirmOverview()
  return (
    <section>
      <SectionHeader
        titulo="Panorama 360"
        descripcion="Métricas transversales del despacho: ingresos, casos, riesgo agregado y utilización por práctica."
      />
      <FirmOverview360 panorama={panorama} />
    </section>
  )
}
