'use client'

import { useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { Card, Chip, RiskBadge } from '@/shared/components/ui'
import { FuentesFooter } from '@/shared/components/confianza'
import type {
  ClausulaSugerida,
  EstadoClausula,
} from '@/features/contratos/types'

/**
 * ClauseReviewPanel — revisión de cláusulas sugeridas por el sistema.
 * Dolor que ataca (INVESTIGACION-SINTESIS.md §3): trazabilidad de cláusulas.
 * Cada ClauseCard trae texto, riesgo con motivo y fuente; el abogado decide
 * aceptar / editar / descartar ("la IA propone, el humano dispone"). Las
 * decisiones viven en estado local del prototipo.
 */

const ETIQUETA_ESTADO: Record<EstadoClausula, string> = {
  sugerida: 'Sugerida',
  aceptada: 'Aceptada',
  editada: 'Editada',
  descartada: 'Descartada',
}

function ClauseCard({
  clausula,
  onDecidir,
  onEditar,
}: {
  clausula: ClausulaSugerida
  onDecidir: (id: string, estado: EstadoClausula) => void
  onEditar: (id: string, texto: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const [textoEditado, setTextoEditado] = useState(clausula.texto)
  const descartada = clausula.estado === 'descartada'

  return (
    <Card className={descartada ? 'opacity-60' : ''}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tono={clausula.estado === 'sugerida' ? 'neutro' : 'acento'}>
            {ETIQUETA_ESTADO[clausula.estado]}
          </Chip>
          <RiskBadge nivel={clausula.riesgo} />
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onDecidir(clausula.id, 'aceptada')}
            disabled={editando}
            className="flex items-center gap-1 rounded-control border border-line px-2.5 py-1 text-xs font-medium text-ink-secondary transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
          >
            <Check size={13} strokeWidth={2} aria-hidden /> Aceptar
          </button>
          <button
            type="button"
            onClick={() => {
              setEditando(true)
              setTextoEditado(clausula.texto)
            }}
            disabled={editando}
            className="flex items-center gap-1 rounded-control border border-line px-2.5 py-1 text-xs font-medium text-ink-secondary transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
          >
            <Pencil size={13} strokeWidth={2} aria-hidden /> Editar
          </button>
          <button
            type="button"
            onClick={() => onDecidir(clausula.id, 'descartada')}
            disabled={editando}
            className="flex items-center gap-1 rounded-control border border-line px-2.5 py-1 text-xs font-medium text-ink-secondary transition-colors hover:border-line-strong hover:text-ink disabled:opacity-40"
          >
            <X size={13} strokeWidth={2} aria-hidden /> Descartar
          </button>
        </div>
      </div>

      <h3 className="mt-3 font-display text-lg font-semibold text-ink">
        {clausula.titulo}
      </h3>

      {editando ? (
        <div className="mt-2">
          <label htmlFor={`editor-${clausula.id}`} className="sr-only">
            Editar texto de la cláusula
          </label>
          <textarea
            id={`editor-${clausula.id}`}
            rows={5}
            className="w-full rounded-control border border-accent bg-surface px-3 py-2 text-sm leading-relaxed text-ink focus:outline-none"
            value={textoEditado}
            onChange={(e) => setTextoEditado(e.target.value)}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="rounded-control border border-line px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-surface-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                onEditar(clausula.id, textoEditado)
                setEditando(false)
              }}
              className="rounded-control bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent-hover"
            >
              Guardar edición
            </button>
          </div>
        </div>
      ) : (
        <p
          className={`mt-2 text-sm leading-relaxed ${
            descartada ? 'text-ink-muted line-through' : 'text-ink-secondary'
          }`}
        >
          {clausula.texto}
        </p>
      )}

      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        <span className="font-semibold">Motivo del riesgo:</span>{' '}
        {clausula.motivoRiesgo}
      </p>

      <FuentesFooter fuentes={clausula.fuentes} />
    </Card>
  )
}

export function ClauseReviewPanel({
  clausulas: iniciales,
}: {
  clausulas: ClausulaSugerida[]
}) {
  const [clausulas, setClausulas] = useState(iniciales)

  function decidir(id: string, estado: EstadoClausula) {
    setClausulas((previas) =>
      previas.map((clausula) =>
        clausula.id === id ? { ...clausula, estado } : clausula,
      ),
    )
  }

  function editar(id: string, texto: string) {
    setClausulas((previas) =>
      previas.map((clausula) =>
        clausula.id === id ? { ...clausula, texto, estado: 'editada' } : clausula,
      ),
    )
  }

  const conteo = {
    aceptadas: clausulas.filter((c) => c.estado === 'aceptada').length,
    editadas: clausulas.filter((c) => c.estado === 'editada').length,
    pendientes: clausulas.filter((c) => c.estado === 'sugerida').length,
    descartadas: clausulas.filter((c) => c.estado === 'descartada').length,
  }

  return (
    <div className="space-y-4">
      <p className="text-sm tabular-nums text-ink-secondary">
        {conteo.aceptadas} aceptadas · {conteo.editadas} editadas ·{' '}
        {conteo.pendientes} por revisar · {conteo.descartadas} descartadas
      </p>
      <div className="space-y-4">
        {clausulas.map((clausula) => (
          <ClauseCard
            key={clausula.id}
            clausula={clausula}
            onDecidir={decidir}
            onEditar={editar}
          />
        ))}
      </div>
    </div>
  )
}
