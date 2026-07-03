import type { GastoPorModelo } from '../../types'

/** Desglose por modelo: tabla (es además la vista-tabla de accesibilidad). */
export function ModelTable({ filas }: { filas: GastoPorModelo[] }) {
  const orden = [...filas].sort((a, b) => b.costo_usd - a.costo_usd)
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
          <th className="py-2 pr-2 font-medium">Modelo</th>
          <th className="py-2 pr-2 text-right font-medium">Tokens in</th>
          <th className="py-2 pr-2 text-right font-medium">Tokens out</th>
          <th className="py-2 text-right font-medium">Costo</th>
        </tr>
      </thead>
      <tbody>
        {orden.map((f) => (
          <tr key={f.modelo} className="border-b border-slate-800/60 last:border-0">
            <td className="py-2 pr-2 text-slate-200">{f.modelo}</td>
            <td className="py-2 pr-2 text-right tabular-nums text-slate-400">
              {f.tokens_in.toLocaleString()}
            </td>
            <td className="py-2 pr-2 text-right tabular-nums text-slate-400">
              {f.tokens_out.toLocaleString()}
            </td>
            <td className="py-2 text-right tabular-nums text-slate-200">
              ${f.costo_usd.toFixed(4)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
