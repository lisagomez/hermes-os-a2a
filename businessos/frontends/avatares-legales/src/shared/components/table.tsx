import type { ReactNode } from 'react'

/**
 * Tabla de datos tipada, sin librería. Densa pero sobria: la UI interna
 * tolera densidad si mantiene consistencia (INVESTIGACION-SINTESIS.md,
 * principio 1). El contenedor hace scroll horizontal propio para que la
 * página nunca desborde.
 */

export type Columna<T> = {
  clave: string
  encabezado: string
  alinear?: 'izquierda' | 'derecha'
  render: (fila: T) => ReactNode
}

export function DataTable<T>({
  columnas,
  filas,
  claveFila,
  vacio = 'Sin registros',
}: {
  columnas: Columna<T>[]
  filas: T[]
  claveFila: (fila: T) => string
  vacio?: string
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-1">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-muted">
            {columnas.map((col) => (
              <th
                key={col.clave}
                scope="col"
                className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-secondary ${
                  col.alinear === 'derecha' ? 'text-right' : 'text-left'
                }`}
              >
                {col.encabezado}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr>
              <td
                colSpan={columnas.length}
                className="px-4 py-8 text-center text-sm text-ink-muted"
              >
                {vacio}
              </td>
            </tr>
          ) : (
            filas.map((fila) => (
              <tr
                key={claveFila(fila)}
                className="border-b border-line last:border-b-0 hover:bg-surface-muted/60"
              >
                {columnas.map((col) => (
                  <td
                    key={col.clave}
                    className={`px-4 py-3 align-top text-ink ${
                      col.alinear === 'derecha'
                        ? 'text-right tabular-nums'
                        : 'text-left'
                    }`}
                  >
                    {col.render(fila)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
