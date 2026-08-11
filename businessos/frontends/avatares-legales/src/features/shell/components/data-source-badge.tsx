import { Database } from 'lucide-react'
import { FUENTE_DATOS } from '@/shared/types'

/**
 * Insignia global de procedencia de datos. En el prototipo siempre "muestra
 * (mock)"; cuando exista backend real, FUENTE_DATOS se deriva de la costura
 * de services y esta insignia lo refleja sin tocar la UI.
 */
export function DataSourceBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 py-1 font-mono text-[11px] text-ink-muted">
      <Database size={12} strokeWidth={1.75} aria-hidden />
      Datos: {FUENTE_DATOS === 'mock' ? 'muestra (mock)' : FUENTE_DATOS}
    </span>
  )
}
