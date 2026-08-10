'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Card, Chip } from '@/shared/components/ui'
import type { Precedente } from '@/features/contratos/types'

/**
 * PrecedentRepository — buscador del repositorio de precedentes.
 * Dolor que ataca (INVESTIGACION-SINTESIS.md §3): precedentes que nadie
 * encuentra. Búsqueda por texto y filtro por etiqueta sobre el índice que
 * mantiene Hermes (en el prototipo, filtrado local).
 */
export function PrecedentRepository({
  precedentes,
}: {
  precedentes: Precedente[]
}) {
  const [busqueda, setBusqueda] = useState('')
  const [etiqueta, setEtiqueta] = useState<string>('todas')

  const etiquetas = [...new Set(precedentes.flatMap((p) => p.etiquetas))].sort()

  const texto = busqueda.trim().toLowerCase()
  const filtrados = precedentes.filter((precedente) => {
    const coincideTexto =
      texto === '' ||
      `${precedente.nombre} ${precedente.cliente} ${precedente.resumen} ${precedente.etiquetas.join(' ')}`
        .toLowerCase()
        .includes(texto)
    const coincideEtiqueta =
      etiqueta === 'todas' || precedente.etiquetas.includes(etiqueta)
    return coincideTexto && coincideEtiqueta
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search
            size={15}
            strokeWidth={1.75}
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <label htmlFor="buscar-precedente" className="sr-only">
            Buscar precedente
          </label>
          <input
            id="buscar-precedente"
            type="search"
            placeholder="Buscar por nombre, cliente o etiqueta…"
            className="w-72 rounded-control border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <label htmlFor="filtro-etiqueta" className="text-sm text-ink-muted">
          Etiqueta
        </label>
        <select
          id="filtro-etiqueta"
          className="rounded-control border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
          value={etiqueta}
          onChange={(e) => setEtiqueta(e.target.value)}
        >
          <option value="todas">Todas</option>
          {etiquetas.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <span className="text-xs tabular-nums text-ink-muted">
          {filtrados.length} de {precedentes.length} precedentes
        </span>
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-strong bg-surface px-6 py-10 text-center text-sm text-ink-muted">
          Ningún precedente coincide con la búsqueda.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filtrados.map((precedente) => (
            <Card key={precedente.id} className="flex flex-col">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-lg font-semibold leading-snug text-ink">
                  {precedente.nombre}
                </h3>
                <span className="shrink-0 font-mono text-xs text-ink-muted">
                  {precedente.anio}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-ink-muted">
                {precedente.tipo} · {precedente.cliente}
              </p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-secondary">
                {precedente.resumen}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {precedente.etiquetas.map((tag) => (
                  <Chip key={tag}>{tag}</Chip>
                ))}
              </div>
              <p className="mt-3 border-t border-line pt-2 text-xs tabular-nums text-ink-muted">
                {precedente.usos} usos · última consulta {precedente.ultimaConsulta}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
