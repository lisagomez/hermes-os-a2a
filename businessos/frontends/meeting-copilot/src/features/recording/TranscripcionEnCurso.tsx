'use client'

import { useEffect, useRef } from 'react'
import { AudioLines, Ear } from 'lucide-react'
import { useLiveStore } from './live-store'
import { Card, Chip } from '@/shared/components/ui'
import { fmtTiempo } from '@/shared/lib/format'

/** Bloque "Transcripción en curso": refleja los segmentos parciales de la
 *  sesión (Web Speech real o fuente demo). Contrato para streaming real:
 *  cualquier FuenteVivo que emita Segmento alimenta este bloque sin cambios.
 *  Con `onCorregir`, el nombre del hablante es clicable: corrección de un clic
 *  de la identificación de interlocutores (re-entrena al diarizador). */
export function TranscripcionEnCurso({
  grabando,
  pausado,
  onCorregir,
}: {
  grabando: boolean
  pausado: boolean
  onCorregir?: (idx: number) => void
}) {
  const { asesorActivo, segmentos, errorVivo } = useLiveStore()
  const finRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [segmentos.length])

  const estadoChip = !asesorActivo ? null : errorVivo ? (
    <Chip tono="danger">interrumpida</Chip>
  ) : pausado ? (
    <Chip tono="warning">en pausa</Chip>
  ) : !grabando ? (
    <Chip>lista</Chip>
  ) : segmentos.length === 0 ? (
    <Chip tono="info">
      <Ear className="h-3 w-3" /> escuchando…
    </Chip>
  ) : (
    <Chip tono="info">
      <AudioLines className="h-3 w-3 animate-pulse" /> transcribiendo
    </Chip>
  )

  return (
    <Card className="p-4" id="transcripcion-en-curso">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold text-ink">Transcripción en curso</h2>
        <div className="flex items-center gap-1.5">
          {segmentos.length > 0 && <Chip>{segmentos.length} segmentos</Chip>}
          {estadoChip}
          <Chip tono="warning">parcial · en vivo</Chip>
        </div>
      </div>

      {!asesorActivo ? (
        <p className="text-[12px] text-ink-secondary" data-testid="vivo-no-disponible">
          La transcripción en vivo se activa con el <span className="font-medium text-ink">modo asesor</span> (arriba):
          es la misma captura que alimenta la guía de la entrevista.
        </p>
      ) : segmentos.length === 0 ? (
        <p className="text-[12px] text-ink-secondary" data-testid="vivo-esperando">
          {grabando
            ? 'Esperando voz… en cuanto haya conversación, el texto aparece aquí por frases.'
            : 'Aquí verás el texto en vivo cuando arranque la grabación. Con la fuente demo, reproduce la conversación de ejemplo.'}
        </p>
      ) : (
        <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1" data-testid="vivo-segmentos">
          {segmentos.slice(-30).map((s, i) => {
            const idx = Math.max(0, segmentos.length - 30) + i
            return (
              <div key={`${s.inicioS}-${i}`} className="flex gap-2.5">
                <span className="w-11 shrink-0 pt-0.5 font-mono text-[10px] text-ink-muted">[{fmtTiempo(s.inicioS)}]</span>
                <p className="min-w-0 text-[12.5px] leading-snug text-ink">
                  {onCorregir ? (
                    <button
                      type="button"
                      onClick={() => onCorregir(idx)}
                      title="¿Hablante equivocado? Toca para corregir — el identificador aprende de la corrección"
                      className="font-semibold text-accent hover:underline"
                      data-testid="corregir-hablante"
                    >
                      {s.hablante}:
                    </button>
                  ) : (
                    <span className="font-semibold text-accent">{s.hablante}:</span>
                  )}{' '}
                  {s.texto}
                </p>
              </div>
            )
          })}
          <div ref={finRef} />
        </div>
      )}

      {errorVivo && (
        <p className="mt-2 rounded-lg bg-danger-muted px-3 py-2 text-[12px] text-danger">
          {errorVivo} La grabación de audio continúa; puedes cambiar a la fuente demo o reintentar reanudando.
        </p>
      )}
    </Card>
  )
}
