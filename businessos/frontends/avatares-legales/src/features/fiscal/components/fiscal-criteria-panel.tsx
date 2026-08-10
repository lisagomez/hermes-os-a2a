import { Card, Chip, RiskBadge } from '@/shared/components/ui'
import { FuentesFooter } from '@/shared/components/confianza'
import type { CriterioFiscal } from '@/features/fiscal/types'

/**
 * FiscalCriteriaPanel — panel de criterios fiscales aplicables.
 * Dolor que ataca (INVESTIGACION-SINTESIS.md §1): escalar conocimiento a
 * juniors con criterios trazables. Cada tarjeta lleva fuente, riesgo y estado
 * de validación humana — la condición de adopción del socio fiscal.
 */

function CriterioCard({ criterio }: { criterio: CriterioFiscal }) {
  return (
    <Card className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <Chip>{criterio.materia}</Chip>
        <RiskBadge nivel={criterio.riesgo} />
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-ink">
        {criterio.titulo}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-secondary">
        {criterio.resumen}
      </p>
      <p className="mt-3 text-xs text-ink-muted">
        Aplica a: {criterio.aplicaA.join(' · ')}
      </p>
      <FuentesFooter
        fuentes={criterio.fuentes}
        estado={criterio.estadoValidacion}
      />
    </Card>
  )
}

export function FiscalCriteriaPanel({
  criterios,
}: {
  criterios: CriterioFiscal[]
}) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {criterios.map((criterio) => (
        <CriterioCard key={criterio.id} criterio={criterio} />
      ))}
    </div>
  )
}
