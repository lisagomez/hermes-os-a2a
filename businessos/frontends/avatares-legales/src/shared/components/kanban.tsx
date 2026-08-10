import type { ReactNode } from 'react'

/**
 * Tablero kanban ESTÁTICO (sin arrastrar-y-soltar: fuera de alcance del
 * prototipo, declarado en README). Columnas con scroll horizontal propio.
 */

export type ColumnaKanban<T> = {
  id: string
  titulo: string
  items: T[]
}

export function KanbanBoard<T>({
  columnas,
  claveItem,
  renderItem,
}: {
  columnas: ColumnaKanban<T>[]
  claveItem: (item: T) => string
  renderItem: (item: T) => ReactNode
}) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4">
        {columnas.map((columna) => (
          <section
            key={columna.id}
            className="w-72 shrink-0 rounded-card border border-line bg-surface-muted p-3"
          >
            <header className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-ink">{columna.titulo}</h3>
              <span className="rounded-control bg-surface px-2 py-0.5 text-xs font-medium tabular-nums text-ink-secondary">
                {columna.items.length}
              </span>
            </header>
            <div className="space-y-3">
              {columna.items.length === 0 ? (
                <p className="px-1 py-4 text-center text-xs text-ink-muted">
                  Sin casos en esta etapa
                </p>
              ) : (
                columna.items.map((item) => (
                  <div key={claveItem(item)}>{renderItem(item)}</div>
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
