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

interface LiveState {
  asesorActivo: boolean
  fuente: FuenteVivoId
  hablanteActual: 'Cliente' | 'Yo'
  guiaVisible: boolean
  segmentos: Segmento[]
  temasCubiertosManual: DimensionId[]
  preguntasDescartadas: string[]
  senalesFijadas: string[]
  errorVivo: string | null

  setAsesor: (v: boolean) => void
  setFuente: (f: FuenteVivoId) => void
  setHablante: (h: 'Cliente' | 'Yo') => void
  setGuiaVisible: (v: boolean) => void
  agregarSegmento: (s: Segmento) => void
  marcarTema: (d: DimensionId) => void
  descartarPregunta: (q: string) => void
  toggleFijarSenal: (id: string) => void
  setErrorVivo: (m: string | null) => void
  resetSesion: () => void
}

export const useLiveStore = create<LiveState>()(
  persist(
    (set) => ({
      asesorActivo: false,
      fuente: 'microfono',
      hablanteActual: 'Cliente',
      guiaVisible: true,
      segmentos: [],
      temasCubiertosManual: [],
      preguntasDescartadas: [],
      senalesFijadas: [],
      errorVivo: null,

      setAsesor: (v) => set({ asesorActivo: v }),
      setFuente: (f) => set({ fuente: f }),
      setHablante: (h) => set({ hablanteActual: h }),
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
      toggleFijarSenal: (id) =>
        set((st) => ({
          senalesFijadas: st.senalesFijadas.includes(id) ? st.senalesFijadas.filter((x) => x !== id) : [...st.senalesFijadas, id],
        })),
      setErrorVivo: (m) => set({ errorVivo: m }),
      resetSesion: () =>
        set({ segmentos: [], temasCubiertosManual: [], preguntasDescartadas: [], senalesFijadas: [], errorVivo: null, hablanteActual: 'Cliente' }),
    }),
    {
      name: 'meeting-copilot-asesor',
      partialize: (s) => ({ asesorActivo: s.asesorActivo, fuente: s.fuente }),
    }
  )
)
