import type { EstadoGrafo } from '../../types'
import { CHROME, STATUS } from '@/shared/constants/colors'

/**
 * Badges de estado (grafo y operación). Estado nunca es color solo:
 * icono + texto siempre (regla de status del sistema de viz).
 */

// Los 5 estados del grafo (vocabulario por dimensión: fiscal deducible/no_deducible,
// regulatorio permitido/no_permitido). Un estado que no conozcamos degrada a
// neutro con su texto visible — jamás revienta la vista (el dominio creció una vez ya).
const ESTADO_GRAFO: Record<string, { color: string; icono: string }> = {
  deducible: { color: STATUS.good, icono: '✓' },
  permitido: { color: STATUS.good, icono: '✓' },
  dudoso: { color: STATUS.warning, icono: '▲' },
  no_deducible: { color: STATUS.critical, icono: '✕' },
  no_permitido: { color: STATUS.critical, icono: '✕' },
}

export function EstadoBadge({ estado }: { estado: EstadoGrafo }) {
  const e = ESTADO_GRAFO[estado] ?? { color: CHROME.muted, icono: '•' }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
      style={{ color: e.color, borderColor: e.color }}
    >
      <span aria-hidden>{e.icono}</span>
      {estado.replace('_', ' ')}
    </span>
  )
}

export function NeutralBadge({ texto, tono }: { texto: string; tono?: 'good' | 'warning' | 'critical' }) {
  const color = tono ? STATUS[tono] : CHROME.muted
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
      style={{ color, borderColor: color }}
    >
      {tono === 'good' && <span aria-hidden>✓</span>}
      {tono === 'warning' && <span aria-hidden>▲</span>}
      {tono === 'critical' && <span aria-hidden>✕</span>}
      {texto}
    </span>
  )
}
