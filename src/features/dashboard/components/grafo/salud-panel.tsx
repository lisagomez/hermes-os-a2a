import { Card } from '@/shared/components/card'
import { SectionTitle } from '@/shared/components/section-title'
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
      <Card as="section">
        <SectionTitle>Salud del conocimiento</SectionTitle>
        <p className="mt-3 text-sm text-ink-muted">
          Grafo inalcanzable — sin datos de vigencias. (En dev es lo esperado si no hay mock.)
        </p>
      </Card>
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
    <Card as="section">
      <div className="flex items-center justify-between">
        <SectionTitle>Salud del conocimiento</SectionTitle>
        <NeutralBadge texto={texto} tono={tono} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-ink-muted">Reglas</dt>
          <dd className="text-xl font-bold tabular-nums">{salud.reglas_total}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Ámbitos</dt>
          <dd className="text-xl font-bold tabular-nums">{salud.ambitos.length}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Vencidas</dt>
          <dd className="text-xl font-bold tabular-nums">{salud.reglas_vencidas.length}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Por cotejar</dt>
          <dd className="text-xl font-bold tabular-nums">{salud.verificar_pendientes.length}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-ink-muted">
        Ámbitos: {salud.ambitos.map((a) => `${a.jurisdiccion}·${a.dimension}`).join(' — ')}
      </p>
      {salud.advertencia && (
        <p className="mt-2 text-xs text-warning">{salud.advertencia}</p>
      )}
    </Card>
  )
}
