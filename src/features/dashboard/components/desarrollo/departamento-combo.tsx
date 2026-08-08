'use client'

import { Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Combo de departamento (vive en el NAVBAR): lista los departamentos dados de
 * alta (Supervisor ∪ tabla `tareas`) y al elegir uno navega a /desarrollo
 * filtrado. Desde cualquier vista, elegir un departamento te lleva a sus
 * tareas.
 *
 * La vista (DepartamentoComboView) no usa hooks a propósito: navega con
 * window.location (la página destino es force-dynamic, el reload completo es
 * el comportamiento correcto) y así sigue siendo una función pura renderizable
 * por los tests del gate `tests` (mismo patrón que TareasTable). La selección
 * actual se lee de la URL en el wrapper (useSearchParams) para que el combo
 * refleje el filtro activo también tras un reload.
 */
export function DepartamentoComboView({
  departamentos,
  seleccionado,
}: {
  departamentos: string[]
  seleccionado?: string
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-secondary">
      Departamento
      <select
        defaultValue={seleccionado ?? ''}
        onChange={(e) => {
          const valor = e.target.value
          window.location.href = valor
            ? `/desarrollo?departamento=${encodeURIComponent(valor)}`
            : '/desarrollo'
        }}
        className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:border-line focus:outline-none"
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

function ComboConSeleccion({ departamentos }: { departamentos: string[] }) {
  const pathname = usePathname()
  const param = useSearchParams().get('departamento') ?? undefined
  const seleccionado = param
  // key: re-monta el <select> (uncontrolled) cuando cambia el filtro en la URL
  return (
    <DepartamentoComboView
      key={seleccionado ?? 'todos'}
      departamentos={departamentos}
      seleccionado={seleccionado}
    />
  )
}

export function DepartamentoCombo({ departamentos }: { departamentos: string[] }) {
  // useSearchParams exige Suspense si algún día una vista del grupo (main) se
  // vuelve estática; el fallback es el mismo combo sin selección marcada.
  return (
    <Suspense fallback={<DepartamentoComboView departamentos={departamentos} />}>
      <ComboConSeleccion departamentos={departamentos} />
    </Suspense>
  )
}
