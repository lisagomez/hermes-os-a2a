import { SectionHeader } from '@/shared/components/ui'
import { StrategicClientsTable } from '@/features/direccion/components/strategic-clients-table'
import { getStrategicClients } from '@/features/direccion/services'

export default async function VistaClientesEstrategicos() {
  const clientes = await getStrategicClients()
  return (
    <section>
      <SectionHeader
        titulo="Clientes estratégicos"
        descripcion="Cuentas clave: servicios activos por práctica, riesgo y oportunidades de venta cruzada detectadas."
      />
      <StrategicClientsTable clientes={clientes} />
    </section>
  )
}
