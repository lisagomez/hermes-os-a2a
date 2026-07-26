'use client'

// Estado de la SESIÓN de grabación con modo asesor.
// Persistente: solo la preferencia del modo asesor (localStorage).
// Temporal (se resetea por sesión): segmentos vivos, overrides del asesor,
// preguntas usadas, señales fijadas. Al guardar la sesión, los segmentos se
// vuelven Reunion+Transcripcion normales y el motor recalcula TODO
// determinísticamente — el contexto del Prompter no se pierde porque deriva
// de los mismos segmentos.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DimensionId, Segmento } from '@/features/domain/types'
import type { FuenteVivoId } from './fuentes-vivo'

/** Constancia de una pregunta que el asesor SÍ usó (bitácora de la sesión). */
export interface PreguntaUsada {
  pregunta: string
  dimension: DimensionId
  /** Momento (reloj) en que el asesor la marcó como usada. */
  timestampISO: string
  /** Segundo de la conversación (fin del último segmento capturado), si hay audio. */
  enSegundoS: number | null
}

interface LiveState {
  asesorActivo: boolean
  fuente: FuenteVivoId
  /** Atribución de hablantes en vivo: 'auto' = diarización heurística por voz
   *  (con corrección de un clic); 'manual' = switch ¿Quién habla?. */
  atribucion: 'auto' | 'manual'
  hablanteActual: 'Cliente' | 'Yo'
  /** Contexto de la entrevista (modo asesor). El nombre del asesor persiste
   *  (suele ser la misma persona); el del lead es por sesión. */
  asesorNombre: string
  leadNombre: string
  guiaVisible: boolean
  segmentos: Segmento[]
  temasCubiertosManual: DimensionId[]
  preguntasDescartadas: string[]
  /** Bitácora de sesión: preguntas que el asesor marcó "La usé", con timestamp. */
  preguntasUsadas: PreguntaUsada[]
  senalesFijadas: string[]
  errorVivo: string | null

  setAsesor: (v: boolean) => void
  setFuente: (f: FuenteVivoId) => void
  setAtribucion: (a: 'auto' | 'manual') => void
  setHablante: (h: 'Cliente' | 'Yo') => void
  reasignarSegmento: (idx: number, nuevoHablante: string) => void
  setAsesorNombre: (n: string) => void
  setLeadNombre: (n: string) => void
  setGuiaVisible: (v: boolean) => void
  agregarSegmento: (s: Segmento) => void
  marcarTema: (d: DimensionId) => void
  descartarPregunta: (q: string) => void
  /** "La usé": registra la pregunta en la bitácora de sesión Y avanza la rotación
   *  (a diferencia de descartarPregunta, que solo pide otra sin dejar constancia). */
  registrarPreguntaUsada: (q: string, dimension: DimensionId) => void
  toggleFijarSenal: (id: string) => void
  setErrorVivo: (m: string | null) => void
  resetSesion: () => void
}

/** Nombres efectivos de los hablantes de la sesión en vivo. */
export function nombresSesion(s: Pick<LiveState, 'asesorNombre' | 'leadNombre'>): { interno: string; cliente: string } {
  return { interno: s.asesorNombre.trim() || 'Yo', cliente: s.leadNombre.trim() || 'Cliente' }
}

export const useLiveStore = create<LiveState>()(
  persist(
    (set) => ({
      asesorActivo: false,
      fuente: 'microfono',
      atribucion: 'auto',
      hablanteActual: 'Cliente',
      asesorNombre: '',
      leadNombre: '',
      guiaVisible: true,
      segmentos: [],
      temasCubiertosManual: [],
      preguntasDescartadas: [],
      preguntasUsadas: [],
      senalesFijadas: [],
      errorVivo: null,

      setAsesor: (v) => set({ asesorActivo: v }),
      setFuente: (f) => set({ fuente: f }),
      setAtribucion: (a) => set({ atribucion: a }),
      setHablante: (h) => set({ hablanteActual: h }),
      reasignarSegmento: (idx, nuevoHablante) =>
        set((st) => ({
          segmentos: st.segmentos.map((s, i) => (i === idx ? { ...s, hablante: nuevoHablante } : s)),
        })),
      setAsesorNombre: (n) => set({ asesorNombre: n }),
      setLeadNombre: (n) => set({ leadNombre: n }),
      setGuiaVisible: (v) => set({ guiaVisible: v }),
      agregarSegmento: (s) => set((st) => ({ segmentos: [...st.segmentos, s] })),
      marcarTema: (d) =>
        set((st) => ({
          temasCubiertosManual: st.temasCubiertosManual.includes(d) ? st.temasCubiertosManual : [...st.temasCubiertosManual, d],
        })),
      descartarPregunta: (q) =>
        set((st) => ({
          preguntasDescartadas: st.preguntasDescartadas.includes(q) ? st.preguntasDescartadas : [...st.preguntasDescartadas, q],
        })),
      registrarPreguntaUsada: (q, dimension) =>
        set((st) => ({
          preguntasUsadas: st.preguntasUsadas.some((p) => p.pregunta === q)
            ? st.preguntasUsadas
            : [
                ...st.preguntasUsadas,
                {
                  pregunta: q,
                  dimension,
                  timestampISO: new Date().toISOString(),
                  enSegundoS: st.segmentos.length > 0 ? Math.round(st.segmentos[st.segmentos.length - 1].finS) : null,
                },
              ],
          // Usarla también la saca de la rotación: el prompter avanza a la siguiente.
          preguntasDescartadas: st.preguntasDescartadas.includes(q) ? st.preguntasDescartadas : [...st.preguntasDescartadas, q],
        })),
      toggleFijarSenal: (id) =>
        set((st) => ({
          senalesFijadas: st.senalesFijadas.includes(id) ? st.senalesFijadas.filter((x) => x !== id) : [...st.senalesFijadas, id],
        })),
      setErrorVivo: (m) => set({ errorVivo: m }),
      resetSesion: () =>
        set({
          segmentos: [],
          temasCubiertosManual: [],
          preguntasDescartadas: [],
          preguntasUsadas: [],
          senalesFijadas: [],
          errorVivo: null,
          hablanteActual: 'Cliente',
        }),
    }),
    {
      name: 'meeting-copilot-asesor',
      partialize: (s) => ({ asesorActivo: s.asesorActivo, fuente: s.fuente, atribucion: s.atribucion, asesorNombre: s.asesorNombre }),
    }
  )
)
