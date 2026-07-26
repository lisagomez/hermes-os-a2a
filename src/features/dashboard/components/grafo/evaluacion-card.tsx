import { Card } from '@/shared/components/card'
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
        <span className="text-xs text-slate-400">
          {c.jurisdiccion} · {c.dimension} · {c.regimen} · {c.fecha}
        </span>
        <time className="ml-auto text-xs text-slate-500">{evaluacion.creado_at.slice(0, 16).replace('T', ' ')}</time>
      </header>

      <ul className="mt-4 space-y-3">
        {evaluacion.conceptos.map((con) => (
          <li key={con.descripcion} className="border-l-2 border-slate-700 pl-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-100">{con.descripcion}</span>
              <EstadoBadge estado={con.estado} />
            </div>
            <p className="mt-1 text-xs text-slate-400">{con.razon}</p>
            {con.fuente ? (
              <p className="mt-1 text-xs">
                <a
                  href={con.fuente.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 underline decoration-dotted hover:text-sky-300"
                >
                  {con.fuente.cita}
                </a>
                <span className="ml-2 text-slate-600">{con.fuente.clave}</span>
              </p>
            ) : (
              <p className="mt-1 text-xs italic text-slate-500">sin regla aplicable (fail-safe)</p>
            )}
            {con.banderas.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-amber-400">
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
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Checklist</h3>
          <ul className="mt-1 grid gap-x-6 gap-y-0.5 text-xs text-slate-400 sm:grid-cols-2">
            {evaluacion.checklist.map((item) => (
              <li key={item}>☐ {item}</li>
            ))}
          </ul>
        </div>
      )}

      <footer className="mt-4 border-t border-slate-800 pt-3 text-xs italic text-slate-500">
        {evaluacion.disclaimer}
      </footer>
    </Card>
  )
}
