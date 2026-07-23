import type { LeadResumen } from '../../types'
import { ETAPAS_MOVIBLES } from '../../types'
import { EstadoLeadBadge } from './estado-lead-badge'

/**
 * Tabla de leads con la acción de MOVER de etapa: cada fila lleva un <form>
 * (select de etapa + botón) que dispara la server action recibida por props.
 * Recibir la acción como prop mantiene el componente puro y testeable sin
 * navegador (los tests le pasan un stub). Sin JS de cliente: formulario
 * clásico + server action, el embudo se actualiza al revalidar.
 */
export function LeadsTable({
  leads,
  accionMover,
}: {
  leads: LeadResumen[]
  accionMover: (formData: FormData) => Promise<void>
}) {
  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-10 text-center">
        <p className="text-sm font-medium text-slate-300">Sin leads todavía</p>
        <p className="mt-1 text-xs text-slate-500">
          Cuando ventas-a2a, la web o un alta manual capturen un lead, aparecerá aquí.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pl-4 pr-2 font-medium">Lead</th>
            <th className="py-2 px-2 font-medium">Origen</th>
            <th className="py-2 px-2 font-medium">Etapa</th>
            <th className="py-2 px-2 font-medium">Mover a</th>
            <th className="py-2 pl-2 pr-4 font-medium">Actualizado</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.lead_id} className="border-b border-slate-800/60 last:border-0">
              <td className="py-2 pl-4 pr-2 align-top">
                <p className="text-slate-200">{l.empresa ?? 'Sin empresa'}</p>
                <p className="text-xs text-slate-500">{l.contacto ?? 'sin contacto'}</p>
              </td>
              <td className="py-2 px-2 align-top">
                <code className="text-xs text-slate-400">{l.origen}</code>
              </td>
              <td className="py-2 px-2 align-top">
                <EstadoLeadBadge etapa={l.etapa} />
              </td>
              <td className="py-2 px-2 align-top">
                <form action={accionMover} className="flex items-center gap-2">
                  <input type="hidden" name="lead_id" value={l.lead_id} />
                  <select
                    name="etapa"
                    defaultValue={l.etapa}
                    className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus:border-slate-600 focus:outline-none"
                  >
                    {ETAPAS_MOVIBLES.map((e) => (
                      <option key={e} value={e}>
                        {e.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700"
                  >
                    Mover
                  </button>
                </form>
              </td>
              <td className="py-2 pl-2 pr-4 align-top text-xs text-slate-400">
                {l.updated_at.slice(0, 16).replace('T', ' ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
