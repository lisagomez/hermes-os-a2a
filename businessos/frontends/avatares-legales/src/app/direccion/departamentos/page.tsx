import { SectionHeader } from '@/shared/components/ui'
import { DepartmentTrioManager } from '@/features/direccion/components/department-trio-manager'
import { getTrioDepartments } from '@/features/direccion/services'

export default async function VistaDepartamentos() {
  const departamentos = await getTrioDepartments()
  return (
    <section>
      <SectionHeader
        titulo="Departamentos"
        descripcion="Departamentos operados por el trío Hermes→Ejecutor→Supervisor: estado, métricas del mes y bitácora de decisiones clave."
      />
      <DepartmentTrioManager departamentos={departamentos} />
    </section>
  )
}
