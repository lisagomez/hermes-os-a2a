import { Card, Chip } from '@/shared/components/ui'
import type { ConversacionResumen } from './types'

/**
 * Resumen de conversaciones del CRM conversacional (crm-canales + sup-crm):
 * conteo por estado (abierta/escalada/cerrada) con desglose por canal y por
 * nivel de autonomía (A0..A3). Empty state honesto mientras no haya tenant
 * real conectado. Componente puro (testeable sin navegador).
 */

const TONO_ESTADO: Record<string, 'info' | 'warning' | 'neutral'> = {
  abierta: 'info',
  escalada: 'warning',
  cerrada: 'neutral',
}

export function ConversacionesPanel({
  conversaciones,
}: {
  conversaciones: ConversacionResumen[]
}) {
  if (conversaciones.length === 0) {
    return (
      <Card className="p-4">
        <h2 className="text-[13px] font-semibold text-ink">Conversaciones CRM</h2>
        <p className="mt-3 text-[13px] text-ink">Sin conversaciones todavía.</p>
        <p className="mt-1 text-[12px] text-ink-secondary">
          Aparecerán cuando un tenant real conecte su canal (Telegram / WhatsApp)
          a crm-canales.
        </p>
      </Card>
    )
  }

  const porEstado = new Map<string, number>()
  const porCanal = new Map<string, number>()
  for (const c of conversaciones) {
    porEstado.set(c.estado, (porEstado.get(c.estado) ?? 0) + c.cuenta)
    porCanal.set(c.canal, (porCanal.get(c.canal) ?? 0) + c.cuenta)
  }

  return (
    <Card className="p-4" data-testid="crm-conversaciones">
      <h2 className="text-[13px] font-semibold text-ink">Conversaciones CRM</h2>
      <ul className="mt-3 space-y-2">
        {[...porEstado.entries()].map(([estado, cuenta]) => (
          <li key={estado} className="flex items-center justify-between">
            <Chip tono={TONO_ESTADO[estado] ?? 'neutral'}>
              <span className="capitalize">{estado}</span>
            </Chip>
            <span className="text-[13px] font-semibold tabular-nums text-ink">{cuenta}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-line pt-3 text-[12px] text-ink-muted">
        Por canal:{' '}
        {[...porCanal.entries()].map(([canal, cuenta]) => `${canal}: ${cuenta}`).join(' · ')}
      </p>
      <p className="mt-1 text-[12px] text-ink-muted">
        Por nivel:{' '}
        {conversaciones.map((c) => `${c.estado} ${c.nivel}: ${c.cuenta}`).join(' · ')}
      </p>
    </Card>
  )
}
