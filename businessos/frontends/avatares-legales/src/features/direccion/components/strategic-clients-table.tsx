import { Chip, RiskBadge } from '@/shared/components/ui'
import { DataTable, type Columna } from '@/shared/components/table'
import type { ClienteEstrategico } from '@/features/direccion/types'

/**
 * StrategicClientsTable — cuentas clave con servicios usados, riesgo y
 * oportunidades de venta cruzada detectadas por el departamento de
 * adquisición. Dolor que ataca (INVESTIGACION-SINTESIS.md §4): clientes que
 * consumen varias prácticas sin visión de cuenta.
 */
export function StrategicClientsTable({
  clientes,
}: {
  clientes: ClienteEstrategico[]
}) {
  const columnas: Columna<ClienteEstrategico>[] = [
    {
      clave: 'cliente',
      encabezado: 'Cliente',
      render: (cliente) => (
        <>
          <span className="block font-medium">{cliente.nombre}</span>
          <span className="block text-xs text-ink-muted">{cliente.industria}</span>
        </>
      ),
    },
    {
      clave: 'servicios',
      encabezado: 'Servicios activos',
      render: (cliente) => (
        <span className="flex max-w-52 flex-wrap gap-1">
          {cliente.serviciosActivos.map((servicio) => (
            <Chip key={servicio}>{servicio}</Chip>
          ))}
        </span>
      ),
    },
    {
      clave: 'ingresos',
      encabezado: 'Ingresos anuales',
      alinear: 'derecha',
      render: (cliente) => (
        <span className="tabular-nums">{cliente.ingresosAnuales}</span>
      ),
    },
    {
      clave: 'riesgo',
      encabezado: 'Riesgo',
      render: (cliente) => <RiskBadge nivel={cliente.riesgo} />,
    },
    {
      clave: 'oportunidad',
      encabezado: 'Oportunidad',
      render: (cliente) => (
        <span className="block max-w-72 text-xs leading-relaxed text-ink-secondary">
          {cliente.oportunidad}
        </span>
      ),
    },
    {
      clave: 'responsable',
      encabezado: 'Responsable',
      render: (cliente) => (
        <span className="text-ink-secondary">{cliente.responsable}</span>
      ),
    },
  ]

  return (
    <DataTable
      columnas={columnas}
      filas={clientes}
      claveFila={(cliente) => cliente.id}
    />
  )
}
