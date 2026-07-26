'use client'

import Link from 'next/link'
import { CircleCheck, CircleDashed, CircleHelp, MessageCircleQuestion } from 'lucide-react'
import type { AnalisisReunion } from './engine'
import type { CategoriaInsight, Evidencia, Reunion, ScoreDiscovery } from '@/features/domain/types'
import { ETIQUETA_CATEGORIA, ETIQUETA_DIMENSION } from '@/features/domain/types'
import { Card, Chip, ProgressBar, ScoreChip, tonoScore } from '@/shared/components/ui'
import { fmtTiempo } from '@/shared/lib/format'

const ORDEN_CATEGORIAS: CategoriaInsight[] = [
  'pain',
  'objetivo',
  'necesidad_explicita',
  'necesidad_implicita',
  'urgencia',
  'presupuesto',
  'proceso_decision',
  'stakeholder',
  'herramienta_actual',
  'competidor',
  'objecion',
  'riesgo',
  'senal_compra',
  'proximo_paso',
  'pregunta_sin_responder',
]

export function CitaEvidencia({ reunionId, evidencia }: { reunionId: string; evidencia: Evidencia }) {
  return (
    <Link
      href={`/reuniones/${reunionId}/transcripcion#seg-${evidencia.segmentoIdx}`}
      className="inline-flex max-w-full items-baseline gap-1 rounded bg-surface-muted px-1.5 py-0.5 text-[11px] text-ink-secondary hover:bg-accent-muted hover:text-accent"
      title={evidencia.cita}
    >
      <span className="font-mono">[{fmtTiempo(evidencia.inicioS)}]</span>
      <span className="truncate italic">“{evidencia.cita}”</span>
    </Link>
  )
}

export function DesgloseScore({ reunionId, score }: { reunionId: string; score: ScoreDiscovery }) {
  return (
    <Card className="p-4" >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Score de discovery</h2>
          <p className="text-[12px] text-ink-secondary">Suma ponderada de 8 dimensiones — cada punto tiene su porqué.</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-ink" data-testid="score-total">{score.total}</p>
          <ScoreChip total={score.total} />
        </div>
      </div>
      <ProgressBar valor={score.total} tono={tonoScore(score.total)} />
      <div className="mt-4 space-y-3">
        {score.dimensiones.map((d) => (
          <div key={d.dimension} className="flex items-start gap-2.5" data-testid={`dim-${d.dimension}`}>
            {d.estado === 'cubierta' ? (
              <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            ) : d.estado === 'parcial' ? (
              <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            ) : (
              <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-medium text-ink">{ETIQUETA_DIMENSION[d.dimension]}</span>
                <Chip tono={d.estado === 'cubierta' ? 'success' : d.estado === 'parcial' ? 'warning' : 'danger'}>{d.estado}</Chip>
                <span className="text-[11px] text-ink-muted">
                  {d.estado === 'cubierta' ? d.peso : d.estado === 'parcial' ? d.peso / 2 : 0} / {d.peso} pts
                </span>
              </div>
              <p className="text-[12px] text-ink-secondary">{d.explicacion}</p>
              {d.evidencia.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {d.evidencia.slice(0, 2).map((e) => (
                    <CitaEvidencia key={e.segmentoIdx} reunionId={reunionId} evidencia={e} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line-subtle pt-3 text-center">
        <div>
          <p className="text-[11px] text-ink-muted">Habla del equipo</p>
          <p className={`text-sm font-semibold ${score.conducta.ratioHablaInterno > 0.45 ? 'text-warning' : 'text-ink'}`}>
            {Math.round(score.conducta.ratioHablaInterno * 100)}%
          </p>
        </div>
        <div>
          <p className="text-[11px] text-ink-muted">Preguntas abiertas</p>
          <p className="text-sm font-semibold text-ink">{score.conducta.preguntasAbiertas}</p>
        </div>
        <div>
          <p className="text-[11px] text-ink-muted">Inaudibles</p>
          <p className="text-sm font-semibold text-ink">{score.conducta.segmentosInaudibles}</p>
        </div>
      </div>
    </Card>
  )
}

export function InsightsPanel({ reunion, analisis }: { reunion: Reunion; analisis: AnalisisReunion }) {
  const { insights, score } = analisis
  const porCategoria = ORDEN_CATEGORIAS.map((c) => ({ categoria: c, items: insights.filter((i) => i.categoria === c) }))

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        {porCategoria.map(({ categoria, items }) => (
          <Card key={categoria} className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-[13px] font-semibold text-ink">{ETIQUETA_CATEGORIA[categoria]}</h3>
              <Chip>{items.length}</Chip>
            </div>
            {items.length === 0 ? (
              <p className="text-[12px] text-ink-muted">
                Sin hallazgos en esta categoría — no se inventa lo que la conversación no dio.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {items.map((i) => (
                  <li key={i.id} data-testid={`insight-${categoria}`}>
                    <p className="text-[13px] text-ink">{i.texto}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {i.confianza === 'media' && <Chip tono="warning">inferido</Chip>}
                      {i.extra?.estado && <Chip>{i.extra.estado}</Chip>}
                      {i.evidencia.map((e) => (
                        <CitaEvidencia key={`${i.id}-${e.segmentoIdx}`} reunionId={reunion.id} evidencia={e} />
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <DesgloseScore reunionId={reunion.id} score={score} />
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <MessageCircleQuestion className="h-4 w-4 text-accent" />
            <h3 className="text-[13px] font-semibold text-ink">Huecos del discovery</h3>
          </div>
          {score.huecos.length === 0 ? (
            <p className="text-[12px] text-ink-secondary">Sin huecos: todas las dimensiones del playbook están cubiertas.</p>
          ) : (
            <ul className="space-y-3">
              {score.huecos.map((h) => (
                <li key={h.dimension} className="rounded-s bg-surface-muted p-2.5" data-testid={`hueco-${h.dimension}`}>
                  <p className="text-[12px] font-medium text-ink">{ETIQUETA_DIMENSION[h.dimension]}</p>
                  <p className="mt-0.5 text-[12px] text-ink-secondary">{h.motivo}</p>
                  <p className="mt-1.5 text-[12px] font-medium text-accent">Pregunta sugerida: “{h.preguntaSugerida}”</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
