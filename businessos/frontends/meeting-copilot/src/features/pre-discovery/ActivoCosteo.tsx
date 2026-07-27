'use client'

// Ficha del Activo Digital del caso (espejo ACT) + costeo EJECUTIVO:
// desglose por componente con fuente declarada — lectura de operación, no
// ledger crudo escondido (el ledger completo está expandible).

import { useState } from 'react'
import { FileJson, Package } from 'lucide-react'
import type { ActivoDigitalLocal, CostoEntrada } from '@/features/activos/types'
import type { CasoPreDiscovery } from './types'
import { construirExportActivo, descargarArchivo } from './export'
import { useAdminPreDiscovery } from './admin-store'
import { Button, Card, Chip, EmptyState, Stat, Table, TBody, TCell, TH, THead, TRow } from '@/shared/components/ui'

export function ActivoCosteo({
  caso,
  activo,
  ledger,
  total,
}: {
  caso: CasoPreDiscovery
  activo: ActivoDigitalLocal | null
  ledger: CostoEntrada[]
  total: number
}) {
  const [verLedger, setVerLedger] = useState(false)

  if (!activo) {
    return (
      <EmptyState
        icono={Package}
        titulo="El activo se registra al correr el análisis"
        descripcion="Cuando el pipeline corre, el caso queda catalogado como Activo Digital (espejo del módulo ACT del ERP) con su versión, su hash y su ledger de costo."
      />
    )
  }

  const porComponente = ['tokens', 'fetch', 'infraestructura'].map((componente) => ({
    componente,
    monto: ledger.filter((c) => c.componente === componente).reduce((a, c) => a + c.montoUsd, 0),
    entradas: ledger.filter((c) => c.componente === componente).length,
  }))
  const tokensTotales = ledger.reduce((a, c) => a + (c.tokensIn ?? 0) + (c.tokensOut ?? 0), 0)
  const esMock = ledger.length > 0 && ledger.every((c) => c.fuente.startsWith('estimado_mock'))

  return (
    <div className="space-y-4" data-testid="activo-costeo">
      <Card className="p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-ink">Activo Digital</h2>
          <Chip tono="accent">{activo.folio}</Chip>
          <Chip>{activo.clase}</Chip>
          <Chip>estatus: {activo.estatus}</Chip>
          <Chip tono="warning">defensibilidad: {activo.defensibilidad} ({activo.estadoDefensibilidad})</Chip>
        </div>
        <p className="text-[12px] text-ink-secondary">
          Espejo local del módulo ACT del ERP: clasificación declarada en origen (eje {activo.ejeDei}), versiones
          append-only y costo sumado del ledger. El ciclo real DETECTAR→CATALOGAR→REGISTRAR ocurre en el ERP vía el
          host-job de cosecha (ratificar defensibilidad y capitalizar son decisiones humanas, fuera de esta app).
        </p>
        <ul className="mt-2 space-y-1 text-[12px]">
          <li className="flex items-center justify-between rounded-s bg-surface-muted px-3 py-1.5">
            <span className="text-ink">Ubicación</span>
            <code className="text-[11px] text-ink-secondary">{activo.ubicacion}</code>
          </li>
          <li className="flex items-center justify-between rounded-s bg-surface-muted px-3 py-1.5">
            <span className="text-ink">Versión vigente</span>
            <span className="text-ink-secondary">
              {activo.versiones.at(-1)?.version} · hash <code className="text-[11px]">{activo.versiones.at(-1)?.hash.slice(0, 12)}…</code>
            </span>
          </li>
        </ul>
        <div className="mt-3">
          <h3 className="mb-1 text-[12px] font-semibold text-ink">Historial de versiones (append-only)</h3>
          <ul className="space-y-1">
            {activo.versiones.map((v) => (
              <li key={v.version} className="flex items-center justify-between rounded-s bg-surface-muted px-3 py-1.5 text-[12px]">
                <span className="font-medium text-ink">{v.version}</span>
                <span className="text-ink-secondary">{v.origen}</span>
                <code className="text-[11px] text-ink-muted">{v.hash.slice(0, 10)}…</code>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-3 border-t border-line-subtle pt-3">
          <Button
            onClick={() => {
              descargarArchivo(`${activo.folio}.json`, JSON.stringify(construirExportActivo(activo, ledger, caso.bloques), null, 2), 'application/json')
              useAdminPreDiscovery.getState().log('exportar_activo', `${activo.folio} → JSON de cosecha`)
            }}
            data-testid="exportar-activo"
          >
            <FileJson className="h-3.5 w-3.5" /> Exportar activo (JSON para cosecha al ERP)
          </Button>
          <p className="mt-1 text-[11px] text-ink-muted">
            El JSON es el contrato de <code>businessos/cosechar-prediscovery.py</code> (registra en <code>erp.act_*</code> con roles reales).
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat etiqueta="Costo acumulado" valor={`$${total.toFixed(4)}`} detalle="= SUMA del ledger (jamás a mano)" tono={esMock ? 'warning' : 'success'} />
        <Stat etiqueta="Tokens totales" valor={tokensTotales.toLocaleString()} detalle="autoritativos" />
        <Stat etiqueta="Corridas registradas" valor={String(ledger.length)} />
        <Stat etiqueta="Origen del costo" valor={esMock ? 'mock' : 'real'} detalle={esMock ? 'análisis demo: $0 declarado' : 'usage de OpenRouter + tarifa'} tono={esMock ? 'warning' : 'success'} />
      </div>

      <Card className="p-4">
        <h3 className="mb-2 text-[12px] font-semibold text-ink">Desglose por componente</h3>
        <ul className="space-y-1.5">
          {porComponente.map((c) => (
            <li key={c.componente} className="flex items-center justify-between rounded-s bg-surface-muted px-3 py-2 text-[13px]">
              <span className="text-ink">{c.componente}</span>
              <span className="text-ink-secondary">{c.entradas} entrada(s)</span>
              <span className="font-medium text-ink">${c.monto.toFixed(4)}</span>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setVerLedger(!verLedger)} className="mt-2 text-[12px] font-medium text-accent hover:underline" data-testid="toggle-ledger">
          {verLedger ? 'Ocultar ledger completo' : 'Ver ledger completo (cada entrada con su fuente)'}
        </button>
        {verLedger && (
          <Table className="mt-2" data-testid="ledger-completo">
            <THead>
                <TH>Componente</TH>
                <TH>Tokens (in/out)</TH>
                <TH>Monto</TH>
                <TH>Fuente</TH>
            </THead>
            <TBody>
              {ledger.map((c) => (
                <TRow key={c.id}>
                  <TCell className="text-ink">{c.componente}</TCell>
                  <TCell className="text-ink-secondary">{c.tokensIn ?? '—'} / {c.tokensOut ?? '—'}</TCell>
                  <TCell className="text-ink">${c.montoUsd.toFixed(6)}</TCell>
                  <TCell className="text-[11px] text-ink-muted">{c.fuente}</TCell>
                </TRow>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
