'use client'

import Link from 'next/link'
import { Eye, Pencil, Star, Trash2 } from 'lucide-react'
import { Button, Card, Chip } from '@/shared/components/ui'
import type { Asesor } from './types'
import { ETIQUETA_TIPO_ASESOR } from './types'
import { SemaforoDisponibilidad } from './SemaforoDisponibilidad'

export function TarjetaAsesor({
  asesor,
  onVer,
  onEditar,
  onBorrar,
}: {
  asesor: Asesor
  onVer: () => void
  onEditar: () => void
  onBorrar: () => void
}) {
  return (
    <Card className="group flex h-full flex-col gap-3 p-4" data-testid="tarjeta-asesor" data-tipo={asesor.tipo} data-slug={asesor.slug}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-semibold text-accent-ink">
          {asesor.avatarIniciales}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[14px] font-semibold text-ink">{asesor.nombre}</p>
            <Chip tono={asesor.tipo === 'ia' ? 'info' : 'neutral'}>{ETIQUETA_TIPO_ASESOR[asesor.tipo]}</Chip>
          </div>
          <p className="mt-0.5 line-clamp-1 text-[12px] text-ink-secondary">{asesor.especialidad}</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-secondary" title="Rating promedio">
          <Star className="h-3.5 w-3.5 text-warning" />
          {asesor.rating === null ? '—' : asesor.rating.toFixed(1)}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button variante="ghost" tamano="sm" title="Visualizar ficha" data-testid={`ver-${asesor.slug}`} onClick={onVer}>
          <Eye className="h-3.5 w-3.5" /> Visualizar
        </Button>
        <Button variante="ghost" tamano="sm" title="Editar asesor" data-testid={`editar-${asesor.slug}`} onClick={onEditar}>
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
        <Button variante="ghost" tamano="sm" title="Borrar asesor" data-testid={`borrar-${asesor.slug}`} onClick={onBorrar}>
          <Trash2 className="h-3.5 w-3.5" /> Borrar
        </Button>
      </div>

      <p className="line-clamp-2 text-[12px] leading-snug text-ink-secondary">{asesor.bio}</p>

      <div className="flex flex-wrap items-center gap-1.5">
        {asesor.idiomas.map((i) => (
          <Chip key={i}>{i.toUpperCase()}</Chip>
        ))}
        <Chip>{asesor.duracionDefaultMin} min</Chip>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line-subtle pt-3">
        <SemaforoDisponibilidad asesor={asesor} />
        <div className="flex items-center gap-2">
          <Link href={`/asesores/${asesor.id}/agenda`}>
            <Button tamano="sm">Ver agenda</Button>
          </Link>
          <Link href={`/reservar/${asesor.slug}`} data-testid={`reservar-${asesor.slug}`}>
            <Button variante="primary" tamano="sm">
              Reservar
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}
