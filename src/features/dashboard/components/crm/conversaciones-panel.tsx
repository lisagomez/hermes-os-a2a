import { Card } from '@/shared/components/card'
import type { ConversacionResumen } from '../../types'
import { CHROME, STATUS } from '../ai-spend/colors'

/**
 * Resumen de conversaciones del CRM conversacional (crm-canales + sup-crm):
 * conteo por estado (abierta/escalada/cerrada) con desglose por nivel de
 * autonomía (A0..A3). Empty state honesto mientras no haya tenant real
 * conectado. Componente puro (testeable sin navegador).
 */

const COLOR_ESTADO: Record<string, string> = {
  abierta: '#3987e5',
  escalada: STATUS.warning,
  cerrada: CHROME.muted,
}

export function ConversacionesPanel({
  conversaciones,
}: {
  conversaciones: ConversacionResumen[]
}) {
  if (conversaciones.length === 0) {
    return (
      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Conversaciones CRM
        </h2>
        <p className="mt-3 text-sm text-slate-300">Sin conversaciones todavía.</p>
        <p className="mt-1 text-xs text-slate-500">
          Aparecerán cuando un tenant real conecte su canal (Telegram / WhatsApp)
          a crm-canales.
        </p>
      </Card>
    )
  }

  const porEstado = new Map<string, number>()
  for (const c of conversaciones) {
    porEstado.set(c.estado, (porEstado.get(c.estado) ?? 0) + c.cuenta)
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Conversaciones CRM
      </h2>
      <ul className="mt-3 space-y-2">
        {[...porEstado.entries()].map(([estado, cuenta]) => {
          const color = COLOR_ESTADO[estado] ?? CHROME.muted
          return (
            <li key={estado} className="flex items-center justify-between text-sm">
              <span className="capitalize" style={{ color }}>
                {estado}
              </span>
              <span className="font-bold tabular-nums text-slate-200">{cuenta}</span>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-500">
        Por nivel:{' '}
        {conversaciones
          .map((c) => `${c.estado} ${c.nivel}: ${c.cuenta}`)
          .join(' · ')}
      </p>
    </Card>
  )
}
