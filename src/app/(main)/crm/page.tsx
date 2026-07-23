import { ConversacionesPanel } from '@/features/dashboard/components/crm/conversaciones-panel'
import { EmbudoCanvas } from '@/features/dashboard/components/crm/embudo-canvas'
import { getDataSource } from '@/features/dashboard/services'

export const dynamic = 'force-dynamic'

export default async function CrmPage() {
  const { embudo, perdidos, conversaciones } = await getDataSource().crm()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CRM · Embudo de cliente</h1>
        <p className="mt-1 text-sm text-slate-400">
          Departamento adquisición: leads por etapa (tabla{' '}
          <code className="text-slate-500">leads</code>, la escriben ventas-a2a /
          web2 / manual) y conversaciones del CRM conversacional
          (crm-canales + sup-crm). Solo lectura.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EmbudoCanvas embudo={embudo} perdidos={perdidos} />
        </div>
        <ConversacionesPanel conversaciones={conversaciones} />
      </div>
    </div>
  )
}
