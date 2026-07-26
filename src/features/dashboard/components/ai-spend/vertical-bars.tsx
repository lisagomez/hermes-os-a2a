import type { PresupuestoMes } from '../../types'
import { CHROME, VERTICAL_COLOR } from '@/shared/constants/colors'

/**
 * Gasto por vertical: barras horizontales delgadas, color fijo por entidad
 * (nunca por rank) + etiqueta directa con el valor en tinta de texto.
 */
export function VerticalBars({ filas }: { filas: PresupuestoMes[] }) {
  const verticales = filas.filter((f) => f.vertical !== 'TOTAL')
  if (verticales.length === 0) {
    return <p className="text-sm text-slate-500">Sin desglose por vertical.</p>
  }
  const max = Math.max(...verticales.map((f) => f.costo_usd), 0.01)

  return (
    <ul className="space-y-3">
      {verticales.map((f) => (
        <li key={f.vertical} title={`${f.vertical}: $${f.costo_usd.toFixed(4)} · ${f.tokens_in.toLocaleString()} in / ${f.tokens_out.toLocaleString()} out`}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="flex items-center gap-2 capitalize">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: VERTICAL_COLOR[f.vertical] ?? CHROME.muted }}
                aria-hidden
              />
              {f.vertical}
            </span>
            <span className="tabular-nums text-slate-300">${f.costo_usd.toFixed(2)}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded bg-slate-800">
            <div
              className="h-full rounded"
              style={{
                width: `${(f.costo_usd / max) * 100}%`,
                backgroundColor: VERTICAL_COLOR[f.vertical] ?? CHROME.muted,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
