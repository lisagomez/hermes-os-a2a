'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Accion, Lead, Playbook, Reunion, Transcripcion } from './types'
import { LEADS_DEMO, REUNIONES_DEMO, TRANSCRIPCIONES_DEMO } from './fixtures'
import { PLAYBOOKS_DEFAULT } from '@/features/playbooks/defaults'
import { registrarActivoEntrevista } from '@/features/activos/entrevista'

function ultimaAnalizada(reuniones: Reunion[], transcripciones: Transcripcion[]): string | null {
  const conTranscripcion = reuniones.filter((r) => transcripciones.some((t) => t.reunionId === r.id))
  if (conTranscripcion.length === 0) return null
  return conTranscripcion.sort((a, b) => b.fecha.localeCompare(a.fecha))[0].id
}

interface AppState {
  // Base: fixtures + lo creado por el usuario (solo lo del usuario persiste).
  reuniones: Reunion[]
  transcripciones: Transcripcion[]
  reunionesUsuario: Reunion[]
  transcripcionesUsuario: Transcripcion[]
  leads: Lead[]
  leadsUsuario: Lead[]
  accionesEstado: Record<string, Accion['estado']> // `${reunionId}:${accionId}`
  playbooks: Playbook[]
  ultimaReunionAnalizada: string | null

  agregarReunion: (reunion: Reunion, transcripcion?: Transcripcion) => void
  agregarLead: (lead: Lead) => void
  moverEtapaLead: (leadId: string, etapa: Lead['etapa']) => void
  marcarEstadoReunion: (reunionId: string, estado: Reunion['estado']) => void
  setAccionEstado: (reunionId: string, accionId: string, estado: Accion['estado']) => void
  actualizarPlaybook: (playbook: Playbook) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      reuniones: REUNIONES_DEMO,
      transcripciones: TRANSCRIPCIONES_DEMO,
      reunionesUsuario: [],
      transcripcionesUsuario: [],
      leads: LEADS_DEMO,
      leadsUsuario: [],
      accionesEstado: {},
      playbooks: PLAYBOOKS_DEFAULT,
      ultimaReunionAnalizada: ultimaAnalizada(REUNIONES_DEMO, TRANSCRIPCIONES_DEMO),

      agregarReunion: (reunion, transcripcion) => {
        set((s) => {
          const reunionesUsuario = [...s.reunionesUsuario, reunion]
          const transcripcionesUsuario = transcripcion ? [...s.transcripcionesUsuario, transcripcion] : s.transcripcionesUsuario
          const reuniones = [...REUNIONES_DEMO, ...reunionesUsuario]
          const transcripciones = [...TRANSCRIPCIONES_DEMO, ...transcripcionesUsuario]
          return {
            reunionesUsuario,
            transcripcionesUsuario,
            reuniones,
            transcripciones,
            ultimaReunionAnalizada: ultimaAnalizada(reuniones, transcripciones),
          }
        })
        // Toda entrevista con transcripción se cataloga como Activo Digital
        // (espejo ACT). Fire-and-forget consciente: el registro no bloquea la UI
        // y su ausencia se detecta en el tab Activo & Costeo (fallo visible).
        if (transcripcion) void registrarActivoEntrevista(reunion, transcripcion)
      },

      agregarLead: (lead) =>
        set((s) => {
          const leadsUsuario = [...s.leadsUsuario, lead]
          return { leadsUsuario, leads: [...LEADS_DEMO, ...leadsUsuario] }
        }),

      moverEtapaLead: (leadId, etapa) =>
        set((s) => {
          const mover = (lista: Lead[]) => lista.map((l) => (l.leadId === leadId ? { ...l, etapa } : l))
          return { leads: mover(s.leads), leadsUsuario: mover(s.leadsUsuario) }
        }),

      marcarEstadoReunion: (reunionId, estado) =>
        set((s) => {
          const actualizar = (lista: Reunion[]) => lista.map((r) => (r.id === reunionId ? { ...r, estado } : r))
          return {
            reuniones: actualizar(s.reuniones),
            reunionesUsuario: actualizar(s.reunionesUsuario),
          }
        }),

      setAccionEstado: (reunionId, accionId, estado) =>
        set((s) => ({ accionesEstado: { ...s.accionesEstado, [`${reunionId}:${accionId}`]: estado } })),

      actualizarPlaybook: (playbook) =>
        set((s) => ({ playbooks: s.playbooks.map((p) => (p.id === playbook.id ? playbook : p)) })),
    }),
    {
      name: 'meeting-copilot-datos',
      partialize: (s) => ({
        reunionesUsuario: s.reunionesUsuario,
        transcripcionesUsuario: s.transcripcionesUsuario,
        leadsUsuario: s.leadsUsuario,
        accionesEstado: s.accionesEstado,
        playbooks: s.playbooks,
      }),
      merge: (persisted, actual) => {
        const p = (persisted ?? {}) as Partial<AppState>
        const reunionesUsuario = p.reunionesUsuario ?? []
        const transcripcionesUsuario = p.transcripcionesUsuario ?? []
        const leadsUsuario = p.leadsUsuario ?? []
        const reuniones = [...REUNIONES_DEMO, ...reunionesUsuario]
        const transcripciones = [...TRANSCRIPCIONES_DEMO, ...transcripcionesUsuario]
        return {
          ...actual,
          reunionesUsuario,
          transcripcionesUsuario,
          leadsUsuario,
          leads: [...LEADS_DEMO, ...leadsUsuario],
          accionesEstado: p.accionesEstado ?? {},
          playbooks: p.playbooks && p.playbooks.length > 0 ? p.playbooks : PLAYBOOKS_DEFAULT,
          reuniones,
          transcripciones,
          ultimaReunionAnalizada: ultimaAnalizada(reuniones, transcripciones),
        }
      },
    }
  )
)

export function useReunion(id: string): { reunion: Reunion | null; transcripcion: Transcripcion | null } {
  const reunion = useAppStore((s) => s.reuniones.find((r) => r.id === id) ?? null)
  const transcripcion = useAppStore((s) => s.transcripciones.find((t) => t.reunionId === id) ?? null)
  return { reunion, transcripcion }
}
