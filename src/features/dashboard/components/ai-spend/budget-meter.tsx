import { PRESUPUESTO_MENSUAL_USD, UMBRAL_ALERTA } from '../../types'
import { STATUS } from './colors'

/**
 * Stat tile + medidor del presupuesto mensual. El estado nunca es color solo:
 * lleva icono y texto (regla de status del sistema de viz).
 */
export function BudgetMeter({ totalUsd, mes }: { totalUsd: number; mes: string }) {
  const pct = totalUsd / PRESUPUESTO_MENSUAL_USD
  const estado =
    pct >= 1
      ? { color: STATUS.critical, icono: '✕', texto: 'presupuesto excedido' }
      : pct >= UMBRAL_ALERTA
        ? { color: STATUS.warning, icono: '▲', texto: `sobre el ${UMBRAL_ALERTA * 100}% del presupuesto` }
        : { color: STATUS.good, icono: '✓', texto: 'dentro de presupuesto' }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-sm font-medium text-slate-400">Gasto del mes ({mes})</h2>
      <p className="mt-2 text-4xl font-bold">
        ${totalUsd.toFixed(2)}
        <span className="ml-2 text-base font-normal text-slate-400">
          de ${PRESUPUESTO_MENSUAL_USD} presupuestados
        </span>
      </p>
      {/* Medidor con marca del umbral de alerta (80%) */}
      <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(pct * 100, 100)}%`, backgroundColor: estado.color }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-slate-500"
          style={{ left: `${UMBRAL_ALERTA * 100}%` }}
          title={`Umbral de alerta: $${PRESUPUESTO_MENSUAL_USD * UMBRAL_ALERTA}`}
        />
      </div>
      <p className="mt-2 flex items-center gap-2 text-sm" style={{ color: estado.color }}>
        <span aria-hidden>{estado.icono}</span>
        {estado.texto} · {(pct * 100).toFixed(1)}%
      </p>
    </section>
  )
}
