'use client'

// Configuración y auditoría del módulo Pre-Discovery.
// - Settings persistidos (tarifas con fuente, límites, clasificación en origen).
// - Bitácora APPEND-ONLY de acciones del módulo (espejo del patrón sis_bitacora
//   del ERP): quién-qué-cuándo, sin ediciones ni borrados.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TARIFAS_DEFAULT, type Tarifa } from '@/features/activos/store'
import { nuevoId } from '@/shared/lib/format'

export interface EntradaBitacora {
  id: string
  accion: 'crear_caso' | 'analizar' | 'regenerar_bloque' | 'exportar_activo' | 'editar_settings'
  detalle: string
  at: string
}

interface AdminState {
  tarifas: Tarifa[]
  presupuestoCasoUsd: number // presupuesto BLANDO por caso (aviso, no corte)
  ejeDeiOrigen: 'investigacion' | 'desarrollo' // clasificación declarada en origen
  bitacora: EntradaBitacora[]

  setTarifa: (tarifa: Tarifa) => void
  setPresupuestoCaso: (usd: number) => void
  setEjeDei: (eje: 'investigacion' | 'desarrollo') => void
  log: (accion: EntradaBitacora['accion'], detalle: string) => void
}

export const useAdminPreDiscovery = create<AdminState>()(
  persist(
    (set) => ({
      tarifas: TARIFAS_DEFAULT,
      presupuestoCasoUsd: 0.5,
      ejeDeiOrigen: 'desarrollo',
      bitacora: [],

      setTarifa: (tarifa) =>
        set((s) => ({
          tarifas: s.tarifas.some((t) => t.modelo === tarifa.modelo)
            ? s.tarifas.map((t) => (t.modelo === tarifa.modelo ? tarifa : t))
            : [...s.tarifas, tarifa],
        })),
      setPresupuestoCaso: (usd) => set({ presupuestoCasoUsd: Math.max(0, usd) }),
      setEjeDei: (eje) => set({ ejeDeiOrigen: eje }),
      log: (accion, detalle) =>
        set((s) => ({
          bitacora: [{ id: nuevoId('bit'), accion, detalle, at: new Date().toISOString() }, ...s.bitacora].slice(0, 100),
        })),
    }),
    { name: 'meeting-copilot-prediscovery-admin' }
  )
)
