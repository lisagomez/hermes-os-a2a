'use client'

// Hook compartido (Prompter y Guided Meeting) del motor llm: la IA redacta la
// pregunta del hueco vigente con el contexto de la conversación. Con
// AGENT_ENGINE=rules, o ante cualquier fallo, devuelve la pregunta del banco
// con la fuente marcada — el flujo jamás se rompe y el estado siempre se ve.

import { useEffect, useRef, useState } from 'react'
import type { HuecoDiscovery, Segmento, TipoReunion } from '@/features/domain/types'
import { MOTOR_AGENTE } from '@/shared/lib/config'

export interface PreguntaSugerida {
  pregunta: string
  justificacion: string
  fuente: 'ia' | 'banco'
  cargando: boolean
  error: string | null
}

interface Args {
  hueco: HuecoDiscovery | null
  segmentos: Segmento[]
  tipoReunion: TipoReunion
  leadNombre: string | null
  preguntasPrevias: string[]
  briefContexto?: string | null
}

const cache = new Map<string, { pregunta: string; justificacion: string }>()

export function usePreguntaIA({ hueco, segmentos, tipoReunion, leadNombre, preguntasPrevias, briefContexto }: Args): PreguntaSugerida {
  const [estado, setEstado] = useState<{ clave: string; pregunta: string; justificacion: string; cargando: boolean; error: string | null }>({
    clave: '',
    pregunta: '',
    justificacion: '',
    cargando: false,
    error: null,
  })
  const abortRef = useRef<AbortController | null>(null)

  // La clave cambia con la dimensión, la pregunta base ("otra pregunta" re-genera)
  // y cada ~5 frases nuevas (contexto más fresco).
  const clave = hueco ? `${hueco.dimension}|${hueco.preguntaSugerida}|${Math.floor(segmentos.length / 5)}` : ''

  useEffect(() => {
    if (MOTOR_AGENTE !== 'llm' || !hueco || clave === '') return
    abortRef.current?.abort()
    const controlador = new AbortController()
    abortRef.current = controlador
    const enCache = cache.get(clave)
    // Debounce: en vivo llegan frases seguidas; espera un respiro antes de
    // llamar (cache-hit resuelve en el siguiente tick, sin red).
    const timer = setTimeout(async () => {
      if (enCache) {
        setEstado({ clave, ...enCache, cargando: false, error: null })
        return
      }
      setEstado((s) => ({ ...s, clave, cargando: true, error: null }))
      try {
        const respuesta = await fetch('/api/asesor/pregunta', {
          method: 'POST',
          signal: controlador.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dimension: hueco.dimension,
            motivo: hueco.motivo,
            preguntaBanco: hueco.preguntaSugerida,
            tipoReunion,
            leadNombre,
            contexto: segmentos.slice(-24).map((s) => ({ hablante: s.hablante, texto: s.texto })),
            preguntasPrevias: preguntasPrevias.slice(-12),
            briefContexto: briefContexto ?? undefined,
          }),
        })
        const data = (await respuesta.json()) as { pregunta?: string; justificacion?: string; error?: string }
        if (!respuesta.ok || !data.pregunta) {
          setEstado({ clave, pregunta: '', justificacion: '', cargando: false, error: data.error ?? `HTTP ${respuesta.status}` })
          return
        }
        const valor = { pregunta: data.pregunta, justificacion: data.justificacion ?? '' }
        cache.set(clave, valor)
        setEstado({ clave, ...valor, cargando: false, error: null })
      } catch (e) {
        if (controlador.signal.aborted) return
        setEstado({ clave, pregunta: '', justificacion: '', cargando: false, error: e instanceof Error ? e.message : String(e) })
      }
    }, enCache ? 0 : 700)
    return () => {
      clearTimeout(timer)
      controlador.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la clave condensa las dependencias relevantes
  }, [clave])

  if (!hueco) return { pregunta: '', justificacion: '', fuente: 'banco', cargando: false, error: null }

  if (MOTOR_AGENTE === 'llm' && estado.clave === clave && estado.pregunta) {
    return { pregunta: estado.pregunta, justificacion: estado.justificacion || hueco.justificacion, fuente: 'ia', cargando: false, error: null }
  }

  return {
    pregunta: hueco.preguntaSugerida,
    justificacion: hueco.justificacion,
    fuente: 'banco',
    cargando: MOTOR_AGENTE === 'llm' && estado.clave === clave && estado.cargando,
    error: MOTOR_AGENTE === 'llm' && estado.clave === clave ? estado.error : null,
  }
}
