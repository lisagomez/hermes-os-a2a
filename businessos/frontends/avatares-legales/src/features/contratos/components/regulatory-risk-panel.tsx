import { Card, RiskBadge } from '@/shared/components/ui'
import { FuentesFooter, GrafoTag } from '@/shared/components/confianza'
import type { RiesgoRegulatorio } from '@/features/contratos/types'

/**
 * RegulatoryRiskPanel — riesgos regulatorios de la OPERACIÓN completa
 * detectados por el grafo (los que no viven en una cláusula concreta).
 * Requisito del prompt del equipo §3.3: sección que refleje la conexión con
 * el grafo regulatorio.
 */
export function RegulatoryRiskPanel({
  riesgos,
}: {
  riesgos: RiesgoRegulatorio[]
}) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Riesgos regulatorios de la operación
        </h3>
        <GrafoTag />
      </div>
      <ul className="mt-4 space-y-4">
        {riesgos.map((riesgo) => (
          <li key={riesgo.id} className="border-b border-line pb-4 last:border-b-0 last:pb-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold leading-snug text-ink">
                {riesgo.titulo}
              </p>
              <RiskBadge nivel={riesgo.nivel} />
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
              {riesgo.descripcion}
            </p>
            <FuentesFooter fuentes={riesgo.fuentes} />
          </li>
        ))}
      </ul>
    </Card>
  )
}
