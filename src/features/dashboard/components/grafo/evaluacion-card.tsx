import { Card } from '@/shared/components/card'
import { MicroLabel } from '@/shared/components/section-title'
import type { Evaluacion } from '../../types'
import { EstadoBadge } from './badges'

/**
 * Una evaluación del grafo. Regla de oro del proyecto: todo veredicto se
 * muestra CON su fuente citada, y el disclaimer nunca se resume ni se quita.
 */
export function EvaluacionCard({ evaluacion }: { evaluacion: Evaluacion }) {
  const c = evaluacion.contexto
  return (
    <Card as="article">
      <header className="flex flex-wrap items-center gap-3">
        <EstadoBadge estado={evaluacion.estado} />
        <span className="text-xs text-ink-secondary">
          {c.jurisdiccion} · {c.dimension} · {c.regimen} · {c.fecha}
        </span>
        <time className="ml-auto text-xs text-ink-muted">{evaluacion.creado_at.slice(0, 16).replace('T', ' ')}</time>
      </header>

      <ul className="mt-4 space-y-3">
        {evaluacion.conceptos.map((con) => (
          <li key={con.descripcion} className="border-l-2 border-line pl-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink">{con.descripcion}</span>
              <EstadoBadge estado={con.estado} />
            </div>
            <p className="mt-1 text-xs text-ink-secondary">{con.razon}</p>
            {con.fuente ? (
              <p className="mt-1 text-xs">
                <a
                  href={con.fuente.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-info underline decoration-dotted hover:text-info"
                >
                  {con.fuente.cita}
                </a>
                <span className="ml-2 text-ink-muted">{con.fuente.clave}</span>
              </p>
            ) : (
              <p className="mt-1 text-xs italic text-ink-muted">sin regla aplicable (fail-safe)</p>
            )}
            {con.banderas.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-warning">
                {con.banderas.map((b) => (
                  <li key={b}>▲ {b}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {evaluacion.checklist.length > 0 && (
        <div className="mt-4">
          <MicroLabel>Checklist</MicroLabel>
          <ul className="mt-1 grid gap-x-6 gap-y-0.5 text-xs text-ink-secondary sm:grid-cols-2">
            {evaluacion.checklist.map((item) => (
              <li key={item}>☐ {item}</li>
            ))}
          </ul>
        </div>
      )}

      <footer className="mt-4 border-t border-line pt-3 text-xs italic text-ink-muted">
        {evaluacion.disclaimer}
      </footer>
    </Card>
  )
}
