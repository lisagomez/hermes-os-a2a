// Notificaciones de agendamiento como COLA idempotente (jamás fetch a un canal
// desde el frontend): fiel al contrato real, donde un host-job lee registros
// 'pendiente' y envía por SMTP (enviar-salientes.py, gate aprobaciones_salientes)
// y WhatsApp (crm-canales). El mock marca 'enviada' simulando ese job.

import type { Asesor, Cita, NotificacionPendiente, PlantillaNotificacion, Procedencia } from './types'
import { ETIQUETA_DEPTH } from './types'
import { etiquetaTz, fechaEnTz, fmtHoraEnTz } from './slots'

/** Clave de idempotencia — espejo del unique (cita_id, canal, plantilla). */
export function idNotificacion(citaId: string, canal: 'email' | 'whatsapp', plantilla: PlantillaNotificacion): string {
  return `${citaId}:${canal}:${plantilla}`
}

function cuerpoPlantilla(cita: Cita, asesor: Asesor, plantilla: PlantillaNotificacion): string {
  // Contenido mínimo del contrato: cliente, asesor, fecha/hora CON TZ explícita,
  // tipo de sesión y enlace de reprogramar/cancelar. En mock, el "token" del
  // enlace es el id de la cita; el real será un token firmado server-side.
  const cuando = `${fechaEnTz(cita.inicio, asesor.zonaHoraria)} ${fmtHoraEnTz(cita.inicio, asesor.zonaHoraria)} — ${etiquetaTz(asesor.zonaHoraria, cita.inicio)}`
  const sesion = ETIQUETA_DEPTH[cita.sessionDepth]
  const enlace = `/reservar/cita/${cita.id}`
  const base = `${cita.cliente.nombre}, tu sesión (${sesion}) con ${asesor.nombre}: ${cuando}.`
  switch (plantilla) {
    case 'confirmacion_cita':
      return `${base} Quedó confirmada. Reprogramar o cancelar: ${enlace}`
    case 'reasignacion':
      return `${base} Tu solicitud fue reasignada a ${asesor.nombre}; te confirmará en breve. Detalle: ${enlace}`
    case 'rechazo':
      return `${cita.cliente.nombre}, tu solicitud de sesión (${sesion}) no pudo agendarse en ese horario. Elige otro: /reservar/${asesor.slug}`
    case 'cancelacion':
      return `${base} Fue cancelada. Reagendar: /reservar/${asesor.slug}`
  }
}

/** SIEMPRE devuelve el par [email, whatsapp] como registros 'pendiente'. */
export function construirNotificaciones(
  cita: Cita,
  asesor: Asesor,
  plantilla: PlantillaNotificacion,
  at: string,
  procedencia: Procedencia
): NotificacionPendiente[] {
  const canales: Array<'email' | 'whatsapp'> = ['email', 'whatsapp']
  return canales.map((canal) => ({
    id: idNotificacion(cita.id, canal, plantilla),
    citaId: cita.id,
    canal,
    plantilla,
    destinatario: canal === 'email' ? cita.cliente.email : cita.cliente.telefono,
    cuerpo: cuerpoPlantilla(cita, asesor, plantilla),
    estado: 'pendiente',
    intentos: 0,
    procedencia,
    creadaAt: at,
    enviadaAt: null,
  }))
}

/** Fusión idempotente: un registro con el mismo id REEMPLAZA (no duplica). */
export function fusionarNotificaciones(
  existentes: NotificacionPendiente[],
  nuevas: NotificacionPendiente[]
): NotificacionPendiente[] {
  const ids = new Set(nuevas.map((n) => n.id))
  return [...existentes.filter((n) => !ids.has(n.id)), ...nuevas]
}
