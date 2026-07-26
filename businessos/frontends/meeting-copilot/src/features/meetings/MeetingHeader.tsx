'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { Reunion } from '@/features/domain/types'
import { ETIQUETA_TIPO_REUNION } from '@/features/domain/types'
import { Chip } from '@/shared/components/ui'
import { fmtDuracion, fmtFecha } from '@/shared/lib/format'

const TABS = [
  { seg: 'transcripcion', etiqueta: 'Transcripción' },
  { seg: 'insights', etiqueta: 'Insights' },
  { seg: 'guiada', etiqueta: 'Guided Meeting' },
  { seg: 'resumen', etiqueta: 'Resumen' },
]

export function MeetingHeader({ reunion }: { reunion: Reunion }) {
  const pathname = usePathname()
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/reuniones" className="rounded p-1 text-ink-muted hover:text-ink" title="Volver a reuniones">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-base font-semibold text-ink">{reunion.titulo}</h1>
        <Chip>{ETIQUETA_TIPO_REUNION[reunion.tipoReunion]}</Chip>
        <span className="text-[12px] text-ink-secondary">
          {reunion.cuenta} · {fmtFecha(reunion.fecha)} · {fmtDuracion(reunion.duracionS)} ·{' '}
          {reunion.participantes.map((p) => p.nombre).join(', ')}
        </span>
      </div>
      <nav className="flex gap-1 border-b border-line">
        {TABS.map((t) => {
          const href = `/reuniones/${reunion.id}/${t.seg}`
          const activo = pathname === href
          return (
            <Link
              key={t.seg}
              href={href}
              data-testid={`tab-reunion-${t.seg}`}
              className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-medium transition-colors ${
                activo ? 'border-accent text-accent' : 'border-transparent text-ink-secondary hover:text-ink'
              }`}
            >
              {t.etiqueta}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
