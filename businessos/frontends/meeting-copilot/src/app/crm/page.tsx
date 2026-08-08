import { Callout, Chip, SectionHeader } from '@/shared/components/ui'
import { CrmWorkspace } from '@/features/crm/CrmWorkspace'
import { moverLeadEtapa } from '@/features/crm/actions'
import { crmDisponible, obtenerCrm } from '@/features/crm/data'
import type { CrmVista } from '@/features/crm/types'

// El CRM es real-source por diseño (fuera del seam mock): cada request lee
// Supabase, nada se hornea en build (Vercel SÍ tiene las env — sin esto
// prerenderizaría datos viejos; el build local sin env fallaría).
export const dynamic = 'force-dynamic'

const DESCRIPCION =
  'Leads por etapa (tabla `leads` — la escriben ventas-a2a / web2 / manual) y conversaciones del CRM conversacional (crm-canales + sup-crm).'

// El try/catch solo captura la CARGA (regla error-boundaries: sin JSX dentro).
type Carga = { estado: 'sin-config' } | { estado: 'error' } | { estado: 'ok'; vista: CrmVista }

async function cargar(): Promise<Carga> {
  if (!crmDisponible()) return { estado: 'sin-config' }
  try {
    return { estado: 'ok', vista: await obtenerCrm() }
  } catch {
    return { estado: 'error' }
  }
}

function Cabecera({ chip }: { chip: React.ReactNode }) {
  return <SectionHeader titulo="CRM · Embudo de cliente" descripcion={DESCRIPCION} acciones={chip} />
}

export default async function CrmPage() {
  const carga = await cargar()

  if (carga.estado === 'sin-config') {
    return (
      <div>
        <Cabecera chip={<Chip tono="warning">sin conexión</Chip>} />
        <Callout tono="warning" titulo="Supabase no configurado" data-testid="crm-sin-config">
          <p className="text-[13px] text-ink-secondary">
            El workspace CRM lee datos reales de Supabase (no tiene modo mock). Define{' '}
            <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> (y la URL del proyecto) en el
            entorno del servidor para activarlo.
          </p>
        </Callout>
      </div>
    )
  }

  if (carga.estado === 'error') {
    return (
      <div>
        <Cabecera chip={<Chip tono="danger">sin conexión</Chip>} />
        <Callout tono="danger" titulo="Supabase no respondió">
          <p className="text-[13px] text-ink-secondary">
            No se pudieron leer los leads en este momento. Reintenta recargando; si persiste, revisa el
            estado del proyecto Supabase.
          </p>
        </Callout>
      </div>
    )
  }

  return (
    <div>
      <Cabecera chip={<Chip tono="success">datos: supabase</Chip>} />
      <CrmWorkspace vista={carga.vista} accionMover={moverLeadEtapa} />
    </div>
  )
}
