import { CHROME, SERIE_COLOR, STATUS } from '@/shared/constants/colors'

/**
 * Badge de estado de un contrato SC (contratos_sc, Fase 12 F5). Estado nunca
 * es color solo: glifo aria-hidden + texto (regla dura del panel). `estado`
 * llega como string tolerante (lección enum 2026-07-23): un estado que este
 * mapa no conozca se pinta gris con glifo neutro, jamás revienta.
 */
const ESTADO_CONTRATO: Record<string, { color: string; icono: string }> = {
  fabricando: { color: SERIE_COLOR, icono: '●' },
  en_revision: { color: STATUS.warning, icono: '◌' },
  aprobado: { color: STATUS.good, icono: '✓' },
  desplegado: { color: STATUS.good, icono: '◆' },
  rechazado: { color: STATUS.critical, icono: '✕' },
  escalado: { color: STATUS.warning, icono: '▲' },
}

export function EstadoContratoBadge({ estado }: { estado: string }) {
  const e = ESTADO_CONTRATO[estado] ?? { color: CHROME.muted, icono: '○' }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold capitalize"
      style={{ color: e.color, borderColor: e.color }}
    >
      <span aria-hidden>{e.icono}</span>
      {estado.replace(/_/g, ' ')}
    </span>
  )
}
