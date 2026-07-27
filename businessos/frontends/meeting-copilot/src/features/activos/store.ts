'use client'

import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ActivoDigitalLocal, ClaseActivo, ComponenteCosto, CostoEntrada, VersionActivo } from './types'
import { nuevoId } from '@/shared/lib/format'

// Tarifas por defecto (USD por millón de tokens). FUENTE declarada: precios
// públicos de OpenRouter 2026-07; editables en el admin del módulo (con fuente).
export interface Tarifa {
  modelo: string
  usdPorMTokIn: number
  usdPorMTokOut: number
  fuente: string
}

export const TARIFAS_DEFAULT: Tarifa[] = [
  { modelo: 'google/gemini-2.5-flash-lite', usdPorMTokIn: 0.1, usdPorMTokOut: 0.4, fuente: 'openrouter.ai/models 2026-07' },
  { modelo: 'google/gemini-2.5-flash', usdPorMTokIn: 0.3, usdPorMTokOut: 2.5, fuente: 'openrouter.ai/models 2026-07' },
]

export function costearTokens(tokensIn: number, tokensOut: number, modelo: string, tarifas: Tarifa[]): { montoUsd: number; fuente: string } {
  const tarifa = tarifas.find((t) => t.modelo === modelo)
  if (!tarifa) {
    // Doctrina act_costo: el hueco se DECLARA, jamás se inventa.
    return { montoUsd: 0, fuente: `no_medido (modelo ${modelo} sin tarifa registrada)` }
  }
  const monto = (tokensIn / 1_000_000) * tarifa.usdPorMTokIn + (tokensOut / 1_000_000) * tarifa.usdPorMTokOut
  return { montoUsd: Number(monto.toFixed(6)), fuente: `openrouter_usage·tarifa ${modelo} (${tarifa.fuente})` }
}

/** sha256 hex (Web Crypto); fallback determinista simple si no hay subtle (tests node viejos). */
export async function hashContenido(contenido: unknown): Promise<string> {
  const texto = JSON.stringify(contenido)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  let h = 0
  for (let i = 0; i < texto.length; i += 1) h = (Math.imul(31, h) + texto.charCodeAt(i)) | 0
  return `fnv-${(h >>> 0).toString(16)}`
}

// Activo demo del caso GAL (fixtures): la demo muestra la ficha completa.
export const ACTIVOS_DEMO: ActivoDigitalLocal[] = [
  {
    id: 'act-loc-demo-1',
    folio: 'ACT-LOC-0000',
    clase: 'pre_discovery',
    tipo: 'datos',
    nombre: 'Pre-Discovery — Agencia de carga (freight forwarder)',
    ubicacion: 'meeting-copilot://caso/caso-gal',
    ejeDei: 'desarrollo',
    defensibilidad: 'reemplazable',
    estadoDefensibilidad: 'propuesta',
    estatus: 'propuesto',
    versiones: [{ version: 'v1', hash: 'demo-fixture', origen: 'caso:caso-gal pipeline demo', at: '2026-07-26T12:00:00.000Z' }],
    refs: { leadId: 'lead-gal', casoId: 'caso-gal', reunionId: null },
    creadoAt: '2026-07-26T12:00:00.000Z',
  },
]

const LEDGER_DEMO: CostoEntrada[] = [
  {
    id: 'costo-demo-1',
    activoId: 'act-loc-demo-1',
    componente: 'tokens',
    tokensIn: null,
    tokensOut: null,
    modelo: null,
    montoUsd: 0,
    fuente: 'estimado_mock (análisis demo, sin llamadas reales)',
    at: '2026-07-26T12:00:00.000Z',
  },
]

interface ActivosState {
  activos: ActivoDigitalLocal[]
  ledger: CostoEntrada[] // APPEND-ONLY: solo se agrega, jamás se edita/borra
  siguienteFolio: number

  registrarActivo: (args: {
    clase: ClaseActivo
    tipo: ActivoDigitalLocal['tipo']
    nombre: string
    ubicacion: string
    ejeDei: ActivoDigitalLocal['ejeDei']
    refs: ActivoDigitalLocal['refs']
    hash: string
    origen: string
  }) => string
  nuevaVersion: (activoId: string, hash: string, origen: string) => void
  appendCosto: (args: {
    activoId: string
    componente: ComponenteCosto
    tokensIn?: number
    tokensOut?: number
    modelo?: string
    montoUsd: number
    fuente: string
  }) => void
}

export const useActivosStore = create<ActivosState>()(
  persist(
    (set, get) => ({
      activos: ACTIVOS_DEMO,
      ledger: LEDGER_DEMO,
      siguienteFolio: 1,

      registrarActivo: ({ clase, tipo, nombre, ubicacion, ejeDei, refs, hash, origen }) => {
        // Dedupe por ubicación (invariante ACT: unicidad por ubicación verificable).
        const existente = get().activos.find((a) => a.ubicacion === ubicacion)
        if (existente) {
          get().nuevaVersion(existente.id, hash, origen)
          return existente.id
        }
        const id = nuevoId('act')
        const n = get().siguienteFolio
        const activo: ActivoDigitalLocal = {
          id,
          folio: `ACT-LOC-${String(n).padStart(4, '0')}`,
          clase,
          tipo,
          nombre,
          ubicacion,
          ejeDei,
          defensibilidad: 'reemplazable',
          estadoDefensibilidad: 'propuesta',
          estatus: 'propuesto',
          versiones: [{ version: 'v1', hash, origen, at: new Date().toISOString() }],
          refs,
          creadoAt: new Date().toISOString(),
        }
        set((s) => ({ activos: [...s.activos, activo], siguienteFolio: n + 1 }))
        return id
      },

      nuevaVersion: (activoId, hash, origen) =>
        set((s) => ({
          activos: s.activos.map((a) => {
            if (a.id !== activoId) return a
            if (a.versiones[a.versiones.length - 1]?.hash === hash) return a // sin cambio real
            const version: VersionActivo = { version: `v${a.versiones.length + 1}`, hash, origen, at: new Date().toISOString() }
            return { ...a, versiones: [...a.versiones, version] } // APPEND, nunca se reescribe
          }),
        })),

      appendCosto: ({ activoId, componente, tokensIn, tokensOut, modelo, montoUsd, fuente }) =>
        set((s) => ({
          ledger: [
            ...s.ledger,
            {
              id: nuevoId('costo'),
              activoId,
              componente,
              tokensIn: tokensIn ?? null,
              tokensOut: tokensOut ?? null,
              modelo: modelo ?? null,
              montoUsd,
              fuente,
              at: new Date().toISOString(),
            },
          ],
        })),
    }),
    {
      name: 'meeting-copilot-activos',
      partialize: (s) => ({ activos: s.activos, ledger: s.ledger, siguienteFolio: s.siguienteFolio }),
      merge: (persisted, actual) => {
        const p = (persisted ?? {}) as Partial<ActivosState>
        const activos = p.activos ?? []
        const ledger = p.ledger ?? []
        return {
          ...actual,
          activos: [...ACTIVOS_DEMO.filter((d) => !activos.some((a) => a.id === d.id)), ...activos],
          ledger: [...LEDGER_DEMO.filter((d) => !ledger.some((c) => c.id === d.id)), ...ledger],
          siguienteFolio: p.siguienteFolio ?? 1,
        }
      },
    }
  )
)

/** costo_acumulado = SUM(ledger) — espejo del trigger act_actualiza_costo (jamás a mano). */
export function costoAcumulado(ledger: CostoEntrada[], activoId: string): number {
  return Number(ledger.filter((c) => c.activoId === activoId).reduce((a, c) => a + c.montoUsd, 0).toFixed(6))
}

export function useActivo(activoId: string | null) {
  const activo = useActivosStore((s) => (activoId ? (s.activos.find((a) => a.id === activoId) ?? null) : null))
  // El filtro NO va en el selector (devolvería un array nuevo por render).
  const ledgerCompleto = useActivosStore((s) => s.ledger)
  const ledger = useMemo(
    () => (activoId ? ledgerCompleto.filter((c) => c.activoId === activoId) : []),
    [ledgerCompleto, activoId]
  )
  return { activo, ledger, total: activoId ? costoAcumulado(ledger, activoId) : 0 }
}
