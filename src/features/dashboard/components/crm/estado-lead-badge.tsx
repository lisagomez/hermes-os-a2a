import { CHROME, STATUS } from '../ai-spend/colors'

/**
 * Badge de etapa de lead: ganado=verde, perdido=rojo, resto=azul de serie
 * (etapas vivas del embudo). Puro y determinista, igual que EstadoTareaBadge.
 */
const AZUL = '#3987e5'

export function EstadoLeadBadge({ etapa }: { etapa: string }) {
  const color =
    etapa === 'ganado' ? STATUS.good : etapa === 'perdido' ? STATUS.critical : AZUL
  const label = etapa.replace(/_/g, ' ')
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize"
      style={{ color, borderColor: color }}
    >
      {label}
    </span>
  )
}
