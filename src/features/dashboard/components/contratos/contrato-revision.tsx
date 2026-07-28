import type { ReactNode } from 'react'
import { Card } from '@/shared/components/card'
import { MicroLabel } from '@/shared/components/section-title'
import { CHROME, STATUS, conAlpha } from '@/shared/constants/colors'
import type { ContratoSc } from '../../types'
import { EstadoContratoBadge } from './estado-contrato-badge'

/**
 * Paquete de revisión de un contrato SC (Fase 12 F5) — anti-sello-de-goma G4:
 * las banderas G1 van ARRIBA (lo primero que ve la revisora), el diff acotado
 * y el hash G5 siempre visibles, y el renglón fijo de O1 ("¿qué gana cada
 * parte si esto sale mal?") es parte del paquete, no un extra. El tiempo en
 * revisión se muestra como métrica de fatiga (G4).
 *
 * Componente PURO y server-safe (sin hooks): `ahora` llega por props para que
 * los tests sin navegador aserten sin reloj. Las acciones (aprobar/rechazar)
 * llegan como slot — la decisión y su auth viven en la página/server action.
 */

const SEVERIDAD: Record<string, { color: string; icono: string }> = {
  alta: { color: STATUS.critical, icono: '▲' },
  media: { color: STATUS.warning, icono: '▲' },
}

function fecha(iso: string | null): string {
  return iso ? iso.slice(0, 16).replace('T', ' ') : '—'
}

function duracion(desdeIso: string | null, hastaMs: number): string | null {
  if (!desdeIso) return null
  const min = Math.max(0, Math.round((hastaMs - Date.parse(desdeIso)) / 60_000))
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${min % 60} min`
}

export function ContratoRevision({
  contrato,
  ahora,
  acciones,
}: {
  contrato: ContratoSc
  ahora: number
  acciones?: ReactNode
}) {
  const c = contrato
  const enRevision = c.estado === 'en_revision'
  const fin = c.aprobado_en ? Date.parse(c.aprobado_en) : ahora
  const tiempoRevision = duracion(c.en_revision_desde, fin)
  const red = c.red_efimera

  return (
    <Card as="article" className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="font-semibold text-slate-100">{c.task_id}</h2>
        <EstadoContratoBadge estado={c.estado} />
        <span className="text-xs text-slate-400">
          {c.plantilla} · canal <code>{c.canal_destino ?? '—'}</code> · seq{' '}
          {c.secuencia} · pide {c.solicitante}
        </span>
        <span className="ml-auto text-xs text-slate-500">
          fabricado {fecha(c.created_at)}
        </span>
      </header>

      {/* G4: banderas G1 SIEMPRE arriba. Sin banderas también se dice. */}
      {c.banderas.length > 0 ? (
        <div className="space-y-2">
          {c.banderas.map((b, i) => {
            const s = SEVERIDAD[b.severidad] ?? SEVERIDAD.media
            return (
              <div
                key={i}
                className="rounded border px-3 py-2 text-sm"
                style={{
                  color: s.color,
                  borderColor: s.color,
                  backgroundColor: conAlpha(s.color, 0.08),
                }}
              >
                <span aria-hidden>{s.icono}</span>{' '}
                <strong>
                  bandera {b.severidad}: {b.codigo.replace(/_/g, ' ')}
                </strong>{' '}
                — {b.detalle} <span className="opacity-80">({b.donde})</span>
              </div>
            )
          })}
          <p className="text-xs" style={{ color: STATUS.warning }}>
            <span aria-hidden>⚠</span> Spec con banderas: exige segunda mirada
            (4 ojos) antes de aprobar.
          </p>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          <span aria-hidden>○</span> Sin banderas G1 — la revisión sigue siendo
          tuya, no del detector.
        </p>
      )}

      {/* O1: la revisión valida la spec contra la intención del negocio. */}
      <div
        className="rounded border px-3 py-2 text-sm"
        style={{ borderColor: CHROME.grid, color: CHROME.muted }}
      >
        <span aria-hidden>◆</span> Pregunta obligada del paquete: ¿qué gana cada
        parte si esto sale mal? La aprobación valida la spec contra la intención
        del negocio, no solo el código contra la spec.
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <MicroLabel>Red efímera</MicroLabel>
          {red ? (
            <p className="mt-1 text-sm" style={{ color: red.verde ? STATUS.good : STATUS.critical }}>
              <span aria-hidden>{red.verde ? '✓' : '✕'}</span>{' '}
              {red.verde
                ? `verde — ${red.resumen?.transiciones ?? '?'} transiciones, ${red.resumen?.negativos ?? '?'} negativos, ${red.resumen?.invocaciones ?? '?'} invocaciones`
                : `roja en fase ${red.fase ?? '?'}: ${red.motivo ?? 'ver contratos_sc.red_efimera'}`}
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">
              sin corrida — el gate verificar-red-efimera.py aún no procesa este
              paquete
            </p>
          )}
        </section>
        <section>
          <MicroLabel>Hash del paquete (G5)</MicroLabel>
          <p className="mt-1 break-all font-mono text-xs text-slate-400" title={c.hash_paquete ?? undefined}>
            {c.hash_paquete ?? 'sin hash registrado'}
          </p>
          <p className="text-xs text-slate-500">
            El despliegue re-verifica este hash: lo que se despliega es bit a
            bit lo que apruebas.
          </p>
        </section>
      </div>

      <section>
        <MicroLabel>Diff acotado contra la plantilla auditada</MicroLabel>
        {c.manifest.diff.length > 0 ? (
          <table className="mt-1 w-full text-left font-mono text-xs">
            <thead>
              <tr className="text-slate-500">
                <th className="py-1 pr-4 font-normal">antes (escrow-v1)</th>
                <th className="py-1 font-normal">después (parametrizado)</th>
              </tr>
            </thead>
            <tbody>
              {c.manifest.diff.map((d, i) => (
                <tr key={i} className="border-t border-slate-800 align-top">
                  <td className="py-1 pr-4 text-slate-400">{d.antes}</td>
                  <td className="py-1 text-slate-200">{d.despues}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-1 text-sm text-slate-500">
            sin líneas de diff en el manifest
          </p>
        )}
      </section>

      {c.manifest.criterios_aceptacion.length > 0 ? (
        <section>
          <MicroLabel>Criterios de aceptación de la spec</MicroLabel>
          <ul className="mt-1 list-inside list-disc text-sm text-slate-300">
            {c.manifest.criterios_aceptacion.map((cr, i) => (
              <li key={i}>{cr}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="flex flex-wrap items-center gap-4 border-t border-slate-800 pt-3 text-xs text-slate-400">
        {tiempoRevision ? (
          <span>
            <span aria-hidden>◔</span> tiempo en revisión: {tiempoRevision}
            {enRevision ? ' (corriendo)' : ''}
          </span>
        ) : null}
        {c.aprobado_por ? (
          <span>
            decidió {c.aprobado_por} el {fecha(c.aprobado_en)}
          </span>
        ) : null}
        {c.motivo_rechazo ? <span>motivo: {c.motivo_rechazo}</span> : null}
        {c.desplegado_en ? <span>desplegado {fecha(c.desplegado_en)}</span> : null}
        {acciones ? <div className="ml-auto">{acciones}</div> : null}
      </footer>
    </Card>
  )
}
