'use client'

// Store del buzón: demo ∪ usuario con copy-on-write (patrón agenda/store.ts).
// Los entrantes son catálogo estático en el mock (nadie los edita desde la UI,
// igual que `servicios` en agenda) — solo buzones (políticas), salientes
// (decisión de A5) y bitácora (append-only) tienen slice de usuario.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ActorCorreo, Buzon, CorreoSaliente, EventoBitacora, EventoCorreo, ResultadoTransicion } from './types'
import { aplicarTransicion, politicaValida } from './types'
import { BITACORA_DEMO, BUZONES_DEMO, ENTRANTES_DEMO, SALIENTES_DEMO } from './fixtures'

interface BuzonState {
  // Persistido (solo usuario)
  buzonesUsuario: Buzon[]
  salientesUsuario: CorreoSaliente[]
  bitacoraUsuario: EventoBitacora[]

  // Derivado (demo ∪ usuario) — se recalcula en cada set/merge
  buzones: Buzon[]
  salientes: CorreoSaliente[]
  bitacora: EventoBitacora[]
  /** Catálogo estático en MVP: lo ingiere ingerir-entrantes.py, la UI solo lee. */
  entrantes: typeof ENTRANTES_DEMO

  /** Única puerta de política: guard `politicaValida` (modo abierto exige firma
   *  completa). El agente jamás llama esto — es exclusivo de /buzon/politicas. */
  actualizarPoliticaBuzon: (
    buzonId: string,
    cambios: Partial<Buzon>,
    notaBitacora?: string
  ) => { ok: true } | { ok: false; motivo: string }
  /** Única puerta de cambio de estado de un saliente (mismo contrato que
   *  agenda::transicionar). */
  transicionarSaliente: (
    correoId: string,
    evento: EventoCorreo,
    actor: ActorCorreo,
    at: string,
    detalle?: string
  ) => ResultadoTransicion
  /** Atajo de la bandeja de A5: fija actor='aprobador' — la UI de aprobaciones
   *  nunca puede firmar como otro actor. */
  decidirAprobacion: (
    correoId: string,
    evento: 'aprobar' | 'rechazar' | 'reportar_inyeccion',
    detalle?: string
  ) => ResultadoTransicion
}

type Persistido = Pick<BuzonState, 'buzonesUsuario' | 'salientesUsuario' | 'bitacoraUsuario'>

function porId<T>(demo: T[], usuario: T[], id: (x: T) => string): T[] {
  const ids = new Set(usuario.map(id))
  return [...demo.filter((d) => !ids.has(id(d))), ...usuario]
}

function derivar(p: Persistido) {
  return {
    buzones: porId(BUZONES_DEMO, p.buzonesUsuario, (b) => b.id),
    salientes: porId(SALIENTES_DEMO, p.salientesUsuario, (s) => s.id),
    bitacora: [...BITACORA_DEMO, ...p.bitacoraUsuario].sort((a, b) => a.ocurridoEn.localeCompare(b.ocurridoEn)),
    entrantes: ENTRANTES_DEMO,
  }
}

const VACIO: Persistido = {
  buzonesUsuario: [],
  salientesUsuario: [],
  bitacoraUsuario: [],
}

let contadorBitacora = 0
function nuevoIdBitacora(): string {
  contadorBitacora += 1
  return `bitacora-usuario-${Date.now().toString(36)}-${contadorBitacora}`
}

export const useBuzonStore = create<BuzonState>()(
  persist(
    (set, get) => ({
      ...VACIO,
      ...derivar(VACIO),

      actualizarPoliticaBuzon: (buzonId, cambios, notaBitacora) => {
        const base = get().buzones.find((b) => b.id === buzonId)
        if (!base) return { ok: false, motivo: `Buzón ${buzonId} no encontrado.` }
        const propuesto = { ...base, ...cambios }
        if (!politicaValida(propuesto)) {
          return { ok: false, motivo: 'El modo "abierto" exige firma de riesgo (quién y cuándo) antes de guardarse.' }
        }
        set((s) => {
          const buzonesUsuario = [...s.buzonesUsuario.filter((b) => b.id !== buzonId), propuesto]
          const bitacoraUsuario: EventoBitacora[] = [
            ...s.bitacoraUsuario,
            {
              id: nuevoIdBitacora(),
              ocurridoEn: new Date().toISOString(),
              actor: 'ui:politicas',
              evento: 'actualizado_politica',
              buzonId,
              hiloId: null,
              correoId: null,
              detalle: { modo: propuesto.modoContraparte, ...(notaBitacora ? { nota: notaBitacora } : {}) },
            },
          ]
          return { buzonesUsuario, bitacoraUsuario, ...derivar({ ...s, buzonesUsuario, bitacoraUsuario }) }
        })
        return { ok: true }
      },

      transicionarSaliente: (correoId, evento, actor, at, detalle) => {
        const actual = get().salientes.find((c) => c.id === correoId)
        if (!actual) return { ok: false, motivo: `Correo ${correoId} no encontrado.` }
        const r = aplicarTransicion(actual, evento, actor, at, detalle)
        if (!r.ok) return r
        set((s) => {
          const salientesUsuario = [...s.salientesUsuario.filter((c) => c.id !== correoId), r.correo]
          const bitacoraUsuario: EventoBitacora[] = [
            ...s.bitacoraUsuario,
            {
              id: nuevoIdBitacora(),
              ocurridoEn: at,
              actor: actor === 'aprobador' ? 'ui:aprobador' : actor,
              evento,
              buzonId: r.correo.buzonId,
              hiloId: r.correo.hiloId,
              correoId: r.correo.id,
              detalle: { de: actual.estado, a: r.correo.estado, ...(detalle ? { motivo: detalle } : {}) },
            },
          ]
          return { salientesUsuario, bitacoraUsuario, ...derivar({ ...s, salientesUsuario, bitacoraUsuario }) }
        })
        return r
      },

      decidirAprobacion: (correoId, evento, detalle) =>
        get().transicionarSaliente(correoId, evento, 'aprobador', new Date().toISOString(), detalle),
    }),
    {
      name: 'meeting-copilot-buzon',
      partialize: (s): Persistido => ({
        buzonesUsuario: s.buzonesUsuario,
        salientesUsuario: s.salientesUsuario,
        bitacoraUsuario: s.bitacoraUsuario,
      }),
      merge: (persisted, actual) => {
        const p = { ...VACIO, ...((persisted ?? {}) as Partial<Persistido>) }
        return { ...actual, ...p, ...derivar(p) }
      },
    }
  )
)
