'use client'

// Store de agendamiento: demo ∪ usuario con copy-on-write (patrón pre-discovery).
// Solo lo del usuario persiste; los fixtures se refunden en cada merge. Toda
// mutación de estado de cita pasa por aplicarTransicion (máquina explícita).

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ActorCita,
  Asesor,
  Cita,
  DisponibilidadSemanal,
  EnlaceReserva,
  EventoCita,
  Excepcion,
  NotificacionPendiente,
  ResultadoTransicion,
  Servicio,
} from './types'
import { aplicarTransicion } from './types'
import { fusionarNotificaciones } from './notificaciones'
import {
  ASESORES_DEMO,
  CITAS_DEMO,
  DISPONIBILIDAD_DEMO,
  ENLACES_DEMO,
  EXCEPCIONES_DEMO,
  NOTIFICACIONES_DEMO,
  SERVICIOS_DEMO,
} from './fixtures'

interface AgendaState {
  // Persistido (solo usuario)
  asesoresUsuario: Asesor[]
  disponibilidadUsuario: DisponibilidadSemanal[]
  excepcionesUsuario: Excepcion[]
  excepcionesOcultas: string[] // tombstones de excepciones demo borradas
  citasUsuario: Cita[]
  notificacionesUsuario: NotificacionPendiente[]
  enlacesUsuario: EnlaceReserva[]

  // Derivado (demo ∪ usuario) — se recalcula en cada set/merge
  asesores: Asesor[]
  disponibilidad: DisponibilidadSemanal[]
  excepciones: Excepcion[]
  citas: Cita[]
  notificaciones: NotificacionPendiente[]
  enlaces: EnlaceReserva[]
  /** Catálogo estático en MVP (sin edición de usuario). */
  servicios: Servicio[]

  crearCita: (cita: Cita) => void
  /** Única puerta de cambio de estado. `cambios` se aplica tras validar la
   *  transición (reasignar → asesorId; reprogramar → inicio/fin). */
  transicionar: (
    citaId: string,
    evento: EventoCita,
    actor: ActorCita,
    at: string,
    opts?: { detalle?: string; cambios?: Partial<Cita> }
  ) => ResultadoTransicion
  guardarDisponibilidad: (asesorId: string, reglas: DisponibilidadSemanal['reglas']) => void
  guardarAjustesAsesor: (asesorId: string, ajustes: Pick<Asesor, 'duracionDefaultMin' | 'bufferMin'>) => void
  agregarExcepcion: (excepcion: Excepcion) => void
  quitarExcepcion: (id: string) => void
  registrarNotificaciones: (nuevas: NotificacionPendiente[]) => void
  actualizarNotificacion: (id: string, cambios: Partial<NotificacionPendiente>) => void
  /** Consume un uso del enlace (un solo uso en mock). Null si no es consumible. */
  consumirEnlace: (token: string) => EnlaceReserva | null
}

type Persistido = Pick<
  AgendaState,
  | 'asesoresUsuario'
  | 'disponibilidadUsuario'
  | 'excepcionesUsuario'
  | 'excepcionesOcultas'
  | 'citasUsuario'
  | 'notificacionesUsuario'
  | 'enlacesUsuario'
>

function porId<T>(demo: T[], usuario: T[], id: (x: T) => string): T[] {
  const ids = new Set(usuario.map(id))
  return [...demo.filter((d) => !ids.has(id(d))), ...usuario]
}

function derivar(p: Persistido) {
  return {
    asesores: porId(ASESORES_DEMO, p.asesoresUsuario, (a) => a.id),
    disponibilidad: porId(DISPONIBILIDAD_DEMO, p.disponibilidadUsuario, (d) => d.asesorId),
    excepciones: [...EXCEPCIONES_DEMO.filter((e) => !p.excepcionesOcultas.includes(e.id)), ...p.excepcionesUsuario],
    citas: porId(CITAS_DEMO, p.citasUsuario, (c) => c.id),
    notificaciones: fusionarNotificaciones(NOTIFICACIONES_DEMO, p.notificacionesUsuario),
    enlaces: porId(ENLACES_DEMO, p.enlacesUsuario, (e) => e.token),
    servicios: SERVICIOS_DEMO,
  }
}

const VACIO: Persistido = {
  asesoresUsuario: [],
  disponibilidadUsuario: [],
  excepcionesUsuario: [],
  excepcionesOcultas: [],
  citasUsuario: [],
  notificacionesUsuario: [],
  enlacesUsuario: [],
}

export const useAgendaStore = create<AgendaState>()(
  persist(
    (set, get) => ({
      ...VACIO,
      ...derivar(VACIO),

      crearCita: (cita) =>
        set((s) => {
          const citasUsuario = [...s.citasUsuario.filter((c) => c.id !== cita.id), cita]
          return { citasUsuario, ...derivar({ ...s, citasUsuario }) }
        }),

      transicionar: (citaId, evento, actor, at, opts) => {
        const actual = get().citas.find((c) => c.id === citaId)
        if (!actual) return { ok: false, motivo: `Cita ${citaId} no encontrada.` }
        const r = aplicarTransicion(actual, evento, actor, at, opts?.detalle)
        if (!r.ok) return r
        const cita = { ...r.cita, ...(opts?.cambios ?? {}) }
        // Copy-on-write: tocar una demo la clona a usuario para que persista.
        set((s) => {
          const citasUsuario = [...s.citasUsuario.filter((c) => c.id !== citaId), cita]
          return { citasUsuario, ...derivar({ ...s, citasUsuario }) }
        })
        return { ok: true, cita }
      },

      guardarDisponibilidad: (asesorId, reglas) =>
        set((s) => {
          const disponibilidadUsuario = [
            ...s.disponibilidadUsuario.filter((d) => d.asesorId !== asesorId),
            { asesorId, reglas },
          ]
          return { disponibilidadUsuario, ...derivar({ ...s, disponibilidadUsuario }) }
        }),

      guardarAjustesAsesor: (asesorId, ajustes) =>
        set((s) => {
          const base = s.asesores.find((a) => a.id === asesorId)
          if (!base) return s
          const asesoresUsuario = [...s.asesoresUsuario.filter((a) => a.id !== asesorId), { ...base, ...ajustes }]
          return { asesoresUsuario, ...derivar({ ...s, asesoresUsuario }) }
        }),

      agregarExcepcion: (excepcion) =>
        set((s) => {
          const excepcionesUsuario = [...s.excepcionesUsuario, excepcion]
          return { excepcionesUsuario, ...derivar({ ...s, excepcionesUsuario }) }
        }),

      quitarExcepcion: (id) =>
        set((s) => {
          const esUsuario = s.excepcionesUsuario.some((e) => e.id === id)
          const excepcionesUsuario = s.excepcionesUsuario.filter((e) => e.id !== id)
          const excepcionesOcultas = esUsuario ? s.excepcionesOcultas : [...s.excepcionesOcultas, id]
          return { excepcionesUsuario, excepcionesOcultas, ...derivar({ ...s, excepcionesUsuario, excepcionesOcultas }) }
        }),

      registrarNotificaciones: (nuevas) =>
        set((s) => {
          const notificacionesUsuario = fusionarNotificaciones(s.notificacionesUsuario, nuevas)
          return { notificacionesUsuario, ...derivar({ ...s, notificacionesUsuario }) }
        }),

      actualizarNotificacion: (id, cambios) =>
        set((s) => {
          const actual = s.notificaciones.find((n) => n.id === id)
          if (!actual) return s
          const notificacionesUsuario = fusionarNotificaciones(s.notificacionesUsuario, [{ ...actual, ...cambios }])
          return { notificacionesUsuario, ...derivar({ ...s, notificacionesUsuario }) }
        }),

      consumirEnlace: (token) => {
        const enlace = get().enlaces.find((e) => e.token === token)
        if (!enlace || enlace.usos >= enlace.usosMax) return null
        const consumido = { ...enlace, usos: enlace.usos + 1 }
        set((s) => {
          const enlacesUsuario = [...s.enlacesUsuario.filter((e) => e.token !== token), consumido]
          return { enlacesUsuario, ...derivar({ ...s, enlacesUsuario }) }
        })
        return consumido
      },
    }),
    {
      name: 'meeting-copilot-agenda',
      partialize: (s): Persistido => ({
        asesoresUsuario: s.asesoresUsuario,
        disponibilidadUsuario: s.disponibilidadUsuario,
        excepcionesUsuario: s.excepcionesUsuario,
        excepcionesOcultas: s.excepcionesOcultas,
        citasUsuario: s.citasUsuario,
        notificacionesUsuario: s.notificacionesUsuario,
        enlacesUsuario: s.enlacesUsuario,
      }),
      merge: (persisted, actual) => {
        const p = { ...VACIO, ...((persisted ?? {}) as Partial<Persistido>) }
        return { ...actual, ...p, ...derivar(p) }
      },
    }
  )
)

export function useAsesor(idOSlug: string | null): Asesor | null {
  return useAgendaStore((s) =>
    idOSlug ? (s.asesores.find((a) => a.id === idOSlug || a.slug === idOSlug) ?? null) : null
  )
}
