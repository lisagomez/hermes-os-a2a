'use client'

// Capa cliente del Discovery Analyst llm: pide el análisis una vez por
// transcripción, VALIDA la evidencia contra los segmentos reales
// (validarAnalisisIA descarta lo no respaldado) y FUSIONA con el análisis de
// reglas: las dimensiones de la IA (con evidencia) mandan sobre las del
// léxico; los pesos, la aritmética del score, los riesgos y el mapa de
// stakeholders siguen siendo los MISMOS del motor determinista.

import { create } from 'zustand'
import { validarAnalisisIA, type AnalisisIA } from '@/features/agents/prompt-insights'
import { evaluarRiesgos, mapearStakeholders, type AnalisisReunion } from './engine'
import { ORDEN_PRIORIDAD } from '@/features/playbooks/defaults'
import { ETIQUETA_DIMENSION, type Playbook, type Reunion, type ScoreDiscovery, type Transcripcion } from '@/features/domain/types'
import { MOTOR_AGENTE } from '@/shared/lib/config'

export type EstadoIA =
  | { estado: 'inactivo' }
  | { estado: 'cargando' }
  | { estado: 'listo'; analisis: AnalisisIA; modelo: string }
  | { estado: 'error'; error: string }

interface IAState {
  porTranscripcion: Record<string, EstadoIA>
  solicitar: (reunion: Reunion, transcripcion: Transcripcion) => void
}

export const useAnalisisIAStore = create<IAState>()((set, get) => ({
  porTranscripcion: {},
  solicitar: (reunion, transcripcion) => {
    if (MOTOR_AGENTE !== 'llm') return
    const clave = transcripcion.id
    const actual = get().porTranscripcion[clave]
    if (actual && actual.estado !== 'error') return // una sola llamada por transcripción
    set((s) => ({ porTranscripcion: { ...s.porTranscripcion, [clave]: { estado: 'cargando' } } }))
    void (async () => {
      try {
        const respuesta = await fetch('/api/asesor/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reunion: {
              id: reunion.id,
              titulo: reunion.titulo,
              cuenta: reunion.cuenta,
              tipoReunion: reunion.tipoReunion,
              participantes: reunion.participantes,
            },
            segmentos: transcripcion.segmentos.slice(0, 120),
          }),
        })
        const data = (await respuesta.json()) as { analisis?: unknown; modelo?: string; error?: string }
        if (!respuesta.ok || data.analisis === undefined) {
          set((s) => ({ porTranscripcion: { ...s.porTranscripcion, [clave]: { estado: 'error', error: data.error ?? `HTTP ${respuesta.status}` } } }))
          return
        }
        const validado = validarAnalisisIA(data.analisis, reunion.id, transcripcion.segmentos)
        if (!validado) {
          set((s) => ({
            porTranscripcion: { ...s.porTranscripcion, [clave]: { estado: 'error', error: 'La respuesta del modelo no cumplió el contrato (evidencia/forma).' } },
          }))
          return
        }
        set((s) => ({ porTranscripcion: { ...s.porTranscripcion, [clave]: { estado: 'listo', analisis: validado, modelo: data.modelo ?? '' } } }))
      } catch (e) {
        set((s) => ({ porTranscripcion: { ...s.porTranscripcion, [clave]: { estado: 'error', error: e instanceof Error ? e.message : String(e) } } }))
      }
    })()
  },
}))

/** Fusión IA×reglas: misma aritmética de score, mismos riesgos derivados. */
export function fusionarAnalisis(base: AnalisisReunion, ia: AnalisisIA, playbook: Playbook, reunion: Reunion): AnalisisReunion {
  const dimensiones = playbook.dimensiones.map(({ dimension, peso }) => {
    const deIA = ia.dimensiones.find((d) => d.dimension === dimension)
    const deReglas = base.score.dimensiones.find((d) => d.dimension === dimension)
    const elegido = deIA ?? deReglas
    return { dimension, peso, estado: elegido?.estado ?? 'faltante', evidencia: elegido?.evidencia ?? [], explicacion: elegido?.explicacion ?? '' }
  })

  const total = Math.round(
    dimensiones.reduce((acc, d) => acc + (d.estado === 'cubierta' ? d.peso : d.estado === 'parcial' ? d.peso / 2 : 0), 0)
  )

  // Unión de insights (IA primero) con dedupe por categoría+segmento de evidencia.
  const vistos = new Set<string>()
  const insights = [...ia.insights, ...base.insights].filter((i) => {
    const clave = `${i.categoria}:${i.evidencia[0]?.segmentoIdx ?? -1}`
    if (vistos.has(clave)) return false
    vistos.add(clave)
    return true
  })

  const huecos = ORDEN_PRIORIDAD.filter((dim) => playbook.dimensiones.some((d) => d.dimension === dim))
    .map((dim) => dimensiones.find((d) => d.dimension === dim))
    .filter((d): d is NonNullable<typeof d> => d !== undefined && d.estado !== 'cubierta')
    .map((d) => ({
      dimension: d.dimension,
      motivo: d.explicacion,
      preguntaSugerida: playbook.bancoPreguntas[d.dimension][0],
      justificacion: `${ETIQUETA_DIMENSION[d.dimension]}: ${d.explicacion}`,
    }))

  const score: ScoreDiscovery = { ...base.score, total, dimensiones, huecos }
  const riesgos = evaluarRiesgos(score, insights)
  const stakeholders = mapearStakeholders(reunion, insights)

  return { insights, score, acciones: base.acciones, riesgos, stakeholders }
}
