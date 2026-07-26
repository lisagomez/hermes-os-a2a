'use client'

// Bitácora de grabaciones de la sección Grabación.
// Qué persiste: la METADATA de cada registro (localStorage). Qué no: el audio
// binario, que vive en memoria de la sesión del navegador (audiosBitacora) —
// tras recargar, Descargar/Compartir archivo quedan deshabilitados con
// explicación honesta; el enlace a la reunión/transcripción sigue funcionando.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type EstadoBitacora = 'lista' | 'en_transcripcion' | 'sesion_guardada'

export interface RegistroBitacora {
  id: string
  titulo: string // nombre del archivo o de la sesión
  fechaISO: string
  duracionS: number
  estado: EstadoBitacora
  origen: 'grabacion' | 'sesion_asesor'
  asesorNombre: string | null
  leadNombre: string | null
  reunionId: string | null // se llena al guardar sesión o completar transcripción
  mime: string
}

// Binarios por registro (no serializables — memoria de la sesión).
const audios = new Map<string, Blob>()

export function audioDeRegistro(id: string): Blob | null {
  return audios.get(id) ?? null
}

interface BitacoraState {
  registros: RegistroBitacora[]
  agregar: (registro: RegistroBitacora, blob: Blob | null) => void
  actualizar: (id: string, patch: Partial<RegistroBitacora>) => void
}

export const useBitacoraStore = create<BitacoraState>()(
  persist(
    (set) => ({
      registros: [],
      agregar: (registro, blob) => {
        if (blob) audios.set(registro.id, blob)
        set((s) => ({ registros: [registro, ...s.registros].slice(0, 30) }))
      },
      actualizar: (id, patch) =>
        set((s) => ({ registros: s.registros.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
    }),
    {
      name: 'meeting-copilot-bitacora',
      partialize: (s) => ({ registros: s.registros }),
    }
  )
)
