import { Chip } from '@/shared/components/ui'

/**
 * Chip de etapa de lead: ganado=success, perdido=danger, resto=accent
 * (etapas vivas del embudo). Puro y determinista.
 */
export function EtapaLeadChip({ etapa }: { etapa: string }) {
  const tono = etapa === 'ganado' ? 'success' : etapa === 'perdido' ? 'danger' : 'accent'
  return (
    <Chip tono={tono}>
      <span className="capitalize">{etapa.replace(/_/g, ' ')}</span>
    </Chip>
  )
}
