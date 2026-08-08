// Fila de public.leads para un caso de Pre-Discovery (fix de la fuga
// 2026-08-08: los casos vivían SOLO en localStorage y el CRM nunca los veía).
// Escritor del origen 'copilot' junto con lead-copilot.ts de agenda (misma
// pluma: el servidor del copiloto). Módulo puro (node:crypto) — lo consume
// /api/crm/leads (server) y lo prueban los tests sin red. NO importar desde
// código cliente.

import { createHash } from 'node:crypto'

// Clave natural: hash de empresa+contacto normalizados. El mismo lead dado de
// alta dos veces (reintento, otra sesión de navegador) actualiza SU fila, no
// duplica; el upsert ignore-duplicates jamás pisa uno existente.
export function leadIdPrediscovery(empresa: string, contacto: string): string {
  const base = `${empresa.trim().toLowerCase()}|${contacto.trim().toLowerCase()}`
  const h = createHash('sha1').update(base).digest('hex').slice(0, 16)
  return `copilot-pd-${h}`
}

export interface AltaPrediscovery {
  empresa: string
  contacto: string
  giro?: string
  web?: string
  linkedin?: string
  pais?: string
  telefono?: string
  email?: string
  casoId?: string
}

/** Sin `etapa` a propósito: la fila nueva toma el default 'nuevo' de la tabla
 *  y un upsert NO regresa de etapa un lead que el equipo ya avanzó. */
export function filaLeadPrediscovery(a: AltaPrediscovery): Record<string, unknown> {
  return {
    lead_id: leadIdPrediscovery(a.empresa, a.contacto),
    origen: 'copilot',
    empresa: a.empresa.trim(),
    contacto: a.email ? `${a.contacto.trim()} <${a.email.trim()}>` : a.contacto.trim(),
    telefono: a.telefono ?? '',
    canal: 'pre-discovery',
    mensaje: a.giro ? `Caso de Pre-Discovery (${a.giro})` : 'Caso de Pre-Discovery',
    datos: {
      source: 'copilot-prediscovery',
      ...(a.giro ? { giro: a.giro } : {}),
      ...(a.web ? { web: a.web } : {}),
      ...(a.linkedin ? { linkedin: a.linkedin } : {}),
      ...(a.pais ? { pais: a.pais } : {}),
      ...(a.casoId ? { casoId: a.casoId } : {}),
    },
  }
}
