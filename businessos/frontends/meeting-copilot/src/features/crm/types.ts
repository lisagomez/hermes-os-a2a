import { z } from 'zod'
import { ETAPAS_LEAD, type EtapaLead } from '@/features/domain/types'

// Workspace CRM (port del panel /crm de Mission Control, 2026-08-08).
// Las etapas DERIVAN de ETAPAS_LEAD (features/domain: espejo del check
// `leads_etapa_check` de la BD) — un solo espejo del dominio en la app.
// `perdido` no es una etapa del embudo: es la salida, se pinta aparte.

export const ETAPAS_EMBUDO: EtapaLead[] = ETAPAS_LEAD.filter((e) => e !== 'perdido')

// Etapas a las que un humano puede MOVER un lead desde el workspace:
// las del embudo + la salida `perdido` (dominio completo del check de la BD).
export const ETAPAS_MOVIBLES: EtapaLead[] = ETAPAS_LEAD

// Zod v3: z.enum exige una tupla no vacía; ETAPAS_LEAD tipa EtapaLead[].
export const etapaMovibleSchema = z.enum(ETAPAS_MOVIBLES as [EtapaLead, ...EtapaLead[]])

export const etapaEmbudoSchema = z.object({
  etapa: z.string(),
  cuenta: z.number().int().nonnegative(),
})
export type EtapaEmbudo = z.infer<typeof etapaEmbudoSchema>

export const conversacionResumenSchema = z.object({
  estado: z.string(), // abierta | escalada | cerrada (check en BD)
  nivel: z.string(), // A0..A3 (check en BD)
  canal: z.string(), // telegram | whatsapp (de crm_contactos; dominio abierto)
  cuenta: z.number().int().nonnegative(),
})
export type ConversacionResumen = z.infer<typeof conversacionResumenSchema>

export const leadResumenSchema = z.object({
  lead_id: z.string(),
  origen: z.string(), // a2a | manual | slack | web2 | crm | copilot (check en BD)
  canal: z.string(), // telegram | whatsapp | '' (dominio abierto, sin enum)
  empresa: z.string().nullable(),
  contacto: z.string().nullable(),
  etapa: z.string(),
  // Señal del calificador agéntico de crm-canales (null = sin calificar).
  calificacion: z.string().nullable(),
  updated_at: z.string(),
})
export type LeadResumen = z.infer<typeof leadResumenSchema>

// Fila de leads_movimientos: el rastro auditado de quién movió qué
// (actor 'humano:<email>' | 'agente:<nombre>' — ver actores.ts).
export const movimientoSchema = z.object({
  id: z.number(),
  lead_id: z.string(),
  de_etapa: z.string().nullable(),
  a_etapa: z.string(),
  actor: z.string(),
  motivo: z.string(),
  created_at: z.string(),
})
export type Movimiento = z.infer<typeof movimientoSchema>

export interface CrmVista {
  // Etapas del embudo EN ORDEN, con cuenta 0 incluida; `perdido` aparte.
  embudo: EtapaEmbudo[]
  perdidos: number
  conversaciones: ConversacionResumen[]
  leads: LeadResumen[]
  // Últimos movimientos del canal auditado (tablero + agentes), más reciente primero.
  movimientos: Movimiento[]
}

// Columnas del tablero: TODAS las etapas movibles (embudo + perdido), cada una
// con sus leads. Pura para testear el agrupado sin servidor. Un lead con etapa
// desconocida (BD por delante del espejo) cae en una columna extra al final —
// jamás se pierde (misma lección que componerEmbudo).
export function agruparPorEtapa(leads: LeadResumen[]): { etapa: string; leads: LeadResumen[] }[] {
  const columnas = ETAPAS_MOVIBLES.map((etapa) => ({
    etapa: etapa as string,
    leads: leads.filter((l) => l.etapa === etapa),
  }))
  const conocidas = new Set<string>(ETAPAS_MOVIBLES)
  const huerfanos = leads.filter((l) => !conocidas.has(l.etapa))
  for (const l of huerfanos) {
    const col = columnas.find((c) => c.etapa === l.etapa)
    if (col) col.leads.push(l)
    else columnas.push({ etapa: l.etapa, leads: [l] })
  }
  return columnas
}

// El orden del embudo lo pone ETAPAS_EMBUDO; una etapa desconocida que venga
// de la BD se anexa al final (no se pierde ni revienta — lección del enum de
// vertical, 2026-07-23). Pura para poder testearse sin servidor.
export function componerEmbudo(porEtapa: EtapaEmbudo[]): {
  embudo: EtapaEmbudo[]
  perdidos: number
} {
  const cuentas = new Map(porEtapa.map((e) => [e.etapa, e.cuenta]))
  const conocidas = new Set<string>([...ETAPAS_EMBUDO, 'perdido'])
  const embudo: EtapaEmbudo[] = [
    ...ETAPAS_EMBUDO.map((etapa) => ({ etapa: etapa as string, cuenta: cuentas.get(etapa) ?? 0 })),
    ...porEtapa.filter((e) => !conocidas.has(e.etapa)),
  ]
  return { embudo, perdidos: cuentas.get('perdido') ?? 0 }
}
