import { SectionHeader } from '@/shared/components/ui'
import { PrecedentRepository } from '@/features/contratos/components/precedent-repository'
import { searchPrecedents } from '@/features/contratos/services'

export default async function VistaPrecedentes() {
  const precedentes = await searchPrecedents()
  return (
    <section>
      <SectionHeader
        titulo="Repositorio de precedentes"
        descripcion="Contratos anteriores del despacho con etiquetas y métricas de uso; base de las sugerencias de Hermes."
      />
      <PrecedentRepository precedentes={precedentes} />
    </section>
  )
}
