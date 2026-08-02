// Traducción de gates a lenguaje natural (SPEC-buzon-a2a §11.10). Nunca se
// muestra el identificador del gate al cliente — solo su mensaje en español y,
// cuando aplica, un enlace de acción. Todos llevan "Esto es un falso
// positivo": los falsos positivos que nadie reporta son los que terminan
// justificando apagar el control.

import type { Severidad } from './types'

export interface MensajeGateCliente {
  mensaje: string
  enlace?: { etiqueta: string; href: string }
}

/** Los 6 gates de la tabla §11.10, con su texto LITERAL. El resto de los 11
 *  gates deterministas (SPEC §3) no son cara-al-cliente (son de auditoría
 *  interna: sin_bcc, sin_reenvio, divulgacion_presente, auto_submitted_marcado,
 *  sin_secretos) y caen al mensaje genérico. */
export const MENSAJE_GATE_CLIENTE: Partial<Record<string, MensajeGateCliente>> = {
  destinatarios_del_hilo: {
    mensaje:
      'No lo envié porque incluía a alguien que no está en la conversación. El correo original pedía copiarlo. Puedo enviarlo si lo apruebas.',
  },
  adjuntos_de_catalogo: {
    mensaje: 'El borrador quería adjuntar un archivo que no está en tu catálogo aprobado.',
    enlace: { etiqueta: 'Ver catálogo', href: '/herramientas' },
  },
  sin_datos_personales_cruzados: {
    mensaje: 'El borrador incluía datos de otro cliente. Lo detuve.',
  },
  urls_de_dominio: {
    mensaje: 'Había un enlace a un sitio externo no autorizado.',
  },
  cuota_por_buzon: {
    mensaje: 'Este buzón llegó a su límite de envíos por hora. Se enviará en unos minutos.',
  },
  canario_ausente: {
    mensaje: 'Detecté un intento de manipulación en el correo recibido. Lo aislé y no generé respuesta.',
  },
}

const GENERICO: MensajeGateCliente = {
  mensaje: 'Un control de seguridad detuvo este envío. Revísalo con tu equipo si necesitas más detalle.',
}

/** Único punto de traducción: la UI SIEMPRE pasa por aquí, nunca imprime `gate` directo. */
export function mensajeClienteDeGate(gate: string): MensajeGateCliente {
  return MENSAJE_GATE_CLIENTE[gate] ?? GENERICO
}

export const TONO_SEVERIDAD_CLIENTE: Record<Severidad, 'danger' | 'warning' | 'info'> = {
  CRITICA: 'danger',
  ALTA: 'warning',
  MEDIA: 'info',
}

// ─── Falsos positivos (espejo de `buzon_falsos_positivos`) ─────────────────

export interface FalsoPositivoGate {
  id: string
  buzonId: string
  hiloId: string | null
  correoId: string | null
  gate: string
  reportadoPor: string
  reportadoEn: string
  nota?: string
}
