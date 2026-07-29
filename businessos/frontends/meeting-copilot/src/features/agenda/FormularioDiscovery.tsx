'use client'

// Mini-formulario de pre-discovery (Ruta B, patrón intake de Acuity): sus
// respuestas viajan como brief en la SolicitudReserva y alimentan la prep del
// asesor (bandeja M2 / PrepAsesor).

import { useState } from 'react'
import { Button } from '@/shared/components/ui'
import type { RespuestaDiscovery } from './types'

export const PREGUNTAS_DISCOVERY = [
  '¿Cuál es el giro del negocio?',
  '¿Qué objetivo persigues con la sesión?',
  '¿Qué tan urgente es?',
  '¿Algo de contexto que el asesor deba saber antes?',
] as const

export function FormularioDiscovery({ onListo }: { onListo: (brief: RespuestaDiscovery[]) => void }) {
  const [respuestas, setRespuestas] = useState<string[]>(PREGUNTAS_DISCOVERY.map(() => ''))
  // La última pregunta (contexto) es opcional; las tres primeras definen la sesión.
  const completas = respuestas.slice(0, 3).every((r) => r.trim() !== '')

  return (
    <div className="space-y-3" data-testid="formulario-discovery">
      {PREGUNTAS_DISCOVERY.map((p, i) => (
        <div key={p}>
          <label className="mb-1 block text-[12px] font-medium text-ink-secondary" htmlFor={`disc-${i}`}>
            {p}
            {i === 3 ? ' (opcional)' : ''}
          </label>
          <input
            id={`disc-${i}`}
            value={respuestas[i]}
            maxLength={600}
            onChange={(e) => setRespuestas((prev) => prev.map((r, j) => (j === i ? e.target.value : r)))}
            className="input"
            data-testid={`disc-respuesta-${i}`}
          />
        </div>
      ))}
      <Button
        variante="primary"
        className="w-full"
        disabled={!completas}
        data-testid="disc-continuar"
        onClick={() =>
          onListo(
            PREGUNTAS_DISCOVERY.map((pregunta, i) => ({ pregunta, respuesta: respuestas[i].trim() })).filter(
              (r) => r.respuesta !== ''
            )
          )
        }
      >
        Continuar a elegir asesor
      </Button>
    </div>
  )
}
