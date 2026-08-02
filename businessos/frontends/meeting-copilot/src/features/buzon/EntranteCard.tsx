'use client'

// Correo original SANEADO, con marca visual de qué se eliminó (SPEC §6.3.1).
// Sin esto A5 firma a ciegas — compartido por HiloDetalle y ColaAprobaciones.

import { ShieldQuestion, ShieldCheck } from 'lucide-react'
import { Callout, Chip } from '@/shared/components/ui'
import { fmtFecha, fmtHora } from '@/shared/lib/format'
import type { CorreoEntrante } from './types'

export function EntranteCard({ entrante }: { entrante: CorreoEntrante }) {
  return (
    <div className="space-y-2 rounded-s border border-line-subtle p-3" data-testid="entrante-card" data-entrante={entrante.id}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink">{entrante.remitente}</p>
          <p className="text-[11px] text-ink-muted">
            {fmtFecha(entrante.recibidoEn)} · {fmtHora(entrante.recibidoEn)} · a {entrante.destinatarios.to.join(', ')}
            {entrante.destinatarios.cc.length > 0 ? ` · cc ${entrante.destinatarios.cc.join(', ')}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Chip tono={entrante.remitenteConocido ? 'success' : 'warning'}>
            {entrante.remitenteConocido ? (
              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> conocido</span>
            ) : (
              <span className="inline-flex items-center gap-1"><ShieldQuestion className="h-3 w-3" /> desconocido</span>
            )}
          </Chip>
          <Chip tono={entrante.dmarcAlineado ? 'success' : 'danger'}>DMARC {entrante.dmarcAlineado ? 'alineado' : 'no alineado'}</Chip>
        </div>
      </div>
      <p className="text-[12px] font-medium text-ink">{entrante.asunto}</p>
      <p className="whitespace-pre-line text-[13px] text-ink-secondary">{entrante.cuerpoSaneado}</p>
      {entrante.saneadoMeta.eliminados.length > 0 ? (
        <Callout tono="info" variante="inline" data-testid="saneado-eliminados">
          <p className="text-[12px] font-medium">Se eliminó al sanear:</p>
          <ul className="mt-1 list-inside list-disc text-[12px]">
            {entrante.saneadoMeta.eliminados.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Callout>
      ) : null}
    </div>
  )
}
