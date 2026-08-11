import { Chip, RiskBadge } from '@/shared/components/ui'
import { GrafoTag } from '@/shared/components/confianza'
import { Timeline, type EventoTimeline } from '@/shared/components/timeline'
import type { AlertaRegulatoria } from '@/features/fiscal/types'

/**
 * RegulatoryAlertsTimeline — vigilancia regulatoria cruzada con la cartera.
 * Dolor que ataca (INVESTIGACION-SINTESIS.md §1): presión constante de
 * cambios normativos sin conocimiento vivo y trazable. Cada alerta declara su
 * origen de publicación, impacto (escala de riesgo) y clientes afectados.
 */
export function RegulatoryAlertsTimeline({
  alertas,
}: {
  alertas: AlertaRegulatoria[]
}) {
  const eventos: EventoTimeline[] = alertas.map((alerta) => ({
    id: alerta.id,
    fecha: alerta.fecha,
    titulo: alerta.titulo,
    adorno: (
      <>
        <Chip>{alerta.origenPublicacion}</Chip>
        <RiskBadge nivel={alerta.impacto} />
        <GrafoTag />
      </>
    ),
    descripcion: (
      <>
        {alerta.descripcion}
        {alerta.clientesAfectados.length > 0 ? (
          <span className="mt-1 block text-xs text-ink-muted">
            Afecta a: {alerta.clientesAfectados.join(' · ')} —{' '}
            {alerta.fuentes.map((f) => f.referencia).join('; ')}
          </span>
        ) : (
          <span className="mt-1 block text-xs text-ink-muted">
            Sin clientes afectados en la cartera — {alerta.fuentes
              .map((f) => f.referencia)
              .join('; ')}
          </span>
        )}
      </>
    ),
  }))

  return <Timeline eventos={eventos} />
}
