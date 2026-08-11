import { Card, Chip, RiskBadge } from '@/shared/components/ui'
import { FuentesFooter } from '@/shared/components/confianza'
import type {
  AlertaEjecutiva,
  CategoriaAlerta,
} from '@/features/direccion/types'

/**
 * ExecutiveAlertsPanel — alertas relevantes para socios y gerencia:
 * regulatorias de alto impacto, problemas operativos e hitos.
 * Cada alerta declara su fuente (grafo o métricas de Hermes).
 */

const ETIQUETA_CATEGORIA: Record<CategoriaAlerta, string> = {
  regulatorio: 'Regulatorio',
  operativo: 'Operativo',
  hito: 'Hito',
}

export function ExecutiveAlertsPanel({
  alertas,
}: {
  alertas: AlertaEjecutiva[]
}) {
  return (
    <div className="space-y-4">
      {alertas.map((alerta) => (
        <Card key={alerta.id}>
          <div className="flex flex-wrap items-center gap-2">
            <Chip>{ETIQUETA_CATEGORIA[alerta.categoria]}</Chip>
            <RiskBadge nivel={alerta.impacto} />
            <span className="font-mono text-xs tabular-nums text-ink-muted">
              {alerta.fecha}
            </span>
          </div>
          <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-ink">
            {alerta.titulo}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
            {alerta.descripcion}
          </p>
          <FuentesFooter fuentes={alerta.fuentes} />
        </Card>
      ))}
    </div>
  )
}
