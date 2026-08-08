// Escritor ÚNICO del origen `copilot` en public.leads (RUNBOOK-PIPELINE-COMERCIAL P6).
// Una cita solicitada es el lead más caliente que existe: aunque la persistencia de
// agenda_citas siga pendiente (fase Supabase), el LEAD sí entra al embudo desde ya.
//
// Módulo puro (sin fetch, sin DOM): lo consume /api/reservar (server) y lo prueban
// los tests de vitest sin red. Usa node:crypto — NO importar desde código cliente.

import { createHash } from 'node:crypto'
import type { SolicitudReservaValidada } from './contratos'

/** Clave natural: sha1 del email normalizado. El mismo humano reservando dos
 *  veces (reintento, reprogramación, mañana) actualiza SU fila, no duplica. */
export function leadIdCopilot(email: string): string {
  const h = createHash('sha1').update(email.trim().toLowerCase()).digest('hex').slice(0, 16)
  return `copilot-${h}`
}

/** Fila para public.leads. Sin `etapa` a propósito: la fila nueva toma el
 *  default 'nuevo' de la tabla y un upsert NO regresa de etapa un lead que el
 *  equipo ya avanzó (mismo criterio que web2/a2a, RUNBOOK P2/P3). */
export function filaLeadCopilot(s: SolicitudReservaValidada): Record<string, unknown> {
  return {
    lead_id: leadIdCopilot(s.cliente.email),
    origen: 'copilot',
    empresa: '',
    contacto: `${s.cliente.nombre} <${s.cliente.email}> · tel ${s.cliente.telefono}`,
    telefono: s.cliente.telefono,
    canal: 'agenda',
    mensaje: `Cita ${s.sessionDepth} solicitada con ${s.asesorId} para ${s.inicio}`,
    datos: {
      source: 'copilot-reserva',
      slug: s.slug,
      asesorId: s.asesorId,
      servicioId: s.servicioId,
      inicio: s.inicio,
      sessionDepth: s.sessionDepth,
      nombre: s.cliente.nombre,
      email: s.cliente.email,
      // El brief de discovery es oro para un ciclo consultivo: viaja con el lead.
      brief: s.brief,
    },
  }
}
