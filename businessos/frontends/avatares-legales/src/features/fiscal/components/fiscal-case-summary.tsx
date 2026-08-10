import { Card, Chip, RiskBadge, SectionHeader, Stat } from '@/shared/components/ui'
import { HermesTag } from '@/shared/components/confianza'
import { DataTable, type Columna } from '@/shared/components/table'
import type { CasoFiscal, EtapaCasoFiscal } from '@/features/fiscal/types'

/**
 * FiscalCaseSummary — resumen de cartera para el socio fiscal.
 * Dolor que ataca (INVESTIGACION-SINTESIS.md §1): visibilidad rápida de los
 * casos con mayor riesgo o urgencia.
 *
 * Decisión C4: la CINTA DE PLAZOS codifica urgencia con posición (orden
 * ascendente), peso tipográfico y cifras tabulares — sin color. El color de
 * esta vista pertenece solo a RiskBadge.
 */

const ETAPAS: Record<EtapaCasoFiscal, string> = {
  intake: 'Intake',
  analisis: 'Análisis',
  en_defensa: 'En defensa',
  cerrado: 'Cerrado',
}

function CintaPlazos({ casos }: { casos: CasoFiscal[] }) {
  const conPlazo = casos
    .filter(
      (caso): caso is CasoFiscal & { diasParaVencimiento: number } =>
        caso.diasParaVencimiento !== null,
    )
    .sort((a, b) => a.diasParaVencimiento - b.diasParaVencimiento)
    .slice(0, 5)

  return (
    <Card>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Próximos vencimientos
      </h3>
      <ol className="mt-3 space-y-2.5">
        {conPlazo.map((caso, indice) => (
          <li key={caso.id} className="flex items-baseline gap-3">
            <span
              className={`w-14 shrink-0 text-right font-mono tabular-nums ${
                indice === 0
                  ? 'text-lg font-semibold text-ink'
                  : 'text-sm text-ink-secondary'
              }`}
            >
              {caso.diasParaVencimiento} d
            </span>
            <span className="min-w-0">
              <span
                className={`block truncate text-sm ${
                  indice === 0 ? 'font-semibold text-ink' : 'text-ink-secondary'
                }`}
              >
                {caso.cliente}
              </span>
              <span className="block text-xs text-ink-muted">
                {caso.proximoVencimiento} · {caso.id}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function NotasSocios({ casos }: { casos: CasoFiscal[] }) {
  const conNota = casos.filter((caso) => caso.notaSocio)
  return (
    <Card>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Notas de socios
      </h3>
      <ul className="mt-3 space-y-3">
        {conNota.map((caso) => (
          <li key={caso.id} className="text-sm">
            <p className="font-medium text-ink">{caso.cliente}</p>
            <p className="mt-0.5 leading-relaxed text-ink-secondary">
              {caso.notaSocio}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function FiscalCaseSummary({ casos }: { casos: CasoFiscal[] }) {
  const activos = casos.filter((caso) => caso.etapa !== 'cerrado')
  const riesgoAlto = activos.filter((caso) => caso.riesgo === 'alto')
  const vencenPronto = activos.filter(
    (caso) =>
      caso.diasParaVencimiento !== null && caso.diasParaVencimiento <= 7,
  )
  const tareasAbiertas = activos.reduce(
    (suma, caso) => suma + caso.tareasAbiertas,
    0,
  )

  const columnas: Columna<CasoFiscal>[] = [
    {
      clave: 'caso',
      encabezado: 'Caso',
      render: (caso) => (
        <>
          <span className="block font-medium">{caso.cliente}</span>
          <span className="block font-mono text-xs text-ink-muted">
            {caso.id} · {caso.rfc}
          </span>
        </>
      ),
    },
    {
      clave: 'materias',
      encabezado: 'Materias',
      render: (caso) => (
        <span className="flex flex-wrap gap-1">
          {caso.materias.map((materia) => (
            <Chip key={materia}>{materia}</Chip>
          ))}
        </span>
      ),
    },
    {
      clave: 'etapa',
      encabezado: 'Etapa',
      render: (caso) => (
        <span className="text-ink-secondary">{ETAPAS[caso.etapa]}</span>
      ),
    },
    {
      clave: 'riesgo',
      encabezado: 'Riesgo',
      render: (caso) => <RiskBadge nivel={caso.riesgo} />,
    },
    {
      clave: 'vencimiento',
      encabezado: 'Vence',
      alinear: 'derecha',
      render: (caso) =>
        caso.proximoVencimiento ? (
          <>
            <span className="block font-medium tabular-nums">
              {caso.proximoVencimiento}
            </span>
            <span className="block text-xs tabular-nums text-ink-muted">
              en {caso.diasParaVencimiento} días
            </span>
          </>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
    {
      clave: 'responsable',
      encabezado: 'Responsable',
      render: (caso) => (
        <span className="text-ink-secondary">{caso.responsable}</span>
      ),
    },
    {
      clave: 'tareas',
      encabezado: 'Tareas',
      alinear: 'derecha',
      render: (caso) => (
        <span className="tabular-nums">{caso.tareasAbiertas}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat etiqueta="Casos activos" valor={String(activos.length)} />
        <Stat
          etiqueta="Riesgo alto"
          valor={String(riesgoAlto.length)}
          detalle="requieren atención de socio"
        />
        <Stat
          etiqueta="Vencen en ≤ 7 días"
          valor={String(vencenPronto.length)}
        />
        <Stat etiqueta="Tareas abiertas" valor={String(tareasAbiertas)} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CintaPlazos casos={casos} />
        <NotasSocios casos={casos} />
      </div>

      <div>
        <SectionHeader
          titulo="Cartera de casos"
          acciones={<HermesTag />}
        />
        <DataTable
          columnas={columnas}
          filas={casos}
          claveFila={(caso) => caso.id}
        />
      </div>
    </div>
  )
}
