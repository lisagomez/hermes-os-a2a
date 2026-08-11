'use client'

import { useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { Card, Chip } from '@/shared/components/ui'
import { HermesTag } from '@/shared/components/confianza'
import type {
  ActorTrio,
  DecisionTrio,
  DepartamentoTrio,
  ResultadoDecision,
} from '@/features/direccion/types'

/**
 * DepartmentTrioManager — departamentos operados por el trío
 * Hermes→Ejecutor→Supervisor, con bitácora de decisiones clave.
 * Dolor que ataca (INVESTIGACION-SINTESIS.md §4): operación agéntica visible
 * y gobernable. El conmutador activar/pausar es local en el prototipo; en la
 * integración real exige confirmación humana.
 */

const ETIQUETA_ACTOR: Record<ActorTrio, string> = {
  hermes: 'Hermes',
  ejecutor: 'Ejecutor',
  supervisor: 'Supervisor',
}

const ETIQUETA_RESULTADO: Record<
  ResultadoDecision,
  { texto: string; tono: 'neutro' | 'acento' }
> = {
  aprobado: { texto: 'Aprobado', tono: 'acento' },
  rechazado: { texto: 'Rechazado', tono: 'neutro' },
  escalado: { texto: 'Escalado a socios', tono: 'neutro' },
}

function DecisionLogList({ decisiones }: { decisiones: DecisionTrio[] }) {
  return (
    <ol className="mt-3 space-y-2.5 border-t border-line pt-3">
      {decisiones.map((decision) => {
        const resultado = ETIQUETA_RESULTADO[decision.resultado]
        return (
          <li key={decision.id} className="text-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono tabular-nums text-ink-muted">
                {decision.fecha}
              </span>
              <span className="font-medium text-ink-secondary">
                {ETIQUETA_ACTOR[decision.actor]}
              </span>
              <Chip tono={resultado.tono}>{resultado.texto}</Chip>
            </div>
            <p className="mt-0.5 leading-relaxed text-ink-secondary">
              {decision.resumen}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

export function DepartmentTrioManager({
  departamentos: iniciales,
}: {
  departamentos: DepartamentoTrio[]
}) {
  const [departamentos, setDepartamentos] = useState(iniciales)

  function alternarEstado(id: string) {
    setDepartamentos((previos) =>
      previos.map((dep) =>
        dep.id === id
          ? { ...dep, estado: dep.estado === 'activo' ? 'pausado' : 'activo' }
          : dep,
      ),
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {departamentos.map((dep) => {
        const activo = dep.estado === 'activo'
        return (
          <Card key={dep.id} className={activo ? '' : 'opacity-75'}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-semibold text-ink">
                    {dep.nombre}
                  </h3>
                  <HermesTag />
                </div>
                <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                  {dep.descripcion}
                </p>
              </div>
              <button
                type="button"
                onClick={() => alternarEstado(dep.id)}
                aria-pressed={activo}
                className={`flex shrink-0 items-center gap-1.5 rounded-control border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activo
                    ? 'border-line text-ink-secondary hover:border-line-strong hover:text-ink'
                    : 'border-accent bg-accent-muted text-accent hover:bg-accent hover:text-accent-ink'
                }`}
              >
                {activo ? (
                  <>
                    <Pause size={13} strokeWidth={2} aria-hidden /> Pausar
                  </>
                ) : (
                  <>
                    <Play size={13} strokeWidth={2} aria-hidden /> Activar
                  </>
                )}
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-control bg-surface-muted px-2 py-2">
                <dt className="text-[11px] uppercase tracking-wide text-ink-muted">
                  Tareas / mes
                </dt>
                <dd className="mt-0.5 font-display text-lg font-semibold tabular-nums text-ink">
                  {dep.tareasMes}
                </dd>
              </div>
              <div className="rounded-control bg-surface-muted px-2 py-2">
                <dt className="text-[11px] uppercase tracking-wide text-ink-muted">
                  Aprobación 1er intento
                </dt>
                <dd className="mt-0.5 font-display text-lg font-semibold tabular-nums text-ink">
                  {dep.aprobacionPrimerIntento}%
                </dd>
              </div>
              <div className="rounded-control bg-surface-muted px-2 py-2">
                <dt className="text-[11px] uppercase tracking-wide text-ink-muted">
                  Costo / mes
                </dt>
                <dd className="mt-0.5 font-display text-lg font-semibold tabular-nums text-ink">
                  {dep.costoMes}
                </dd>
              </div>
            </dl>

            <DecisionLogList decisiones={dep.decisiones} />
          </Card>
        )
      })}
    </div>
  )
}
