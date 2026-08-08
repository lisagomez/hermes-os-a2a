import Link from 'next/link'
import { ArrowRight, Funnel } from 'lucide-react'
import { Card } from '@/shared/components/ui'
import { crmDisponible, obtenerEmbudo } from './data'
import type { EtapaEmbudo } from './types'

/**
 * Card resumen del CRM para Inicio: una sola lectura (v_embudo_leads) con
 * KPIs compactos + link al workspace. Server component; si Supabase no está
 * configurado o no responde, degrada a un estado honesto SIN reventar la
 * home. El try/catch solo captura la CARGA (regla error-boundaries: nada de
 * JSX dentro del try — el render se decide después, con datos planos).
 */

type Resumen =
  | { estado: 'sin-config' }
  | { estado: 'error' }
  | { estado: 'ok'; total: number; perdidos: number; top?: EtapaEmbudo }

async function cargarResumen(): Promise<Resumen> {
  if (!crmDisponible()) return { estado: 'sin-config' }
  try {
    const { embudo, perdidos } = await obtenerEmbudo()
    const total = embudo.reduce((s, e) => s + e.cuenta, 0)
    const top = [...embudo].filter((e) => e.cuenta > 0).sort((a, b) => b.cuenta - a.cuenta)[0]
    return { estado: 'ok', total, perdidos, top }
  } catch {
    return { estado: 'error' }
  }
}

export async function CrmResumenCard() {
  const resumen = await cargarResumen()

  return (
    <Card className="p-4" data-testid="home-crm">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Funnel className="h-4 w-4 text-accent" />
          <h2 className="text-[13px] font-semibold text-ink">CRM</h2>
        </div>
        <Link href="/crm" className="flex items-center gap-1 text-[12px] font-medium text-accent hover:underline">
          Abrir <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {resumen.estado === 'sin-config' ? (
        <p className="text-[12px] text-ink-secondary">
          Supabase no configurado en este entorno — el workspace lo explica.
        </p>
      ) : resumen.estado === 'error' ? (
        <p className="text-[12px] text-ink-secondary">
          Sin conexión con Supabase en este momento — abre el workspace para el detalle.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">En el embudo</p>
              <p className="mt-0.5 text-xl font-semibold text-ink tabular-nums">{resumen.total}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Perdidos</p>
              <p className={`mt-0.5 text-xl font-semibold tabular-nums ${resumen.perdidos > 0 ? 'text-danger' : 'text-ink'}`}>
                {resumen.perdidos}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[12px] text-ink-secondary">
            {resumen.top ? (
              <>
                Etapa con más leads:{' '}
                <span className="capitalize">{resumen.top.etapa.replace(/_/g, ' ')}</span> ({resumen.top.cuenta})
              </>
            ) : (
              'Sin leads en el embudo todavía.'
            )}
          </p>
        </>
      )}
    </Card>
  )
}
