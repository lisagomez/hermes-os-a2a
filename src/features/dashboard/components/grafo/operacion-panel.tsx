import type { Cobro, Contrato, FacturaResumen } from '../../types'
import { NeutralBadge } from './badges'

/** Operación alrededor del grafo: facturas por deducibilidad, contratos y cobros. */

const TONO_FACTURA: Record<FacturaResumen['deducibilidad_estado'], 'good' | 'warning' | 'critical' | undefined> = {
  deducible: 'good',
  dudoso: 'warning',
  no_deducible: 'critical',
  pendiente: undefined,
}

export function FacturasPanel({ facturas }: { facturas: FacturaResumen[] }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-sm font-medium text-slate-400">Facturas por deducibilidad</h2>
      <ul className="mt-3 space-y-2">
        {facturas.length === 0 && <li className="text-sm text-slate-500">Sin facturas.</li>}
        {facturas.map((f) => (
          <li key={f.deducibilidad_estado} className="flex items-center justify-between text-sm">
            <NeutralBadge texto={f.deducibilidad_estado.replace('_', ' ')} tono={TONO_FACTURA[f.deducibilidad_estado]} />
            <span className="tabular-nums text-slate-200">{f.cuenta}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

const TONO_CONTRATO: Record<Contrato['estado'], 'good' | 'warning' | 'critical' | undefined> = {
  borrador: undefined,
  en_revision: 'warning',
  validado: 'good',
  aprobado: 'good',
  firmado: 'good',
  terminado: undefined,
}

export function ContratosPanel({ contratos }: { contratos: Contrato[] }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-sm font-medium text-slate-400">Contratos</h2>
      <ul className="mt-3 space-y-2">
        {contratos.length === 0 && <li className="text-sm text-slate-500">Sin contratos.</li>}
        {contratos.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-slate-200" title={`${c.cliente} — ${c.titulo} (${c.jurisdiccion})`}>
              {c.cliente} <span className="text-slate-500">· {c.titulo}</span>
            </span>
            <NeutralBadge texto={c.estado.replace('_', ' ')} tono={TONO_CONTRATO[c.estado]} />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-600">Aprobar y firmar es exclusivamente humano.</p>
    </section>
  )
}

const TONO_COBRO: Record<Cobro['estado'], 'good' | 'warning' | 'critical' | undefined> = {
  link_creado: undefined,
  abierto: undefined,
  confirmado: 'warning',
  pagado: 'good',
  expirado: 'critical',
  fallido: 'critical',
}

export function CobrosPanel({ cobros }: { cobros: Cobro[] }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-sm font-medium text-slate-400">Cobros (Polar)</h2>
      <ul className="mt-3 space-y-2">
        {cobros.length === 0 && <li className="text-sm text-slate-500">Sin cobros.</li>}
        {cobros.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-slate-200" title={c.concepto}>
              {c.cliente}
              <span className="ml-2 tabular-nums text-slate-400">
                ${c.monto.toFixed(2)} {c.moneda}
              </span>
            </span>
            <NeutralBadge texto={c.estado.replace('_', ' ')} tono={TONO_COBRO[c.estado]} />
          </li>
        ))}
      </ul>
    </section>
  )
}
