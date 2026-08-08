'use client'

import type { CatalogosExplorador } from '../../../types'

/**
 * Selector de ámbito del explorador (jurisdicción × dimensión × fecha de
 * vigencia). Vista pura sin hooks (patrón DepartamentoComboView): navega con
 * window.location — la página es force-dynamic y el reload completo es el
 * comportamiento correcto — y así los tests del gate la invocan como función.
 */

function urlExplorador(jurisdiccion: string, dimension: string, fecha: string): string {
  const q = new URLSearchParams()
  if (jurisdiccion) q.set('jurisdiccion', jurisdiccion)
  if (dimension) q.set('dimension', dimension)
  if (fecha) q.set('fecha', fecha)
  const qs = q.toString()
  return qs ? `/grafo/explorador?${qs}` : '/grafo/explorador'
}

const SELECT_CLASES =
  'rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:border-line focus:outline-none'

export function AmbitoSelector({
  catalogos,
  jurisdiccion,
  dimension,
  fecha,
}: {
  catalogos: CatalogosExplorador
  jurisdiccion?: string
  dimension?: string
  fecha?: string
}) {
  const jur = jurisdiccion ?? ''
  const dim = dimension ?? ''
  const f = fecha ?? ''
  return (
    <div className="flex flex-wrap items-end gap-4">
      <label className="flex flex-col gap-1 text-xs text-ink-secondary">
        Jurisdicción
        <select
          defaultValue={jur}
          onChange={(e) => {
            window.location.href = urlExplorador(e.target.value, dim, f)
          }}
          className={SELECT_CLASES}
        >
          <option value="">Todas</option>
          {catalogos.jurisdicciones.map((j) => (
            <option key={j.codigo} value={j.codigo}>
              {j.nombre} ({j.codigo})
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-secondary">
        Dimensión
        <select
          defaultValue={dim}
          onChange={(e) => {
            window.location.href = urlExplorador(jur, e.target.value, f)
          }}
          className={SELECT_CLASES}
        >
          <option value="">Todas</option>
          {catalogos.dimensiones.map((d) => (
            <option key={d.codigo} value={d.codigo}>
              {d.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-secondary">
        Vigencia al
        <input
          type="date"
          defaultValue={f}
          onChange={(e) => {
            window.location.href = urlExplorador(jur, dim, e.target.value)
          }}
          className={SELECT_CLASES}
        />
      </label>
    </div>
  )
}
