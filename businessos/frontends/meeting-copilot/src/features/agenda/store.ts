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
  asesoresOcultos: string[] // tombstones de asesores borrados (demo y usuario)
  disponibilidadUsuario: DisponibilidadSemanal[]
  excepcionesUsuario: Excepcion[]
  excepcionesOcultas: string[] // tombstones de excepciones demo borradas
  citasUsuario: Cita[]
  notificacionesUsuario: NotificacionPendiente[]
  enlacesUsuario: EnlaceReserva[]

  // Derivado (demo ∪ usuario) — se recalcula en cada set/merge
  asesores: Asesor[]
  /** Incluye borrados: para resolver nombres en citas históricas (jamás mostrar un id crudo). */
  asesoresTodos: Asesor[]
  disponibilidad: DisponibilidadSemanal[]
  excepciones: Excepcion[]
  citas: Cita[]
  notificaciones: NotificacionPendiente[]
  enlaces: EnlaceReserva[]
  /** Catálogo estático en MVP (sin edición de usuario). */
  servicios: Servicio[]

  crearAsesor: (asesor: Asesor) => void
  actualizarAsesor: (asesorId: string, cambios: Partial<Asesor>) => void
  /** Borrado con guard: un asesor con citas activas NO se borra (reasignar/cerrar primero). */
  borrarAsesor: (asesorId: string) => { ok: true } | { ok: false; motivo: string }
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
  | 'asesoresOcultos'
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
  const asesoresTodos = porId(ASESORES_DEMO, p.asesoresUsuario, (a) => a.id)
  return {
    asesoresTodos,
    asesores: asesoresTodos.filter((a) => !p.asesoresOcultos.includes(a.id)),
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
  asesoresOcultos: [],
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

      crearAsesor: (asesor) =>
        set((s) => {
          const asesoresUsuario = [...s.asesoresUsuario.filter((a) => a.id !== asesor.id), asesor]
          return { asesoresUsuario, ...derivar({ ...s, asesoresUsuario }) }
        }),

      actualizarAsesor: (asesorId, cambios) =>
        set((s) => {
          const base = s.asesoresTodos.find((a) => a.id === asesorId)
          if (!base) return s
          // Copy-on-write: editar una demo la clona a usuario. El slug no cambia
          // (los enlaces /reservar/[slug] repartidos no deben romperse).
          const asesoresUsuario = [
            ...s.asesoresUsuario.filter((a) => a.id !== asesorId),
            { ...base, ...cambios, slug: base.slug, id: base.id },
          ]
          return { asesoresUsuario, ...derivar({ ...s, asesoresUsuario }) }
        }),

      borrarAsesor: (asesorId) => {
        const s = get()
        const activas = s.citas.filter(
          (c) => c.asesorId === asesorId && ['solicitada', 'aprobada', 'confirmada', 'en_curso'].includes(c.estado)
        )
        if (activas.length > 0) {
          return {
            ok: false as const,
            motivo: `Tiene ${activas.length} cita(s) activa(s): reasígnalas o ciérralas antes de borrar.`,
          }
        }
        set((st) => {
          const asesoresOcultos = [...new Set([...st.asesoresOcultos, asesorId])]
          return { asesoresOcultos, ...derivar({ ...st, asesoresOcultos }) }
        })
        return { ok: true as const }
      },

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
        asesoresOcultos: s.asesoresOcultos,
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
