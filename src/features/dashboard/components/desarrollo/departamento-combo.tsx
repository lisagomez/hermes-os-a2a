'use client'

/**
 * Combo de departamento para /desarrollo: lista los departamentos dados de
 * alta (Supervisor ∪ tabla `tareas`) y filtra la lista al elegir uno.
 *
 * Sin hooks a propósito: navega con window.location (la página es
 * force-dynamic, el reload completo es el comportamiento correcto) y así el
 * componente sigue siendo una función pura renderizable por los tests del
 * gate `tests` (mismo patrón que TareasTable/EstadoTareaBadge).
 */
export function DepartamentoCombo({
  departamentos,
  seleccionado,
}: {
  departamentos: string[]
  seleccionado?: string
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-400">
      Departamento
      <select
        defaultValue={seleccionado ?? ''}
        onChange={(e) => {
          const valor = e.target.value
          window.location.href = valor
            ? `/desarrollo?departamento=${encodeURIComponent(valor)}`
            : '/desarrollo'
        }}
        className="rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 focus:border-slate-600 focus:outline-none"
      >
        <option value="">Todos</option>
        {departamentos.map((d) => (
          <option key={d} value={d}>
            {d.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    </label>
  )
}
