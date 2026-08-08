'use client'

import { Card } from '@/shared/components/ui'
import { actorInfo, ICONO_ACTOR } from './actores'
import type { LeadResumen, Movimiento } from './types'
import { fmtFecha } from '@/shared/lib/format'

/**
 * Rastro del canal auditado: quién movió qué lead (👤 equipo / 🤖 agente),
 * de dónde a dónde y por qué. Es la mitad agéntica de la experiencia — los
 * movimientos automáticos del calificador aparecen aquí con su motivo, al
 * mismo nivel que los del equipo (nada se mueve sin dejar huella).
 */
export function ActividadFeed({ movimientos, leads }: { movimientos: Movimiento[]; leads: LeadResumen[] }) {
  const nombre = (leadId: string) => {
    const l = leads.find((x) => x.lead_id === leadId)
    return l?.empresa || l?.contacto || leadId
  }
  return (
    <Card className="p-4" data-testid="crm-actividad">
      <h2 className="text-[13px] font-semibold text-ink">Actividad del pipeline</h2>
      {movimientos.length === 0 ? (
        <p className="mt-3 text-[12px] text-ink-secondary">
          Sin movimientos todavía — cada cambio de etapa (del equipo o de un agente) quedará aquí.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {movimientos.slice(0, 12).map((m) => {
            const a = actorInfo(m.actor)
            return (
              <li key={m.id} className="rounded-s bg-surface-muted px-2.5 py-2">
                <p className="text-[12px] text-ink">
                  <span title={a.tipo}>{ICONO_ACTOR[a.tipo]}</span>{' '}
                  <span className={a.tipo === 'agente' ? 'font-medium text-accent' : 'font-medium'}>{a.nombre}</span>{' '}
                  movió <span className="font-medium">{nombre(m.lead_id)}</span>
                  {m.de_etapa ? (
                    <>
                      {' '}de <span className="capitalize">{m.de_etapa.replace(/_/g, ' ')}</span> a{' '}
                      <span className="capitalize">{m.a_etapa.replace(/_/g, ' ')}</span>
                    </>
                  ) : (
                    <>
                      {' '}a <span className="capitalize">{m.a_etapa.replace(/_/g, ' ')}</span>
                    </>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-muted">
                  {fmtFecha(m.created_at)}
                  {m.motivo ? ` · ${m.motivo}` : ''}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
