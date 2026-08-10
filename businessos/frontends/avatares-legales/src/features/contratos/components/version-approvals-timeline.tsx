import { Card, Chip } from '@/shared/components/ui'
import { Timeline, type EventoTimeline } from '@/shared/components/timeline'
import type {
  EstadoContrato,
  HistorialVersiones,
} from '@/features/contratos/types'

/**
 * VersionApprovalsTimeline — versiones y aprobaciones por contrato.
 * Dolor que ataca (INVESTIGACION-SINTESIS.md §3): visibilidad de quién
 * aprobó qué y cuándo. Estados de flujo con fichas neutras/acento (C4).
 */

const ETIQUETA_ESTADO: Record<EstadoContrato, { texto: string; tono: 'neutro' | 'acento' }> = {
  borrador: { texto: 'Borrador', tono: 'neutro' },
  en_revision: { texto: 'En revisión', tono: 'neutro' },
  aprobado: { texto: 'Aprobado', tono: 'acento' },
  firmado: { texto: 'Firmado', tono: 'acento' },
}

function HistorialCard({ historial }: { historial: HistorialVersiones }) {
  const eventos: EventoTimeline[] = historial.versiones.map((version) => {
    const estado = ETIQUETA_ESTADO[version.estado]
    return {
      id: version.id,
      fecha: version.fecha,
      titulo: `${version.version} — ${version.autor}`,
      adorno: <Chip tono={estado.tono}>{estado.texto}</Chip>,
      descripcion: (
        <>
          {version.cambios}
          {version.aprobaciones.length > 0 ? (
            <span className="mt-1 block text-xs text-ink-muted">
              Aprobaciones:{' '}
              {version.aprobaciones
                .map((a) => `${a.nombre} (${a.rol}, ${a.fecha})`)
                .join(' · ')}
            </span>
          ) : null}
          {version.comentario ? (
            <span className="mt-1 block text-xs italic text-ink-muted">
              «{version.comentario}»
            </span>
          ) : null}
        </>
      ),
    }
  })

  return (
    <Card>
      <h3 className="font-display text-lg font-semibold text-ink">
        {historial.nombre}
      </h3>
      <p className="mb-4 font-mono text-xs text-ink-muted">
        {historial.contratoId}
      </p>
      <Timeline eventos={eventos} />
    </Card>
  )
}

export function VersionApprovalsTimeline({
  historiales,
}: {
  historiales: HistorialVersiones[]
}) {
  return (
    <div className="space-y-5">
      {historiales.map((historial) => (
        <HistorialCard key={historial.contratoId} historial={historial} />
      ))}
    </div>
  )
}
