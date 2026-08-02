'use client'

// Lista de los 11 gates deterministas (SPEC §3), SIEMPRE los 11, cada uno con
// su propio veredicto — nunca un resumen agregado. Compartido por HiloDetalle
// y ColaAprobaciones (el "camino crítico" de A5).

import { CheckCircle2, XCircle } from 'lucide-react'
import { Chip } from '@/shared/components/ui'
import { GATES_BUZON } from './types'
import type { ResultadoGate, Severidad } from './types'

const TONO_SEVERIDAD: Record<Severidad, 'danger' | 'warning' | 'info'> = {
  CRITICA: 'danger',
  ALTA: 'warning',
  MEDIA: 'info',
}

export function GatesResultado({ gates }: { gates: ResultadoGate[] }) {
  if (gates.length === 0) {
    return <p className="text-[12px] italic text-ink-muted" data-testid="gates-sin-correr">Los gates aún no han corrido sobre este borrador.</p>
  }
  return (
    <ul className="space-y-1.5" data-testid="lista-gates">
      {GATES_BUZON.map((def) => {
        const resultado = gates.find((g) => g.gate === def.gate)
        if (!resultado) return null
        return (
          <li
            key={def.gate}
            className={`flex items-start gap-2 rounded-s border px-2.5 py-1.5 text-[12px] ${
              resultado.paso ? 'border-line-subtle' : 'border-danger bg-danger-muted'
            }`}
            data-testid={`gate-${def.gate}`}
            data-paso={resultado.paso}
          >
            {resultado.paso ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            ) : (
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono font-medium text-ink">{def.gate}</span>
                <Chip tono={TONO_SEVERIDAD[resultado.severidad]}>{resultado.severidad}</Chip>
              </div>
              <p className="text-ink-secondary">{resultado.evidencia}</p>
              {resultado.detalles && resultado.detalles.length > 0 ? (
                <ul className="mt-1 list-inside list-disc text-[11px] text-ink-muted">
                  {resultado.detalles.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
