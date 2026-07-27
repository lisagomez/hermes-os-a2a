'use client'

import Link from 'next/link'
import { Plus, Radar } from 'lucide-react'
import { usePreDiscoveryStore } from './store'
import { useAppStore } from '@/features/domain/store'
import { useActivosStore, costoAcumulado } from '@/features/activos/store'
import { ORDEN_BLOQUES, ETIQUETA_BLOQUE } from './types'
import { Card, Chip, EmptyState, SectionHeader, Stat, Table, TBody, TCell, TH, THead, TRow } from '@/shared/components/ui'
import { fmtFecha } from '@/shared/lib/format'

const TONO_ESTADO = { borrador: 'neutral', analizando: 'info', parcial: 'warning', listo: 'success', error: 'danger' } as const

export function CasosList() {
  const casos = usePreDiscoveryStore((s) => s.casos)
  const leads = useAppStore((s) => s.leads)
  const activos = useActivosStore((s) => s.activos)
  const ledger = useActivosStore((s) => s.ledger)

  const costoTotal = activos
    .filter((a) => a.clase === 'pre_discovery')
    .reduce((acc, a) => acc + costoAcumulado(ledger, a.id), 0)
  const leadsSinCaso = leads.filter((l) => !casos.some((c) => c.leadId === l.leadId))

  const nuevoBtn = (
    <Link href="/pre-discovery/nuevo" className="btn-primary" data-testid="nuevo-caso">
      <Plus className="h-3.5 w-3.5" /> Nuevo caso
    </Link>
  )

  return (
    <div className="space-y-5">
      <SectionHeader
        titulo="Pre-Discovery"
        descripcion="Inteligencia previa a la entrevista: perfil, benchmark, FODA, marcos regulatorio/tecnológico y el brief del asesor — todo trazable como Activo Digital."
        acciones={nuevoBtn}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat etiqueta="Casos" valor={String(casos.length)} />
        <Stat etiqueta="Listos para entrevista" valor={String(casos.filter((c) => c.estado === 'listo').length)} tono="success" />
        <Stat etiqueta="Costo de análisis (USD)" valor={`$${costoTotal.toFixed(4)}`} detalle="suma del ledger, fuente declarada" />
        <Stat etiqueta="Leads sin caso" valor={String(leadsSinCaso.length)} tono={leadsSinCaso.length > 0 ? 'warning' : 'success'} />
      </div>

      {casos.length === 0 ? (
        <EmptyState
          icono={Radar}
          titulo="Sin casos de Pre-Discovery"
          descripcion="Crea el primer caso desde un lead captado: el análisis produce el brief con el que el asesor llega preparado a la entrevista."
          accion={nuevoBtn}
        />
      ) : (
        <Card>
          <Table data-testid="tabla-casos">
            <THead>
              <TRow>
                <TH>Lead</TH>
                <TH className="hidden md:table-cell">Bloques</TH>
                <TH>Estado</TH>
                <TH>Costo</TH>
                <TH className="hidden sm:table-cell">Activo</TH>
              </TRow>
            </THead>
            <TBody>
              {casos.map((c) => {
                const lead = leads.find((l) => l.leadId === c.leadId)
                const activo = activos.find((a) => a.id === c.activoId)
                const listos = ORDEN_BLOQUES.filter((b) => ['listo', 'no_concluyente'].includes(c.bloques[b].estado)).length
                return (
                  <TRow key={c.id} className="hover:bg-surface-muted">
                    <TCell>
                      <Link href={`/pre-discovery/${c.id}`} className="font-medium text-ink hover:text-accent" data-testid="link-caso">
                        {lead?.empresa ?? c.leadId}
                      </Link>
                      <p className="text-[11px] text-ink-muted">
                        {lead?.contacto} · {c.intake.giro} · {fmtFecha(c.creadoAt)}
                      </p>
                    </TCell>
                    <TCell className="hidden md:table-cell">
                      <span className="text-[12px] text-ink-secondary" title={ORDEN_BLOQUES.map((b) => `${ETIQUETA_BLOQUE[b]}: ${c.bloques[b].estado}`).join('\n')}>
                        {listos}/{ORDEN_BLOQUES.length} bloques
                      </span>
                    </TCell>
                    <TCell><Chip tono={TONO_ESTADO[c.estado]}>{c.estado}</Chip></TCell>
                    <TCell className="text-ink-secondary">{activo ? `$${costoAcumulado(ledger, activo.id).toFixed(4)}` : '—'}</TCell>
                    <TCell className="hidden sm:table-cell">{activo ? <Chip>{activo.folio}</Chip> : <span className="text-ink-muted">—</span>}</TCell>
                  </TRow>
                )
              })}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
