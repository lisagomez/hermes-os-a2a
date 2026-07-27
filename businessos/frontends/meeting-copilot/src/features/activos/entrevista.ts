'use client'

// Las ENTREVISTAS también son Activos Digitales (misma lógica ACT): al crearse
// una reunión con transcripción, se cataloga como activo clase 'entrevista'
// ligado al lead y a su caso de Pre-Discovery (si existe). Su ledger se
// alimenta con el usage REAL de las llamadas IA sobre esa reunión.

import type { Reunion, Transcripcion } from '@/features/domain/types'
import { hashContenido, useActivosStore, costearTokens } from './store'
import { useAdminPreDiscovery } from '@/features/pre-discovery/admin-store'
import { usePreDiscoveryStore } from '@/features/pre-discovery/store'

export async function registrarActivoEntrevista(reunion: Reunion, transcripcion: Transcripcion): Promise<void> {
  const hash = await hashContenido(transcripcion.segmentos)
  const casoDelLead = reunion.leadId ? usePreDiscoveryStore.getState().casos.find((c) => c.leadId === reunion.leadId) : undefined
  useActivosStore.getState().registrarActivo({
    clase: 'entrevista',
    tipo: 'documento',
    nombre: `Entrevista — ${reunion.titulo}`,
    ubicacion: `meeting-copilot://reunion/${reunion.id}`,
    ejeDei: useAdminPreDiscovery.getState().ejeDeiOrigen, // clasificación EN ORIGEN (config del módulo)
    refs: { leadId: reunion.leadId ?? null, casoId: casoDelLead?.id ?? null, reunionId: reunion.id },
    hash,
    origen: `reunion:${reunion.id} (${transcripcion.motor})`,
  })
}

/** Costo IA real de una reunión (p. ej. Discovery Analyst) → ledger del activo. */
export function appendCostoEntrevista(reunionId: string, usage: { tokensIn: number; tokensOut: number; modelo: string }): void {
  const activos = useActivosStore.getState()
  const activo = activos.activos.find((a) => a.ubicacion === `meeting-copilot://reunion/${reunionId}`)
  if (!activo) return // reunión demo sin activo registrado: no se inventa dónde cargarlo
  const { montoUsd, fuente } = costearTokens(usage.tokensIn, usage.tokensOut, usage.modelo, useAdminPreDiscovery.getState().tarifas)
  activos.appendCosto({
    activoId: activo.id,
    componente: 'tokens',
    tokensIn: usage.tokensIn,
    tokensOut: usage.tokensOut,
    modelo: usage.modelo,
    montoUsd,
    fuente,
  })
}
