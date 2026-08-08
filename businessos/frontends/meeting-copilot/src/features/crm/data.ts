import 'server-only'
import { z } from 'zod'
import {
  componerEmbudo,
  conversacionResumenSchema,
  etapaEmbudoSchema,
  leadResumenSchema,
  movimientoSchema,
  type CrmVista,
  type EtapaEmbudo,
} from './types'

/**
 * Acceso a datos del workspace CRM: PostgREST con service_role, EXCLUSIVAMENTE
 * en el servidor (el browser recibe datos ya resueltos, jamás credenciales).
 * Las vistas v_embudo_leads / v_crm_conversaciones_resumen tienen
 * `revoke all from anon, authenticated` a propósito — el client @supabase/ssr
 * (anon key) NO sirve aquí; no crear políticas "para que funcione el cliente".
 * Este workspace queda FUERA del seam NEXT_PUBLIC_COPILOT_DATA (que gobierna
 * reuniones): el CRM es real-source por diseño y lo declara en su propia UI.
 */

function supabaseUrl(): string | null {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? null
}

export function crmDisponible(): boolean {
  return Boolean(supabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function sbHeaders(): HeadersInit {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente (workspace CRM)')
  return { apikey: key, Authorization: `Bearer ${key}` }
}

async function sb<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const url = supabaseUrl()
  if (!url) throw new Error('SUPABASE_URL ausente (workspace CRM)')
  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${path}`, {
    headers: sbHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`${path.split('?')[0]}: HTTP ${res.status}`)
  return schema.parse(await res.json())
}

// Resumen para la card de Inicio: solo el embudo (una lectura, no tres).
export async function obtenerEmbudo(): Promise<{ embudo: EtapaEmbudo[]; perdidos: number }> {
  const porEtapa = await sb('v_embudo_leads?select=etapa,cuenta', z.array(etapaEmbudoSchema))
  return componerEmbudo(porEtapa)
}

export async function obtenerCrm(): Promise<CrmVista> {
  const [conversaciones, leads, movimientos] = await Promise.all([
    sb(
      'v_crm_conversaciones_resumen?select=estado,nivel,canal,cuenta&order=estado,nivel',
      z.array(conversacionResumenSchema)
    ),
    sb(
      'leads?select=lead_id,origen,canal,empresa,contacto,etapa,calificacion,updated_at&order=updated_at.desc&limit=50',
      z.array(leadResumenSchema)
    ),
    sb(
      'leads_movimientos?select=id,lead_id,de_etapa,a_etapa,actor,motivo,created_at&order=created_at.desc&limit=30',
      z.array(movimientoSchema)
    ),
  ])
  return { conversaciones, leads, movimientos }
}

export async function moverLeadEtapaDb(
  leadId: string,
  etapa: string,
  actor: string,
  motivo = ''
): Promise<void> {
  // Mover de etapa va por la RPC AUDITADA mover_lead_etapa (migración
  // supabase-crm-movimientos.sql): update + fila en leads_movimientos en una
  // transacción, con actor 'humano:<email>' | 'agente:<nombre>'. Es el ÚNICO
  // escritor de etapa del sistema (tablero humano y agentes comparten canal).
  // Lanza si el lead no existe (fallo visible, nunca silencioso).
  const url = supabaseUrl()
  if (!url) throw new Error('SUPABASE_URL ausente (workspace CRM)')
  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/mover_lead_etapa`, {
    method: 'POST',
    headers: { ...sbHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_lead_id: leadId, p_etapa: etapa, p_actor: actor, p_motivo: motivo }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`rpc mover_lead_etapa: HTTP ${res.status}`)
  const filas = (await res.json()) as { etapa?: string }[]
  if (filas.length !== 1 || filas[0].etapa !== etapa) {
    throw new Error(`rpc mover_lead_etapa: respuesta inesperada para ${leadId}`)
  }
}

// Alta de lead con origen 'copilot' (fix de la fuga de Pre-Discovery,
// 2026-08-08): upsert por lead_id con ignore-duplicates — un lead ya
// existente NUNCA se pisa ni regresa de etapa (mismo criterio que
// /api/reservar y web2/a2a).
export async function crearLeadDb(fila: Record<string, unknown>): Promise<void> {
  const url = supabaseUrl()
  if (!url) throw new Error('SUPABASE_URL ausente (workspace CRM)')
  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/leads?on_conflict=lead_id`, {
    method: 'POST',
    headers: {
      ...sbHeaders(),
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(fila),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`leads INSERT: HTTP ${res.status}`)
}
