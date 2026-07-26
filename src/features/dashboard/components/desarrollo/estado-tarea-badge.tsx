import { CHROME, SERIE_COLOR, STATUS } from '@/shared/constants/colors'
import type { EstadoTarea } from '../../types'

/**
 * Badge de estado de una tarea del trío. Estado nunca es color solo:
 * icono + texto siempre (regla de status del sistema de viz).
 *
 * Paleta (criterio /desarrollo):
 *  - aprobada    = verde   (STATUS.good)
 *  - rechazada   = rojo    (STATUS.critical)
 *  - en_ejecucion= azul    (SERIE_COLOR, slot 1 de colors.ts)
 *  - escalada    = ámbar   (STATUS.warning)
 *  - resto       = gris    (CHROME.muted)
 */
const ESTADO_TAREA: Record<EstadoTarea, { color: string; icono: string }> = {
  aprobada: { color: STATUS.good, icono: '✓' },
  rechazada: { color: STATUS.critical, icono: '✕' },
  en_ejecucion: { color: SERIE_COLOR, icono: '●' },
  escalada: { color: STATUS.warning, icono: '▲' },
  recibida: { color: CHROME.muted, icono: '○' },
  en_revision: { color: CHROME.muted, icono: '◌' },
  concretada: { color: CHROME.muted, icono: '◆' },
  cancelada: { color: CHROME.muted, icono: '⊘' },
}

export function EstadoTareaBadge({ estado }: { estado: EstadoTarea }) {
  const e = ESTADO_TAREA[estado]
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold capitalize"
      style={{ color: e.color, borderColor: e.color }}
    >
      <span aria-hidden>{e.icono}</span>
      {estado.replace('_', ' ')}
    </span>
  )
}
