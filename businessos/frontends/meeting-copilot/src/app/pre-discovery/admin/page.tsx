'use client'

// Panel admin del módulo Pre-Discovery — misma plantilla que /configuracion
// (tarjetas de ajuste) + cards estilo Manager. Nada de interfaz técnica aparte.

import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { useAdminPreDiscovery } from '@/features/pre-discovery/admin-store'
import { usePreDiscoveryStore } from '@/features/pre-discovery/store'
import { useActivosStore, costoAcumulado } from '@/features/activos/store'
import { Card, Chip, PillToggle, SectionHeader, Table, TBody, TCell, TH, THead, TRow } from '@/shared/components/ui'
import { FUENTE_DATOS, MOTOR_AGENTE, PROVIDER_STT } from '@/shared/lib/config'

export default function Page() {
  const { tarifas, presupuestoCasoUsd, ejeDeiOrigen, bitacora, setTarifa, setPresupuestoCaso, setEjeDei, log } = useAdminPreDiscovery()
  const casos = usePreDiscoveryStore((s) => s.casos)
  const activos = useActivosStore((s) => s.activos)
  const ledger = useActivosStore((s) => s.ledger)

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <SectionHeader
        titulo="Admin — Pre-Discovery"
        descripcion="Estado del módulo, seams, parámetros de costeo, clasificación en origen, activos generados y auditoría."
        acciones={<Link href="/pre-discovery" className="btn-secondary">← Volver a casos</Link>}
      />

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-ink">Estado del módulo y seams</h2>
        <ul className="space-y-2 text-[13px]">
          <li className="flex items-center justify-between rounded-s bg-surface-muted px-3 py-2">
            <span className="text-ink">Motor de análisis <code className="ml-1 text-[11px] text-ink-muted">NEXT_PUBLIC_AGENT_ENGINE</code></span>
            <Chip tono={MOTOR_AGENTE === 'llm' ? 'success' : 'warning'}>{MOTOR_AGENTE === 'llm' ? 'llm (real con clave)' : 'rules → análisis demo'}</Chip>
          </li>
          <li className="flex items-center justify-between rounded-s bg-surface-muted px-3 py-2">
            <span className="text-ink">Grafo regulatorio <code className="ml-1 text-[11px] text-ink-muted">GRAFO_URL (server)</code></span>
            <Chip tono="info">proxy /api/grafo · sin URL → mock fiel declarado</Chip>
          </li>
          <li className="flex items-center justify-between rounded-s bg-surface-muted px-3 py-2">
            <span className="text-ink">Fuente de datos / STT</span>
            <span className="flex gap-1.5"><Chip>{FUENTE_DATOS}</Chip><Chip>{PROVIDER_STT}</Chip></span>
          </li>
          <li className="flex items-center justify-between rounded-s bg-surface-muted px-3 py-2">
            <span className="text-ink">Fetch del sitio del lead</span>
            <Chip>timeout 8 s · cap 500 KB · UA declarado</Chip>
          </li>
        </ul>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-ink">Parámetros de costeo</h2>
        <p className="text-[12px] text-ink-secondary">
          Tarifas por millón de tokens con FUENTE declarada. Un modelo sin tarifa registra costo <code>no_medido</code> — jamás se inventa.
        </p>
        <Table data-testid="tabla-tarifas">
          <THead>
              <TH>Modelo</TH>
              <TH>USD/MTok in</TH>
              <TH>USD/MTok out</TH>
              <TH className="hidden sm:table-cell">Fuente</TH>
          </THead>
          <TBody>
            {tarifas.map((t) => (
              <TRow key={t.modelo}>
                <TCell className="text-ink">{t.modelo}</TCell>
                <TCell>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={t.usdPorMTokIn}
                    onChange={(e) => {
                      setTarifa({ ...t, usdPorMTokIn: Number(e.target.value), fuente: `${t.fuente.split(' · editada')[0]} · editada en admin` })
                      log('editar_settings', `tarifa in de ${t.modelo}`)
                    }}
                    className="input w-24"
                    aria-label={`Tarifa entrada ${t.modelo}`}
                  />
                </TCell>
                <TCell>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={t.usdPorMTokOut}
                    onChange={(e) => {
                      setTarifa({ ...t, usdPorMTokOut: Number(e.target.value), fuente: `${t.fuente.split(' · editada')[0]} · editada en admin` })
                      log('editar_settings', `tarifa out de ${t.modelo}`)
                    }}
                    className="input w-24"
                    aria-label={`Tarifa salida ${t.modelo}`}
                  />
                </TCell>
                <TCell className="hidden text-[11px] text-ink-muted sm:table-cell">{t.fuente}</TCell>
              </TRow>
            ))}
          </TBody>
        </Table>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[12px] font-medium text-ink-secondary">
            Presupuesto blando por caso (USD)
            <input
              type="number"
              step="0.1"
              min="0"
              value={presupuestoCasoUsd}
              onChange={(e) => {
                setPresupuestoCaso(Number(e.target.value))
                log('editar_settings', `presupuesto por caso → ${e.target.value}`)
              }}
              className="input w-24"
              data-testid="presupuesto-caso"
            />
          </label>
          <span className="text-[11px] text-ink-muted">Aviso al cruzarlo (no corta el análisis).</span>
        </div>
      </Card>

      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-semibold text-ink">Clasificación en origen (módulo ACT)</h2>
        <p className="text-[12px] text-ink-secondary">
          Todo activo del módulo nace con este eje D+I declarado — la clasificación jamás se reconstruye después
          (invariante del ERP). Ratificar defensibilidad y capitalizar son decisiones humanas fuera de la app.
        </p>
        <PillToggle
          etiqueta="Eje D+I de los activos del módulo"
          valor={ejeDeiOrigen}
          onCambio={(v) => {
            setEjeDei(v)
            log('editar_settings', `eje_dei origen → ${v}`)
          }}
          opciones={[
            { id: 'desarrollo', contenido: 'desarrollo', testid: 'eje-desarrollo' },
            { id: 'investigacion', contenido: 'investigación', testid: 'eje-investigacion' },
          ]}
        />
      </Card>

      <Card className="p-4">
        <h2 className="mb-2 text-sm font-semibold text-ink">Activos generados por el módulo</h2>
        {activos.length === 0 ? (
          <p className="text-[12px] text-ink-secondary">Aún no hay activos: corren al analizar un caso o al capturar una entrevista.</p>
        ) : (
          <Table data-testid="tabla-activos-modulo">
            <THead>
                <TH>Folio</TH>
                <TH>Clase</TH>
                <TH>Versión</TH>
                <TH>Costo</TH>
                <TH className="hidden sm:table-cell">Ubicación</TH>
            </THead>
            <TBody>
              {activos.map((a) => (
                <TRow key={a.id}>
                  <TCell className="font-medium text-ink">{a.folio}</TCell>
                  <TCell><Chip>{a.clase}</Chip></TCell>
                  <TCell className="text-ink-secondary">{a.versiones.at(-1)?.version}</TCell>
                  <TCell className="text-ink">${costoAcumulado(ledger, a.id).toFixed(4)}</TCell>
                  <TCell className="hidden sm:table-cell"><code className="text-[11px] text-ink-muted">{a.ubicacion}</code></TCell>
                </TRow>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-info" />
          <h2 className="text-sm font-semibold text-ink">Auditoría (bitácora append-only)</h2>
          <Chip>{bitacora.length}</Chip>
        </div>
        {bitacora.length === 0 ? (
          <p className="text-[12px] text-ink-secondary">Sin acciones registradas todavía: cada análisis, regeneración o cambio de settings deja huella aquí.</p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto" data-testid="bitacora-modulo">
            {bitacora.map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded-s bg-surface-muted px-3 py-1.5 text-[12px]">
                <span className="font-medium text-ink">{b.accion}</span>
                <span className="min-w-0 flex-1 truncate px-2 text-ink-secondary">{b.detalle}</span>
                <span className="text-[11px] text-ink-muted">{new Date(b.at).toLocaleTimeString('es-MX')}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-ink-muted">
          {casos.length} caso(s) en el módulo · entorno {MOTOR_AGENTE === 'llm' ? 'real (con fallback mock declarado)' : 'mock'}.
        </p>
      </Card>
    </div>
  )
}
