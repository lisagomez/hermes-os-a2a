'use client'

import { Card } from '@/shared/components/card'
import { MicroLabel } from '@/shared/components/section-title'
import type { ConstructorExplorador } from '../../../types'

/**
 * Constructor de flujos de consulta (App C paso 3): pinta los insumos de un
 * ámbito (regímenes y categorías derivados SOLO de reglas vigentes, cortesía
 * de flujos-a2a) y el payload listo para POST /evaluaciones del grafo.
 *
 * Frontera dura heredada por construcción: esta vista JAMÁS escribe — el
 * payload se copia y se ejecuta fuera del panel (flujos-a2a solo emite GETs).
 * Componente puro sin hooks (testeable por el gate sin navegador).
 */
export function ConstructorPanel({ insumos }: { insumos: ConstructorExplorador }) {
  const payloadJson = JSON.stringify(insumos.plantilla_payload, null, 2)
  return (
    <Card as="section">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-ink">Constructor de flujos</h2>
        <span className="text-xs text-ink-secondary">
          {insumos.jurisdiccion} · {insumos.dimension}
          {insumos.fecha ? ` · vigencia al ${insumos.fecha}` : ''}
        </span>
      </header>

      <div className="mt-4">
        <MicroLabel>Regímenes con impactos vigentes</MicroLabel>
        {insumos.regimenes.length === 0 ? (
          <p className="mt-1 text-xs italic text-ink-muted">
            Ninguno propio del ámbito: la plantilla usa el régimen por defecto (
            {insumos.regimen_default}).
          </p>
        ) : (
          <div className="mt-1 flex flex-wrap gap-2">
            {insumos.regimenes.map((r) => (
              <span
                key={r}
                className={
                  r === insumos.regimen_default
                    ? 'rounded-full border border-success px-2 py-0.5 text-xs font-semibold text-success'
                    : 'rounded-full border border-line px-2 py-0.5 text-xs text-ink-secondary'
                }
              >
                {r}
                {r === insumos.regimen_default ? ' · default' : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        <MicroLabel>Categorías del ámbito</MicroLabel>
        {insumos.categorias.length === 0 ? (
          <p className="mt-1 text-xs italic text-ink-muted">
            Sin categorías referenciadas por reglas vigentes de este ámbito.
          </p>
        ) : (
          <ul className="mt-1 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
            {insumos.categorias.map((c) => (
              <li key={c.clave}>
                <code className="text-ink-muted">{c.clave}</code>{' '}
                <span className="text-ink-secondary">{c.nombre}</span>
                {c.descripcion ? (
                  <span className="text-ink-muted"> — {c.descripcion}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-3">
          <MicroLabel>Payload para POST /evaluaciones del grafo</MicroLabel>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(payloadJson)
            }}
            className="rounded-md border border-line px-2 py-0.5 text-xs text-ink-secondary hover:border-ink-muted"
          >
            Copiar
          </button>
        </div>
        <pre className="mt-2 overflow-x-auto rounded-md border border-line bg-background p-3 text-xs text-ink-secondary">
          {payloadJson}
        </pre>
        <p className="mt-2 text-xs italic text-ink-muted">
          Esta vista JAMÁS escribe: completa los conceptos y ejecuta el payload
          contra el grafo fuera del panel. El veredicto llegará con fuente
          citada y disclaimer (regla de oro).
        </p>
      </div>
    </Card>
  )
}
