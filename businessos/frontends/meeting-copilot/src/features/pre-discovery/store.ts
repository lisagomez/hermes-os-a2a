'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Bloque, BloqueId, CasoPreDiscovery, IntakeLead } from './types'
import { ORDEN_BLOQUES, bloqueVacio, bloquesVacios, estadoCasoDe } from './types'
import { CASOS_DEMO } from './fixtures'
import { nuevoId } from '@/shared/lib/format'

interface PreDiscoveryState {
  casos: CasoPreDiscovery[]
  casosUsuario: CasoPreDiscovery[]

  crearCaso: (leadId: string, intake: IntakeLead) => string
  actualizarBloque: (casoId: string, bloque: BloqueId, valor: Bloque<unknown>) => void
  setActivoId: (casoId: string, activoId: string) => void
}

/** Un caso guardado ANTES de que existiera un bloque no lo tiene en su mapa, y
 *  la vista accede a `caso.bloques.<id>.datos` sin red de seguridad: abrir un
 *  caso viejo tras añadir un bloque reventaba la página. Al rehidratar se
 *  rellenan los bloques que falten, así que sumar bloques deja de ser un cambio
 *  incompatible con lo ya guardado. */
export function completarBloques(caso: CasoPreDiscovery): CasoPreDiscovery {
  const bloques = { ...bloquesVacios(), ...(caso.bloques ?? {}) } as Record<BloqueId, Bloque<unknown>>
  for (const id of ORDEN_BLOQUES) if (!bloques[id]) bloques[id] = bloqueVacio()
  return { ...caso, bloques }
}

function fusionar(casosUsuario: CasoPreDiscovery[]): CasoPreDiscovery[] {
  // Un caso de usuario para un lead demo REEMPLAZA al demo de ese lead (evita duplicados).
  const leadsUsuario = new Set(casosUsuario.map((c) => c.leadId))
  return [...CASOS_DEMO.filter((c) => !leadsUsuario.has(c.leadId)), ...casosUsuario]
}

export const usePreDiscoveryStore = create<PreDiscoveryState>()(
  persist(
    (set) => ({
      casos: CASOS_DEMO,
      casosUsuario: [],

      crearCaso: (leadId, intake) => {
        const id = nuevoId('caso')
        const ahora = new Date().toISOString()
        const caso: CasoPreDiscovery = {
          id,
          leadId,
          intake,
          estado: 'borrador',
          bloques: bloquesVacios(),
          activoId: null,
          creadoAt: ahora,
          actualizadoAt: ahora,
        }
        set((s) => {
          const casosUsuario = [...s.casosUsuario, caso]
          return { casosUsuario, casos: fusionar(casosUsuario) }
        })
        return id
      },

      actualizarBloque: (casoId, bloque, valor) =>
        set((s) => {
          const aplicar = (c: CasoPreDiscovery): CasoPreDiscovery => {
            if (c.id !== casoId) return c
            const bloques = { ...c.bloques, [bloque]: valor }
            return { ...c, bloques, estado: estadoCasoDe(bloques), actualizadoAt: new Date().toISOString() }
          }
          const casosUsuario = s.casosUsuario.map(aplicar)
          // Los casos demo también son operables (regenerar bloques): al tocarlos
          // se copian a usuario (copy-on-write) para que el cambio persista.
          const demoTocado = s.casos.find((c) => c.id === casoId && !s.casosUsuario.some((u) => u.id === casoId))
          const conCopia = demoTocado ? [...casosUsuario, aplicar(demoTocado)] : casosUsuario
          return { casosUsuario: conCopia, casos: fusionar(conCopia) }
        }),

      setActivoId: (casoId, activoId) =>
        set((s) => {
          const aplicar = (c: CasoPreDiscovery) => (c.id === casoId ? { ...c, activoId } : c)
          const casosUsuario = s.casosUsuario.map(aplicar)
          const demoTocado = s.casos.find((c) => c.id === casoId && !s.casosUsuario.some((u) => u.id === casoId))
          const conCopia = demoTocado ? [...casosUsuario, aplicar(demoTocado)] : casosUsuario
          return { casosUsuario: conCopia, casos: fusionar(conCopia) }
        }),
    }),
    {
      name: 'meeting-copilot-prediscovery',
      partialize: (s) => ({ casosUsuario: s.casosUsuario }),
      merge: (persisted, actual) => {
        const p = (persisted ?? {}) as Partial<PreDiscoveryState>
        const casosUsuario = (p.casosUsuario ?? []).map(completarBloques)
        return { ...actual, casosUsuario, casos: fusionar(casosUsuario) }
      },
    }
  )
)

export function useCaso(id: string): CasoPreDiscovery | null {
  return usePreDiscoveryStore((s) => s.casos.find((c) => c.id === id) ?? null)
}

export function useCasoDeLead(leadId: string | null): CasoPreDiscovery | null {
  return usePreDiscoveryStore((s) => (leadId ? (s.casos.find((c) => c.leadId === leadId) ?? null) : null))
}
