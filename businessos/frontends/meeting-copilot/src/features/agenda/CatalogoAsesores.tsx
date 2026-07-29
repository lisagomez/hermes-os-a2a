'use client'

// M1 — Catálogo de asesores (humanos + IA como entidades del mismo tipo).
// El filtro es estado de navegación → vive en la URL (?tipo=), regla 2 de
// hermes-design-integrity.

import { useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Users } from 'lucide-react'
import { Callout, EmptyState, PillToggle, SectionHeader } from '@/shared/components/ui'
import { useAgendaStore } from './store'
import { TarjetaAsesor } from './TarjetaAsesor'

type FiltroTipo = 'todos' | 'humano' | 'ia'

const FILTROS: { id: FiltroTipo; contenido: string }[] = [
  { id: 'todos', contenido: 'Todos' },
  { id: 'humano', contenido: 'Humanos' },
  { id: 'ia', contenido: 'IA' },
]

export function CatalogoAsesores() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const asesores = useAgendaStore((s) => s.asesores)

  const crudo = searchParams.get('tipo')
  const filtro: FiltroTipo = crudo === 'humano' || crudo === 'ia' ? crudo : 'todos'

  const visibles = useMemo(
    () => asesores.filter((a) => a.activo && (filtro === 'todos' || a.tipo === filtro)),
    [asesores, filtro]
  )

  const cambiarFiltro = (v: FiltroTipo) => {
    router.replace(v === 'todos' ? pathname : `${pathname}?tipo=${v}`, { scroll: false })
  }

  return (
    <div data-testid="catalogo-asesores">
      <SectionHeader
        titulo="Asesores"
        descripcion="Catálogo de asesores humanos e IA: especialidad, idiomas y disponibilidad derivada de su agenda."
        acciones={
          <PillToggle
            opciones={FILTROS.map((f) => ({ ...f, testid: `filtro-tipo-${f.id}` }))}
            valor={filtro}
            onCambio={cambiarFiltro}
            etiqueta="Filtrar por tipo de asesor"
            claseBoton="px-3 py-1 text-[12px]"
          />
        }
      />

      <Callout tono="info" variante="inline" className="mb-4">
        <p className="text-[12px] text-ink-secondary">Catálogo demo — datos mock declarados; los horarios sin asesor humano podrán cubrirse por IA (pendiente anotado).</p>
      </Callout>

      {visibles.length === 0 ? (
        <EmptyState
          icono={Users}
          titulo="Ningún asesor coincide con el filtro"
          descripcion="Cambia el filtro para ver el catálogo completo (los asesores demo siempre están disponibles)."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((a) => (
            <TarjetaAsesor key={a.id} asesor={a} />
          ))}
        </div>
      )}
    </div>
  )
}
