'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CircleCheck, CircleDashed, CircleHelp, FastForward, Lightbulb, Pause, Play, RotateCcw } from 'lucide-react'
import type { Reunion, Transcripcion } from '@/features/domain/types'
import { ETIQUETA_DIMENSION, UMBRAL_INAUDIBLE } from '@/features/domain/types'
import { useAppStore } from '@/features/domain/store'
import { playbookPorTipo } from '@/features/playbooks/defaults'
import { evaluarCoach } from './coach'
import { Card, Chip } from '@/shared/components/ui'
import { fmtTiempo } from '@/shared/lib/format'

const INTERVALO_MS = 1400

export function GuidedMeeting({ reunion, transcripcion }: { reunion: Reunion; transcripcion: Transcripcion }) {
  const playbooks = useAppStore((s) => s.playbooks)
  const playbook = playbookPorTipo(reunion.tipoReunion, playbooks)
  const total = transcripcion.segmentos.length
  const [cursor, setCursor] = useState(1)
  const [reproduciendo, setReproduciendo] = useState(false)
  const [velocidad, setVelocidad] = useState(1)
  const finRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!reproduciendo) return
    const id = setInterval(() => {
      setCursor((c) => {
        if (c >= total) {
          setReproduciendo(false)
          return c
        }
        return c + 1
      })
    }, INTERVALO_MS / velocidad)
    return () => clearInterval(id)
  }, [reproduciendo, velocidad, total])

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [cursor])

  const estado = useMemo(() => evaluarCoach(reunion, transcripcion, playbook, cursor), [reunion, transcripcion, playbook, cursor])
  const visibles = transcripcion.segmentos.slice(0, cursor)
  const alerta = estado.alertas[0] ?? null

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-3">
        <Card className="flex items-center gap-2 p-3">
          <Chip tono="info">modo replay</Chip>
          <span className="text-[12px] text-ink-secondary">
            La conversación se reproduce de forma incremental — así se comporta el coach en una reunión en vivo.
          </span>
        </Card>

        <Card className="flex items-center gap-2 p-3">
          <button type="button" className="btn-primary" onClick={() => setReproduciendo(!reproduciendo)} data-testid="guided-play">
            {reproduciendo ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {reproduciendo ? 'Pausar' : 'Reproducir'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setCursor(1)
              setReproduciendo(false)
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
          </button>
          <button type="button" className="btn-secondary" onClick={() => setCursor(total)} data-testid="guided-revelar-todo">
            <FastForward className="h-3.5 w-3.5" /> Revelar todo
          </button>
          <select
            value={velocidad}
            onChange={(e) => setVelocidad(Number(e.target.value))}
            className="input ml-auto w-20"
            aria-label="Velocidad"
          >
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={4}>4×</option>
          </select>
          <span className="text-[12px] tabular-nums text-ink-muted">
            {cursor}/{total}
          </span>
        </Card>

        <Card className="max-h-[52vh] space-y-2.5 overflow-y-auto p-4" >
          {visibles.map((s, i) => {
            const lado = reunion.participantes.find((p) => p.nombre === s.hablante)?.lado
            return (
              <div key={`${s.inicioS}-${i}`} className={`flex gap-3 ${i === cursor - 1 ? 'animate-pulse-once' : ''}`}>
                <span className="w-12 shrink-0 pt-0.5 font-mono text-[11px] text-ink-muted">[{fmtTiempo(s.inicioS)}]</span>
                <div className="min-w-0">
                  <span className={`text-[12px] font-semibold ${lado === 'interno' ? 'text-accent' : 'text-info'}`}>{s.hablante}</span>
                  <p className={`text-[13px] leading-relaxed ${s.confianza < UMBRAL_INAUDIBLE ? 'italic text-ink-muted' : 'text-ink'}`}>
                    {s.texto}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={finRef} />
        </Card>
      </div>

      <div className="space-y-4">
        {alerta && (
          <Card className="border-warning bg-warning-muted p-3" >
            <div className="flex items-start gap-2" data-testid="alerta-coach">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-warning">{alerta.tipo.replaceAll('_', ' ')}</p>
                <p className="mt-0.5 text-[13px] text-ink">{alerta.mensaje}</p>
                {estado.alertas.length > 1 && (
                  <p className="mt-1 text-[11px] text-ink-muted">+{estado.alertas.length - 1} alerta(s) más en espera</p>
                )}
              </div>
            </div>
          </Card>
        )}

        {estado.sugerencia && (
          <Card className="border-accent bg-accent-muted p-3">
            <div className="flex items-start gap-2" data-testid="sugerencia-coach">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-accent">Siguiente mejor pregunta</p>
                <p className="mt-0.5 text-[13px] font-medium text-ink">“{estado.sugerencia.preguntaSugerida}”</p>
                <p className="mt-1 text-[12px] text-ink-secondary">{estado.sugerencia.justificacion}</p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-4">
          <h3 className="mb-2 text-[13px] font-semibold text-ink">Cobertura del playbook ({playbook.nombre})</h3>
          <ul className="space-y-1.5" data-testid="cobertura-playbook">
            {estado.score.dimensiones.map((d) => (
              <li key={d.dimension} className="flex items-center gap-2">
                {d.estado === 'cubierta' ? (
                  <CircleCheck className="h-4 w-4 shrink-0 text-success" />
                ) : d.estado === 'parcial' ? (
                  <CircleDashed className="h-4 w-4 shrink-0 text-warning" />
                ) : (
                  <CircleHelp className="h-4 w-4 shrink-0 text-ink-muted" />
                )}
                <span className="text-[13px] text-ink">{ETIQUETA_DIMENSION[d.dimension]}</span>
                {playbook.dimensiones.find((p) => p.dimension === d.dimension)?.critica && <Chip tono="accent">crítica</Chip>}
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-line-subtle pt-2 text-[12px] text-ink-secondary">
            Score proyectado hasta este punto: <span className="font-semibold text-ink">{estado.score.total}/100</span>
            {estado.score.total < playbook.umbralSuperficial && cursor > total / 2 && (
              <span className="text-warning"> — por debajo del umbral del playbook ({playbook.umbralSuperficial}).</span>
            )}
          </p>
        </Card>
      </div>
    </div>
  )
}
