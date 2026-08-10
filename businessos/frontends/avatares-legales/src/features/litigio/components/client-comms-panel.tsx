import { Card, Chip } from '@/shared/components/ui'
import { HermesTag } from '@/shared/components/confianza'
import type { AutorMensaje, ComunicacionCaso } from '@/features/litigio/types'

/**
 * ClientCommsPanel — comunicación estructurada con clientes, agrupada por
 * caso. Dolor que ataca (INVESTIGACION-SINTESIS.md §2): comunicación
 * fragmentada. Los borradores de Hermes se marcan 'Sugerido' y NUNCA salen
 * al cliente sin aprobación humana (indicador de confianza del prompt).
 */

const ETIQUETA_AUTOR: Record<AutorMensaje, string> = {
  despacho: 'Despacho',
  hermes: 'Hermes',
  cliente: 'Cliente',
}

function GrupoCaso({ comunicacion }: { comunicacion: ComunicacionCaso }) {
  return (
    <Card>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">
            {comunicacion.cliente}
          </h3>
          <p className="font-mono text-xs text-ink-muted">
            {comunicacion.casoId} · {comunicacion.abogado}
          </p>
        </div>
      </header>

      <ol className="mt-4 space-y-3">
        {comunicacion.mensajes.map((mensaje) => {
          const sugerido = mensaje.estado === 'sugerido'
          return (
            <li
              key={mensaje.id}
              className={`rounded-control border p-3 ${
                sugerido
                  ? 'border-accent bg-accent-muted/40'
                  : 'border-line bg-surface-muted/50'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {mensaje.autor === 'hermes' ? (
                  <HermesTag />
                ) : (
                  <span className="font-medium text-ink-secondary">
                    {ETIQUETA_AUTOR[mensaje.autor]}
                  </span>
                )}
                <span className="font-mono tabular-nums text-ink-muted">
                  {mensaje.fecha}
                </span>
                {sugerido ? (
                  <Chip tono="acento">Sugerido — requiere aprobación</Chip>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink">
                {mensaje.texto}
              </p>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

export function ClientCommsPanel({
  comunicaciones,
}: {
  comunicaciones: ComunicacionCaso[]
}) {
  return (
    <div className="space-y-5">
      {comunicaciones.map((comunicacion) => (
        <GrupoCaso key={comunicacion.casoId} comunicacion={comunicacion} />
      ))}
    </div>
  )
}
