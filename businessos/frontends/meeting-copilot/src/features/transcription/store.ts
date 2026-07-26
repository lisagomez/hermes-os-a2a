'use client'

import { create } from 'zustand'
import type { Reunion, Segmento, TrabajoTranscripcion, Transcripcion } from '@/features/domain/types'
import { AUDIO_DEMO, contenidoDesdeSegmentos } from '@/features/domain/fixtures'
import { crearProvider } from './providers'
import { useAppStore } from '@/features/domain/store'
import { useBitacoraStore } from '@/features/recording/bitacora-store'
import { nuevoId } from '@/shared/lib/format'

const MAX_INTENTOS = 3

// Binarios por job (fuera del estado: un Blob no es serializable/persistible).
// El provider mock lo ignora; los reales (transcriptor-local, a2a) lo suben.
const blobsPorJob = new Map<string, Blob>()

/** Sesión en vivo asociada a un job: si la grabación YA capturó su
 *  transcripción (modo asesor), la cola la usa TAL CUAL — jamás la sustituye
 *  por la demo del provider mock. */
export interface SesionVivoJob {
  segmentos: Segmento[]
  motor: string // 'en-vivo (web-speech)' | 'en-vivo (demo)'
  reunionBase: Reunion // participantes/título/cuenta reales de la sesión
}
const sesionesPorJob = new Map<string, SesionVivoJob>()
const registrosBitacoraPorJob = new Map<string, string>()

export interface ArchivoEntrada {
  filename: string
  blob?: Blob
  sesion?: SesionVivoJob
  registroBitacoraId?: string
}

interface TranscripcionState {
  jobs: TrabajoTranscripcion[]
  procesando: boolean
  agregarArchivos: (archivos: ArchivoEntrada[]) => void
  agregarDemo: () => void
  reintentar: (jobId: string) => void
  _drenar: () => Promise<void>
}

function nuevoJob(filename: string): TrabajoTranscripcion {
  const ahora = new Date().toISOString()
  return {
    id: nuevoId('job'),
    audioId: nuevoId('audio'),
    filename,
    motor: crearProvider().nombre,
    estado: 'pendiente',
    progreso: 0,
    idioma: 'es-MX',
    intentos: 0,
    error: null,
    reunionId: null,
    creadoAt: ahora,
    actualizadoAt: ahora,
  }
}

function confianzaGlobalDe(prom: number): Transcripcion['confianzaGlobal'] {
  if (prom >= 0.9) return 'alta'
  if (prom >= 0.7) return 'media'
  return 'baja'
}

export const useTranscripcionStore = create<TranscripcionState>()((set, get) => ({
  jobs: [],
  procesando: false,

  agregarArchivos: (archivos) => {
    const nuevos = archivos.map((a) => {
      const job = nuevoJob(a.filename)
      if (a.blob) blobsPorJob.set(job.id, a.blob)
      if (a.sesion) {
        sesionesPorJob.set(job.id, a.sesion)
        job.motor = a.sesion.motor
      }
      if (a.registroBitacoraId) registrosBitacoraPorJob.set(job.id, a.registroBitacoraId)
      return job
    })
    set((s) => ({ jobs: [...s.jobs, ...nuevos] }))
    void get()._drenar()
  },

  agregarDemo: () => {
    set((s) => ({ jobs: [...s.jobs, nuevoJob(AUDIO_DEMO.filename)] }))
    void get()._drenar()
  },

  reintentar: (jobId) => {
    set((s) => ({
      jobs: s.jobs.map((j) =>
        j.id === jobId && j.estado === 'fallido' && j.intentos < MAX_INTENTOS
          ? { ...j, estado: 'pendiente', progreso: 0, error: null, actualizadoAt: new Date().toISOString() }
          : j
      ),
    }))
    void get()._drenar()
  },

  // Cola FIFO SERIAL (un job a la vez), como el transcriptor externo.
  _drenar: async () => {
    if (get().procesando) return
    set({ procesando: true })
    const actualizar = (id: string, patch: Partial<TrabajoTranscripcion>) =>
      set((s) => ({
        jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch, actualizadoAt: new Date().toISOString() } : j)),
      }))
    try {
      for (;;) {
        const pendiente = get().jobs.find((j) => j.estado === 'pendiente')
        if (!pendiente) break
        actualizar(pendiente.id, { estado: 'procesando', progreso: 0, intentos: pendiente.intentos + 1 })
        try {
          // Con sesión en vivo, la transcripción REAL ya existe: se usa tal
          // cual y el provider no corre (el mock jamás pisa datos reales).
          const sesion = sesionesPorJob.get(pendiente.id)
          const resultado = sesion
            ? { motor: sesion.motor, segmentos: sesion.segmentos }
            : await crearProvider().transcribir(
                { filename: pendiente.filename, blob: blobsPorJob.get(pendiente.id) },
                (pct) => actualizar(pendiente.id, { progreso: pct })
              )
          // La salida normalizada crea reunión + transcripción en el store central.
          const base = sesion?.reunionBase ?? AUDIO_DEMO.reunionBase
          const reunionId = nuevoId('r')
          const prom = resultado.segmentos.reduce((a, s) => a + s.confianza, 0) / resultado.segmentos.length
          const reunion: Reunion = {
            ...base,
            id: reunionId,
            titulo: sesion ? base.titulo : `Transcripción — ${pendiente.filename}`,
            fecha: new Date().toISOString(),
            duracionS: resultado.segmentos.length > 0 ? Math.round(resultado.segmentos[resultado.segmentos.length - 1].finS) : null,
            origen: 'audio',
            estado: 'analizada',
          }
          const transcripcion: Transcripcion = {
            id: nuevoId('t'),
            reunionId,
            motor: resultado.motor,
            confianzaGlobal: confianzaGlobalDe(prom),
            contenido: contenidoDesdeSegmentos(resultado.segmentos),
            segmentos: resultado.segmentos,
          }
          useAppStore.getState().agregarReunion(reunion, transcripcion)
          actualizar(pendiente.id, { estado: 'completado', progreso: 100, reunionId })
          // Liga la reunión resultante al registro de la bitácora.
          const registroId = registrosBitacoraPorJob.get(pendiente.id)
          if (registroId) useBitacoraStore.getState().actualizar(registroId, { reunionId, estado: 'sesion_guardada' })
        } catch (e) {
          // Fallo VISIBLE: el error queda en el job y se pinta en UI (nunca silencioso).
          actualizar(pendiente.id, { estado: 'fallido', error: e instanceof Error ? e.message : String(e) })
        }
      }
    } finally {
      set({ procesando: false })
    }
  },
}))
