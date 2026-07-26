import { Card } from '@/shared/components/card'
import type { EtapaEmbudo } from '../../types'
import { CHROME, SERIE_COLOR, STATUS, conAlpha } from '@/shared/constants/colors'

/**
 * Canvas del embudo de cliente: una banda centrada por etapa, cada vez más
 * angosta (silueta de embudo), con el conteo de leads dentro. Etapas con
 * leads se pintan con el azul de serie; vacías, en gris cromado. `ganado`
 * usa el verde de estado y `perdido` se muestra aparte como banda de salida.
 * Solo JSX + estilos inline deterministas (sin canvas del browser ni JS de
 * cliente): renderiza igual en SSR y en los tests sin navegador.
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
      <Card className="p-10 text-center">
        <p className="text-sm font-medium text-slate-300">Sin etapas de embudo</p>
        <p className="mt-1 text-xs text-slate-500">
          Cuando existan leads en la tabla, el embudo aparecerá aquí.
        </p>
      </Card>
    )
  }

  const paso = embudo.length > 1 ? (ANCHO_MAX - ANCHO_MIN) / (embudo.length - 1) : 0
  const total = embudo.reduce((s, e) => s + e.cuenta, 0)

  return (
    <Card>
      <div className="space-y-1.5">
        {embudo.map((e, i) => {
          const ancho = ANCHO_MAX - paso * i
          const activo = e.cuenta > 0
          const color = e.etapa === 'ganado' && activo ? STATUS.good : activo ? SERIE_COLOR : CHROME.muted
          return (
            <div
              key={e.etapa}
              className="mx-auto flex items-center justify-between rounded-md border px-4 py-2"
              style={{
                width: `${ancho}%`,
                borderColor: color,
                color,
                backgroundColor: activo ? conAlpha(color, 0.1) : 'transparent',
              }}
            >
              <span className="text-sm capitalize">{e.etapa.replace(/_/g, ' ')}</span>
              <span className="text-sm font-bold tabular-nums">{e.cuenta}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-sm">
        <span className="text-slate-400">
          {total} lead{total === 1 ? '' : 's'} en el embudo
        </span>
        <span style={{ color: perdidos > 0 ? STATUS.critical : CHROME.muted }}>
          perdidos: <span className="font-bold tabular-nums">{perdidos}</span>
        </span>
      </div>
    </Card>
  )
}
