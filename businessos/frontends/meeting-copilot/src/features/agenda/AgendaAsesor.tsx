'use client'

// M2 — Agenda del asesor: editor de disponibilidad + excepciones (columna
// central) y bandeja de solicitudes (panel derecho 22rem, patrón RecorderView).

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { UserX } from 'lucide-react'
import { Button, Chip, EmptyState, SectionHeader } from '@/shared/components/ui'
import { ETIQUETA_TIPO_ASESOR } from './types'
import { useAsesor } from './store'
import { EditorDisponibilidad } from './EditorDisponibilidad'
import { ListaExcepciones } from './ListaExcepciones'
import { BandejaSolicitudes } from './BandejaSolicitudes'

export function AgendaAsesor() {
  const params = useParams<{ id: string }>()
  const asesor = useAsesor(params.id ?? null)

  if (!asesor) {
    return (
      <EmptyState
        icono={UserX}
        titulo="Asesor no encontrado"
        descripcion="El asesor no existe o fue desactivado. Vuelve al catálogo para elegir otro."
        accion={
          <Link href="/asesores">
            <Button variante="primary" tamano="sm">
              Ver catálogo
            </Button>
          </Link>
        }
      />
    )
  }

  return (
    <div data-testid="agenda-asesor">
      <SectionHeader
        titulo={`Agenda de ${asesor.nombre}`}
        descripcion={asesor.especialidad}
        acciones={
          <>
            <Chip tono={asesor.tipo === 'ia' ? 'info' : 'neutral'}>{ETIQUETA_TIPO_ASESOR[asesor.tipo]}</Chip>
            <Link href={`/reservar/${asesor.slug}`}>
              <Button tamano="sm">Ver página de reserva</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-4">
          <EditorDisponibilidad asesor={asesor} />
          <ListaExcepciones asesor={asesor} />
        </div>
        <div className="space-y-3">
          <BandejaSolicitudes asesor={asesor} />
        </div>
      </div>
    </div>
  )
}
