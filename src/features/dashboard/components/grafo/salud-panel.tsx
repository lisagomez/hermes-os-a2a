import type { SaludConocimiento } from '../../types'
import { NeutralBadge } from './badges'

/**
 * Semáforo del conocimiento (mismo dato que revisar-vigencias.py):
 * rojo = reglas vencidas sirviendo (el grafo mentiría con certeza),
 * ámbar = montos con cotejo oficial pendiente, verde = todo vigente.
 */
export function SaludPanel({ salud }: { salud: SaludConocimiento | null }) {
  if (!salud) {
    return (
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-sm font-medium text-slate-400">Salud del conocimiento</h2>
        <p className="mt-3 text-sm text-slate-500">
          Grafo inalcanzable — sin datos de vigencias. (En dev es lo esperado si no hay mock.)
        </p>
      </section>
    )
  }

  const tono =
    salud.reglas_vencidas.length > 0
      ? ('critical' as const)
      : salud.verificar_pendientes.length > 0
        ? ('warning' as const)
        : ('good' as const)
  const texto =
    tono === 'critical'
      ? `${salud.reglas_vencidas.length} regla(s) VENCIDA(S) sirviendo`
      : tono === 'warning'
        ? `${salud.verificar_pendientes.length} monto(s) sin cotejo oficial`
        : 'conocimiento vigente'

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-400">Salud del conocimiento</h2>
        <NeutralBadge texto={texto} tono={tono} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">Reglas</dt>
          <dd className="text-xl font-bold tabular-nums">{salud.reglas_total}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Ámbitos</dt>
          <dd className="text-xl font-bold tabular-nums">{salud.ambitos.length}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Vencidas</dt>
          <dd className="text-xl font-bold tabular-nums">{salud.reglas_vencidas.length}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Por cotejar</dt>
          <dd className="text-xl font-bold tabular-nums">{salud.verificar_pendientes.length}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-slate-500">
        Ámbitos: {salud.ambitos.map((a) => `${a.jurisdiccion}·${a.dimension}`).join(' — ')}
      </p>
      {salud.advertencia && (
        <p className="mt-2 text-xs text-amber-400">{salud.advertencia}</p>
      )}
    </section>
  )
}
