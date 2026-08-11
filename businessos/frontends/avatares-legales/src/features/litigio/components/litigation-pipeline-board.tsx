'use client'

import { useState } from 'react'
import { Columns3, Table2 } from 'lucide-react'
import { Card, Chip, RiskBadge } from '@/shared/components/ui'
import { DataTable, type Columna } from '@/shared/components/table'
import { KanbanBoard, type ColumnaKanban } from '@/shared/components/kanban'
import type { CasoLitigio, EtapaLitigio } from '@/features/litigio/types'

/**
 * LitigationPipelineBoard — vista única del pipeline de casos.
 * Dolor que ataca (INVESTIGACION-SINTESIS.md §2): sin vista única del estado;
 * filtros por práctica y abogado, conmutador kanban/tabla. El kanban es
 * estático (sin arrastrar-y-soltar: fuera de alcance del prototipo).
 */

const ETAPAS: { id: EtapaLitigio; titulo: string }[] = [
  { id: 'intake', titulo: 'Intake' },
  { id: 'estrategia', titulo: 'Estrategia' },
  { id: 'juicio', titulo: 'Juicio en curso' },
  { id: 'sentencia', titulo: 'Sentencia' },
  { id: 'ejecucion', titulo: 'Ejecución' },
]

const ETIQUETA_ETAPA: Record<EtapaLitigio, string> = {
  intake: 'Intake',
  estrategia: 'Estrategia',
  juicio: 'Juicio en curso',
  sentencia: 'Sentencia',
  ejecucion: 'Ejecución',
}

const CLASE_SELECT =
  'rounded-control border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none'

function TarjetaCaso({ caso }: { caso: CasoLitigio }) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip>{caso.practica}</Chip>
        <RiskBadge nivel={caso.riesgo} />
      </div>
      <p className="mt-2 text-sm font-semibold leading-snug text-ink">
        {caso.cliente}
      </p>
      <p className="mt-0.5 font-mono text-xs text-ink-muted">
        {caso.expediente} · {caso.id}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-ink-secondary">
        {caso.resumen}
      </p>
      <p className="mt-2 flex items-baseline justify-between text-xs">
        <span className="text-ink-muted">{caso.abogado}</span>
        {caso.proximaActuacion ? (
          <span className="font-medium tabular-nums text-ink">
            {caso.proximaActuacion}
          </span>
        ) : null}
      </p>
    </Card>
  )
}

export function LitigationPipelineBoard({ casos }: { casos: CasoLitigio[] }) {
  const [modo, setModo] = useState<'kanban' | 'tabla'>('kanban')
  const [practica, setPractica] = useState<string>('todas')
  const [abogado, setAbogado] = useState<string>('todos')

  const practicas = [...new Set(casos.map((caso) => caso.practica))]
  const abogados = [...new Set(casos.map((caso) => caso.abogado))].sort()

  const filtrados = casos.filter(
    (caso) =>
      (practica === 'todas' || caso.practica === practica) &&
      (abogado === 'todos' || caso.abogado === abogado),
  )

  const columnasKanban: ColumnaKanban<CasoLitigio>[] = ETAPAS.map((etapa) => ({
    id: etapa.id,
    titulo: etapa.titulo,
    items: filtrados.filter((caso) => caso.etapa === etapa.id),
  }))

  const columnasTabla: Columna<CasoLitigio>[] = [
    {
      clave: 'caso',
      encabezado: 'Caso',
      render: (caso) => (
        <>
          <span className="block font-medium">{caso.cliente}</span>
          <span className="block font-mono text-xs text-ink-muted">
            {caso.expediente} · {caso.id}
          </span>
        </>
      ),
    },
    {
      clave: 'practica',
      encabezado: 'Práctica',
      render: (caso) => <Chip>{caso.practica}</Chip>,
    },
    {
      clave: 'etapa',
      encabezado: 'Etapa',
      render: (caso) => (
        <span className="text-ink-secondary">{ETIQUETA_ETAPA[caso.etapa]}</span>
      ),
    },
    {
      clave: 'riesgo',
      encabezado: 'Riesgo',
      render: (caso) => <RiskBadge nivel={caso.riesgo} />,
    },
    {
      clave: 'juzgado',
      encabezado: 'Juzgado / autoridad',
      render: (caso) => (
        <span className="text-xs text-ink-secondary">{caso.juzgado}</span>
      ),
    },
    {
      clave: 'actuacion',
      encabezado: 'Próxima actuación',
      alinear: 'derecha',
      render: (caso) =>
        caso.proximaActuacion ? (
          <>
            <span className="block font-medium tabular-nums">
              {caso.proximaActuacion}
            </span>
            <span className="block text-xs tabular-nums text-ink-muted">
              en {caso.diasParaActuacion} días
            </span>
          </>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
    {
      clave: 'abogado',
      encabezado: 'Abogado',
      render: (caso) => (
        <span className="text-ink-secondary">{caso.abogado}</span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="filtro-practica" className="text-sm text-ink-muted">
            Práctica
          </label>
          <select
            id="filtro-practica"
            className={CLASE_SELECT}
            value={practica}
            onChange={(e) => setPractica(e.target.value)}
          >
            <option value="todas">Todas</option>
            {practicas.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <label htmlFor="filtro-abogado" className="text-sm text-ink-muted">
            Abogado
          </label>
          <select
            id="filtro-abogado"
            className={CLASE_SELECT}
            value={abogado}
            onChange={(e) => setAbogado(e.target.value)}
          >
            <option value="todos">Todos</option>
            {abogados.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <span className="text-xs tabular-nums text-ink-muted">
            {filtrados.length} de {casos.length} casos
          </span>
        </div>

        <div
          className="flex rounded-control border border-line bg-surface p-0.5"
          role="group"
          aria-label="Modo de vista"
        >
          <button
            type="button"
            onClick={() => setModo('kanban')}
            aria-pressed={modo === 'kanban'}
            className={`flex items-center gap-1.5 rounded-control px-3 py-1.5 text-sm font-medium transition-colors ${
              modo === 'kanban'
                ? 'bg-accent-muted text-accent'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <Columns3 size={15} strokeWidth={1.75} aria-hidden />
            Kanban
          </button>
          <button
            type="button"
            onClick={() => setModo('tabla')}
            aria-pressed={modo === 'tabla'}
            className={`flex items-center gap-1.5 rounded-control px-3 py-1.5 text-sm font-medium transition-colors ${
              modo === 'tabla'
                ? 'bg-accent-muted text-accent'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <Table2 size={15} strokeWidth={1.75} aria-hidden />
            Tabla
          </button>
        </div>
      </div>

      {modo === 'kanban' ? (
        <KanbanBoard
          columnas={columnasKanban}
          claveItem={(caso) => caso.id}
          renderItem={(caso) => <TarjetaCaso caso={caso} />}
        />
      ) : (
        <DataTable
          columnas={columnasTabla}
          filas={filtrados}
          claveFila={(caso) => caso.id}
          vacio="Ningún caso coincide con los filtros"
        />
      )}
    </div>
  )
}
