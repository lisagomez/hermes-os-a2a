'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Search } from 'lucide-react'
import type { Reunion, Transcripcion } from '@/features/domain/types'
import { UMBRAL_INAUDIBLE } from '@/features/domain/types'
import { Callout, Card, Chip } from '@/shared/components/ui'
import { fmtTiempo } from '@/shared/lib/format'

const COLORES_HABLANTE = ['text-accent', 'text-info', 'text-success', 'text-warning']

export function TranscriptViewer({ reunion, transcripcion }: { reunion: Reunion; transcripcion: Transcripcion }) {
  const [busqueda, setBusqueda] = useState('')

  const colorDe = useMemo(() => {
    const hablantes = Array.from(new Set(transcripcion.segmentos.map((s) => s.hablante)))
    return (h: string) => COLORES_HABLANTE[hablantes.indexOf(h) % COLORES_HABLANTE.length]
  }, [transcripcion.segmentos])

  const inaudibles = transcripcion.segmentos.filter((s) => s.confianza < UMBRAL_INAUDIBLE).length
  const q = busqueda.trim().toLowerCase()
  const visibles = q
    ? transcripcion.segmentos.filter((s) => s.texto.toLowerCase().includes(q) || s.hablante.toLowerCase().includes(q))
    : transcripcion.segmentos

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tono={transcripcion.confianzaGlobal === 'alta' ? 'success' : transcripcion.confianzaGlobal === 'media' ? 'warning' : 'danger'}>
          confianza {transcripcion.confianzaGlobal}
        </Chip>
        <Chip>motor: {transcripcion.motor}</Chip>
        <Chip>{transcripcion.segmentos.length} segmentos</Chip>
        {inaudibles > 0 && (
          <Chip tono="warning">
            <AlertTriangle className="h-3 w-3" /> {inaudibles} inaudible(s)
          </Chip>
        )}
        <div className="relative ml-auto w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en la transcripción…"
            className="input pl-8"
          />
        </div>
      </div>

      {inaudibles / transcripcion.segmentos.length > 0.2 && (
        <Callout tono="warning" className="p-3">
          <p className="text-[12px] text-warning">
            Más del 20% de la transcripción es inaudible: el análisis se marca con confianza reducida (Transcript QA).
          </p>
        </Callout>
      )}

      <Card className="divide-y divide-line-subtle" >
        {visibles.length === 0 && (
          <p className="px-4 py-6 text-center text-[13px] text-ink-secondary">Nada coincide con “{busqueda}”.</p>
        )}
        {visibles.map((s, i) => {
          const idx = transcripcion.segmentos.indexOf(s)
          const lado = reunion.participantes.find((p) => p.nombre === s.hablante)?.lado
          return (
            <div key={`${s.inicioS}-${i}`} id={`seg-${idx}`} className="flex gap-3 px-4 py-2.5 target:bg-accent-muted" data-testid="segmento">
              <span className="w-12 shrink-0 pt-0.5 font-mono text-[11px] text-ink-muted">[{fmtTiempo(s.inicioS)}]</span>
              <div className="min-w-0">
                <span className={`text-[12px] font-semibold ${colorDe(s.hablante)}`}>
                  {s.hablante}
                  {lado === 'interno' && <span className="ml-1 font-normal text-ink-muted">(equipo)</span>}
                </span>
                <p className={`text-[13px] leading-relaxed ${s.confianza < UMBRAL_INAUDIBLE ? 'italic text-ink-muted' : 'text-ink'}`}>
                  {s.texto}
                  {s.confianza < UMBRAL_INAUDIBLE && <span className="ml-2 text-[11px]">(confianza {s.confianza.toFixed(2)})</span>}
                </p>
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
