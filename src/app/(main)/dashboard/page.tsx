import { getDataSource } from '@/features/dashboard/services'

export const dynamic = 'force-dynamic'

export default async function PantheonPage() {
  const pantheon = await getDataSource().pantheon()
  return (
    <div>
      <h1 className="text-2xl font-bold">Pantheon</h1>
      <p className="mt-1 text-sm text-slate-400">
        Las tres verticales Hermes — estado, cerebro y skills. (Vista completa en Fase 4.)
      </p>
      <ul className="mt-6 space-y-2">
        {pantheon.map((v) => (
          <li key={v.vertical} className="rounded border border-slate-800 bg-slate-900/50 px-4 py-3">
            <span className="font-semibold capitalize">{v.vertical}</span>
            <span className="ml-3 text-sm text-slate-400">
              {v.gateway} {v.modelo ? `· ${v.modelo}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
