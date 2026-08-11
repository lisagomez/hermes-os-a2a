import { Chip, RiskBadge, SectionHeader } from '@/shared/components/ui'
import { DataTable, type Columna } from '@/shared/components/table'
import { ContractIntakeForm } from '@/features/contratos/components/contract-intake-form'
import { getContractOperations } from '@/features/contratos/services'
import type {
  EstadoContrato,
  OperacionContractual,
} from '@/features/contratos/types'

const ETIQUETA_ESTADO: Record<EstadoContrato, string> = {
  borrador: 'Borrador',
  en_revision: 'En revisión',
  aprobado: 'Aprobado',
  firmado: 'Firmado',
}

export default async function VistaIntakeOperacion() {
  const operaciones = await getContractOperations()

  const columnas: Columna<OperacionContractual>[] = [
    {
      clave: 'operacion',
      encabezado: 'Operación',
      render: (op) => (
        <>
          <span className="block font-medium">{op.nombre}</span>
          <span className="block font-mono text-xs text-ink-muted">{op.id}</span>
        </>
      ),
    },
    {
      clave: 'tipo',
      encabezado: 'Tipo',
      render: (op) => <Chip>{op.tipo}</Chip>,
    },
    {
      clave: 'partes',
      encabezado: 'Partes',
      render: (op) => (
        <span className="text-xs text-ink-secondary">{op.partes.join(' ↔ ')}</span>
      ),
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (op) => (
        <span className="text-ink-secondary">{ETIQUETA_ESTADO[op.estado]}</span>
      ),
    },
    {
      clave: 'riesgo',
      encabezado: 'Riesgo',
      render: (op) => <RiskBadge nivel={op.riesgo} />,
    },
    {
      clave: 'monto',
      encabezado: 'Monto',
      alinear: 'derecha',
      render: (op) => <span className="tabular-nums">{op.monto}</span>,
    },
  ]

  return (
    <div className="space-y-10">
      <section>
        <SectionHeader
          titulo="Intake de operación"
          descripcion="Registra partes, tipo de contrato, jurisdicciones, monto y riesgos clave. Hermes propone el precedente base y el grafo evalúa la operación."
        />
        <ContractIntakeForm />
      </section>

      <section>
        <SectionHeader titulo="Operaciones en curso" />
        <DataTable
          columnas={columnas}
          filas={operaciones}
          claveFila={(op) => op.id}
        />
      </section>
    </div>
  )
}
