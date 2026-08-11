import { ProgressBar, RiskBadge, Stat } from '@/shared/components/ui'
import { HermesTag } from '@/shared/components/confianza'
import { DataTable, type Columna } from '@/shared/components/table'
import type {
  MetricaPractica,
  PanoramaDespacho,
} from '@/features/direccion/types'

/**
 * FirmOverview360 — vista 360 del despacho.
 * Dolor que ataca (INVESTIGACION-SINTESIS.md §4): sin métricas transversales.
 * Muchas métricas sin saturación: stats arriba, tabla densa por práctica.
 */
export function FirmOverview360({ panorama }: { panorama: PanoramaDespacho }) {
  const columnas: Columna<MetricaPractica>[] = [
    {
      clave: 'practica',
      encabezado: 'Práctica',
      render: (fila) => <span className="font-medium">{fila.practica}</span>,
    },
    {
      clave: 'casos',
      encabezado: 'Casos activos',
      alinear: 'derecha',
      render: (fila) => <span className="tabular-nums">{fila.casosActivos}</span>,
    },
    {
      clave: 'ingresos',
      encabezado: 'Ingresos del mes',
      alinear: 'derecha',
      render: (fila) => <span className="tabular-nums">{fila.ingresosMes}</span>,
    },
    {
      clave: 'utilizacion',
      encabezado: 'Utilización',
      render: (fila) => (
        <div className="min-w-36">
          <ProgressBar valor={fila.utilizacion} etiqueta="" />
          <span className="text-xs tabular-nums text-ink-muted">
            {fila.utilizacion}%
          </span>
        </div>
      ),
    },
    {
      clave: 'riesgo',
      encabezado: 'Riesgo agregado',
      render: (fila) => <RiskBadge nivel={fila.riesgoAgregado} />,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          etiqueta="Ingresos del mes"
          valor={panorama.ingresosMes}
          detalle={panorama.variacionMensual}
        />
        <Stat etiqueta="Casos activos" valor={String(panorama.casosActivos)} />
        <Stat
          etiqueta="Casos en riesgo alto"
          valor={String(panorama.casosRiesgoAlto)}
          detalle="requieren atención de socios"
        />
        <Stat
          etiqueta="Horas facturables"
          valor={panorama.horasFacturables.toLocaleString('es-MX')}
          detalle={panorama.periodo}
        />
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Desglose por práctica
          </h3>
          <HermesTag />
        </div>
        <DataTable
          columnas={columnas}
          filas={panorama.practicas}
          claveFila={(fila) => fila.practica}
        />
      </div>
    </div>
  )
}
