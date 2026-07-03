import type { VerticalPantheon } from '../../types'
import { STATUS } from '../ai-spend/colors'
import { NeutralBadge } from '../grafo/badges'

const GATEWAY_TONO = {
  vivo: 'good',
  caido: 'critical',
  'sin-dato': undefined,
} as const

const DESCRIPCION: Record<VerticalPantheon['vertical'], string> = {
  personal: 'Vida personal — Kiris',
  negocio: 'Operación del negocio',
  clientes: 'Relación con clientes',
}

export function VerticalCard({ v }: { v: VerticalPantheon }) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold capitalize">{v.vertical}</h2>
          <p className="text-xs text-slate-500">{DESCRIPCION[v.vertical]}</p>
        </div>
        <NeutralBadge
          texto={v.gateway + (v.latencia_ms !== null ? ` · ${v.latencia_ms}ms` : '')}
          tono={GATEWAY_TONO[v.gateway]}
        />
      </header>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Bot</dt>
          <dd className="truncate text-slate-300">{v.bot ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Cerebro</dt>
          <dd className="truncate text-slate-100" title={v.modelo ?? undefined}>
            {v.modelo ?? 'sin snapshot'}
          </dd>
        </div>
        {v.fallbacks.length > 0 && (
          <div>
            <dt className="text-slate-500">Fallbacks</dt>
            <dd className="mt-1 space-y-0.5">
              {v.fallbacks.map((f, i) => (
                <p key={f} className="truncate text-xs text-slate-400" title={f}>
                  {i + 1}. {f}
                </p>
              ))}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Skills ({v.skills.length})
        </h3>
        {v.skills.length === 0 ? (
          <p className="mt-1 text-xs text-slate-600">sin skills instalados</p>
        ) : (
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {v.skills.map((s) => (
              <li
                key={s.nombre}
                className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300"
                title={s.descripcion ?? undefined}
              >
                {s.nombre}
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="mt-4 border-t border-slate-800 pt-2 text-xs text-slate-600">
        {v.snapshot_at
          ? `snapshot: ${v.snapshot_at.slice(0, 16).replace('T', ' ')} UTC`
          : 'sin snapshot del host-job todavía'}
        {v.gateway === 'sin-dato' && (
          <span style={{ color: STATUS.warning }}> · health no consultado</span>
        )}
      </footer>
    </article>
  )
}
