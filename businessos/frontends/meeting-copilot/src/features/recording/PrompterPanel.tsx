'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Check,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  Compass,
  EyeOff,
  Lightbulb,
  Pin,
  RefreshCw,
} from 'lucide-react'
import { estadoPrompter } from './prompter'
import { useLiveStore } from './live-store'
import { Card, Chip, ProgressBar, tonoScore } from '@/shared/components/ui'
import { ETIQUETA_CATEGORIA, ETIQUETA_DIMENSION, type Playbook, type Reunion } from '@/features/domain/types'
import { fmtTiempo } from '@/shared/lib/format'

/** Prompter: la guía de Guided Meeting, compacta y embebida en Grabación.
 *  Mismo motor (evaluarCoach/extraerInsights vía estadoPrompter); solo cambia
 *  la presentación al contexto de una entrevista en vivo. */
export function PrompterPanel({ reunion, playbook, grabando }: { reunion: Reunion; playbook: Playbook; grabando: boolean }) {
  const {
    segmentos,
    temasCubiertosManual,
    preguntasDescartadas,
    senalesFijadas,
    guiaVisible,
    setGuiaVisible,
    marcarTema,
    descartarPregunta,
    toggleFijarSenal,
  } = useLiveStore()

  const estado = useMemo(
    () => estadoPrompter(reunion, segmentos, playbook, { temasCubiertosManual, preguntasDescartadas }),
    [reunion, segmentos, playbook, temasCubiertosManual, preguntasDescartadas]
  )

  if (!guiaVisible) {
    return (
      <button type="button" className="btn-secondary w-full" onClick={() => setGuiaVisible(true)} data-testid="mostrar-guia">
        Mostrar guía del asesor
      </button>
    )
  }

  const alerta = estado.alertas[0] ?? null
  const senalesOrdenadas = [...estado.senales]
    .filter((s) => s.categoria !== 'proximo_paso' || true)
    .sort((a, b) => Number(senalesFijadas.includes(b.id)) - Number(senalesFijadas.includes(a.id)))
    .slice(0, 6)

  return (
    <div className="space-y-3" data-testid="prompter">
      {/* Salud de la entrevista */}
      <Card className="p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[12px] font-semibold text-ink">Estado de la entrevista</p>
          <div className="flex items-center gap-1.5">
            <Chip tono={tonoScore(estado.total)}>{estado.total}/100</Chip>
            <button
              type="button"
              onClick={() => setGuiaVisible(false)}
              className="rounded p-1 text-ink-muted hover:text-ink"
              title="Ocultar guía"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <ProgressBar valor={estado.total} tono={tonoScore(estado.total)} />
        <p className="mt-1 text-[11px] text-ink-muted">
          {estado.cubiertas}/{estado.dimensiones.length} dimensiones cubiertas
          {segmentos.length === 0 && ' · la guía se actualiza conforme avanza la conversación'}
        </p>
      </Card>

      {/* Alerta del coach (una prominente, como en Guided Meeting) */}
      {alerta && (
        <Card className="border-warning bg-warning-muted p-2.5">
          <div className="flex items-start gap-2" data-testid="prompter-alerta">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            <p className="text-[12px] text-ink">{alerta.mensaje}</p>
          </div>
        </Card>
      )}

      {/* Siguiente mejor pregunta */}
      {estado.sugerencia ? (
        <Card className="border-accent bg-accent-muted p-3" >
          <div className="flex items-start gap-2" data-testid="prompter-sugerencia">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Siguiente mejor pregunta</p>
              <p className="mt-0.5 text-[13px] font-medium leading-snug text-ink">“{estado.sugerencia.preguntaSugerida}”</p>
              <p className="mt-1 text-[11px] text-ink-secondary">{estado.sugerencia.justificacion}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className="btn-secondary !px-2 !py-1 text-[11px]"
                  onClick={() => descartarPregunta(estado.sugerencia!.preguntaSugerida)}
                  data-testid="pregunta-usada"
                >
                  <Check className="h-3 w-3" /> La usé
                </button>
                <button
                  type="button"
                  className="btn-secondary !px-2 !py-1 text-[11px]"
                  onClick={() => descartarPregunta(estado.sugerencia!.preguntaSugerida)}
                  data-testid="otra-pregunta"
                >
                  <RefreshCw className="h-3 w-3" /> Otra pregunta
                </button>
                <button
                  type="button"
                  className="btn-secondary !px-2 !py-1 text-[11px]"
                  onClick={() => marcarTema(estado.sugerencia!.dimension)}
                  data-testid="marcar-cubierto"
                >
                  Tema cubierto
                </button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-3">
          <p className="text-[12px] text-ink-secondary">
            Sin sugerencias pendientes: el playbook está cubierto (o lo marcaste cubierto). Cierra con el siguiente paso.
          </p>
        </Card>
      )}

      {/* Cobertura del playbook */}
      <Card className="p-3">
        <p className="mb-1.5 text-[12px] font-semibold text-ink">Playbook · {playbook.nombre}</p>
        <ul className="space-y-1" data-testid="prompter-cobertura">
          {estado.dimensiones.map((d) => (
            <li key={d.dimension} className="flex items-center gap-1.5">
              {d.estado === 'cubierta' ? (
                <CircleCheck className="h-3.5 w-3.5 shrink-0 text-success" />
              ) : d.estado === 'parcial' ? (
                <CircleDashed className="h-3.5 w-3.5 shrink-0 text-warning" />
              ) : (
                <CircleHelp className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
              )}
              <span className="flex-1 truncate text-[12px] text-ink" title={d.explicacion}>
                {ETIQUETA_DIMENSION[d.dimension]}
              </span>
              {playbook.dimensiones.find((p) => p.dimension === d.dimension)?.critica && d.estado === 'faltante' && (
                <Chip tono="warning">crítica</Chip>
              )}
              {d.estado !== 'cubierta' && (
                <button
                  type="button"
                  onClick={() => marcarTema(d.dimension)}
                  className="rounded px-1 text-[10px] text-ink-muted hover:text-accent"
                  title="Marcar como cubierta (override manual; el análisis final recalcula desde la conversación)"
                >
                  ✓
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {/* Señales detectadas en vivo */}
      <Card className="p-3">
        <p className="mb-1.5 text-[12px] font-semibold text-ink">Señales detectadas</p>
        {senalesOrdenadas.length === 0 ? (
          <p className="text-[12px] text-ink-secondary">
            {grabando
              ? 'Aún sin señales — sigue la conversación; aparecerán aquí pains, presupuesto, objeciones y demás en cuanto se mencionen.'
              : 'La guía escucha cuando arranca la grabación. Puedes revisar la pregunta de apertura mientras tanto.'}
          </p>
        ) : (
          <ul className="space-y-1.5" data-testid="prompter-senales">
            {senalesOrdenadas.map((s) => (
              <li key={s.id} className="flex items-start gap-1.5 rounded-lg bg-surface-muted px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => toggleFijarSenal(s.id)}
                  className={`mt-0.5 shrink-0 ${senalesFijadas.includes(s.id) ? 'text-accent' : 'text-ink-muted hover:text-ink'}`}
                  title={senalesFijadas.includes(s.id) ? 'Quitar pin' : 'Fijar señal'}
                >
                  <Pin className={`h-3 w-3 ${senalesFijadas.includes(s.id) ? 'fill-current' : ''}`} />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Chip>{ETIQUETA_CATEGORIA[s.categoria]}</Chip>
                    <span className="font-mono text-[10px] text-ink-muted">[{fmtTiempo(s.evidencia[0].inicioS)}]</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-ink">{s.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Link href="/reuniones" className="flex items-center gap-1.5 text-[12px] font-medium text-accent hover:underline">
        <Compass className="h-3.5 w-3.5" /> ¿Sesión larga? El modo Guided Meeting completo vive en cada reunión
      </Link>
    </div>
  )
}
