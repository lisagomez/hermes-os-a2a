import { Card } from '@/shared/components/ui'
import type { EtapaEmbudo } from './types'

/**
 * Canvas del embudo de cliente: una banda centrada por etapa, cada vez más
 * angosta (silueta de embudo), con el conteo de leads dentro. Etapas con
 * leads se pintan con el acento; vacías, en cromado; `ganado` en success y
 * `perdido` se muestra aparte como banda de salida. Solo JSX + un width
 * inline determinista (layout, no color): renderiza igual en SSR y en los
 * tests sin navegador, y el color va por tokens para el dual-theme.
 */

const ANCHO_MAX = 100 // % de la primera etapa
const ANCHO_MIN = 38 // % de la última (silueta, no proporción de datos)

export function EmbudoCanvas({
  embudo,
  perdidos,
}: {
  embudo: EtapaEmbudo[]
  perdidos: number
}) {
  if (embudo.length === 0) {
    return (
      <Card className="px-6 py-10 text-center">
        <p className="text-sm font-semibold text-ink">Sin etapas de embudo</p>
        <p className="mt-1 text-[13px] text-ink-secondary">
          Cuando existan leads en la tabla, el embudo aparecerá aquí.
        </p>
      </Card>
    )
  }

  const paso = embudo.length > 1 ? (ANCHO_MAX - ANCHO_MIN) / (embudo.length - 1) : 0
  const total = embudo.reduce((s, e) => s + e.cuenta, 0)

  return (
    <Card className="p-4" data-testid="crm-embudo">
      <div className="space-y-1.5">
        {embudo.map((e, i) => {
          const ancho = ANCHO_MAX - paso * i
          const activo = e.cuenta > 0
          const tono = !activo
            ? 'border-line text-ink-muted'
            : e.etapa === 'ganado'
              ? 'border-success bg-success-muted text-success'
              : 'border-accent bg-accent-muted text-accent'
          return (
            <div
              key={e.etapa}
              className={`mx-auto flex items-center justify-between rounded-s border px-4 py-2 ${tono}`}
              style={{ width: `${ancho}%` }}
            >
              <span className="text-[13px] capitalize">{e.etapa.replace(/_/g, ' ')}</span>
              <span className="text-[13px] font-semibold tabular-nums">{e.cuenta}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[13px]">
        <span className="text-ink-secondary">
          {total} lead{total === 1 ? '' : 's'} en el embudo
        </span>
        <span className={perdidos > 0 ? 'text-danger' : 'text-ink-muted'}>
          perdidos: <span className="font-semibold tabular-nums">{perdidos}</span>
        </span>
      </div>
    </Card>
  )
}
