import { SERIE_COLOR, STATUS } from '@/shared/constants/colors'

/**
 * Badge de etapa de lead: ganado=verde, perdido=rojo, resto=azul de serie
 * (etapas vivas del embudo). Puro y determinista, igual que EstadoTareaBadge.
 */
export function EstadoLeadBadge({ etapa }: { etapa: string }) {
  const color =
    etapa === 'ganado' ? STATUS.good : etapa === 'perdido' ? STATUS.critical : SERIE_COLOR
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
