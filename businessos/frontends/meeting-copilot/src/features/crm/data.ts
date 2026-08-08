import 'server-only'
import { z } from 'zod'
import {
  componerEmbudo,
  conversacionResumenSchema,
  etapaEmbudoSchema,
  leadResumenSchema,
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
  // Los agregados viven en vistas (supabase-vistas-crm-embudo.sql): PostgREST
  // no expone GROUP BY inline.
  const [porEtapa, conversaciones, leads] = await Promise.all([
    sb('v_embudo_leads?select=etapa,cuenta', z.array(etapaEmbudoSchema)),
    sb(
      'v_crm_conversaciones_resumen?select=estado,nivel,canal,cuenta&order=estado,nivel',
      z.array(conversacionResumenSchema)
    ),
    sb(
      'leads?select=lead_id,origen,canal,empresa,contacto,etapa,updated_at&order=updated_at.desc&limit=50',
      z.array(leadResumenSchema)
    ),
  ])
  return { ...componerEmbudo(porEtapa), conversaciones, leads }
}

export async function moverLeadEtapaDb(leadId: string, etapa: string): Promise<void> {
  // ÚNICA escritura del copilot sobre `leads`: mover un lead de etapa (acción
  // humana desde /crm, detrás del login + allowlist). El check constraint de
  // la BD es el backstop del dominio; PostgREST devuelve la fila afectada para
  // no reportar éxito sobre un lead inexistente (fallo visible, nunca
  // silencioso).
  const url = supabaseUrl()
  if (!url) throw new Error('SUPABASE_URL ausente (workspace CRM)')
  const res = await fetch(
    `${url.replace(/\/$/, '')}/rest/v1/leads?lead_id=eq.${encodeURIComponent(leadId)}`,
    {
      method: 'PATCH',
      headers: {
        ...sbHeaders(),
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ etapa, updated_at: new Date().toISOString() }),
      cache: 'no-store',
    }
  )
  if (!res.ok) throw new Error(`leads PATCH etapa: HTTP ${res.status}`)
  const filas = (await res.json()) as unknown[]
  if (filas.length !== 1) {
    throw new Error(`leads PATCH etapa: ${filas.length} filas afectadas para ${leadId}`)
  }
}
