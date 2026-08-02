'use client'

// /buzon/bitacora — log append-only (ISO 27001 5.33), filtrable por buzón y
// rango de fecha, exportable. Espejo de buzon_bitacora: nunca se edita ni se
// borra desde la UI, solo se lee y se filtra.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, ScrollText } from 'lucide-react'
import { Button, EmptyState, SectionHeader, Table, TBody, TCell, TH, THead, TRow } from '@/shared/components/ui'
import { fmtFecha, fmtHora } from '@/shared/lib/format'
import { useBuzonStore } from './store'

/** Duplicado deliberado de pre-discovery/export.ts::descargarArchivo (no acoplar features). */
function descargarJSON(nombre: string, contenido: unknown): void {
  const blob = new Blob([JSON.stringify(contenido, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

export function BitacoraBuzon() {
  const bitacora = useBuzonStore((s) => s.bitacora)
  const buzones = useBuzonStore((s) => s.buzones)
  const [buzonId, setBuzonId] = useState('todos')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const filtrados = useMemo(() => {
    return bitacora.filter((e) => {
      if (buzonId !== 'todos' && e.buzonId !== buzonId) return false
      const dia = e.ocurridoEn.slice(0, 10)
      if (desde && dia < desde) return false
      if (hasta && dia > hasta) return false
      return true
    })
  }, [bitacora, buzonId, desde, hasta])

  const direccionDe = (id: string | null) => (id ? (buzones.find((b) => b.id === id)?.direccion ?? id) : '—')

  return (
    <div data-testid="bitacora-buzon">
      <SectionHeader
        titulo="Bitácora"
        descripcion="Registro append-only de todo lo que pasa en el buzón (ISO 27001 5.33): quién decidió qué, y cuándo."
        acciones={
          <Button
            tamano="sm"
            onClick={() => descargarJSON(`buzon-bitacora-${new Date().toISOString().slice(0, 10)}.json`, filtrados)}
            data-testid="exportar-bitacora"
          >
            <Download className="mr-1 inline h-3.5 w-3.5" /> Exportar ({filtrados.length})
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-[12px] font-medium text-ink-secondary">
          Buzón
          <select value={buzonId} onChange={(e) => setBuzonId(e.target.value)} className="input mt-1 block text-[13px]" data-testid="filtro-bitacora-buzon">
            <option value="todos">Todos</option>
            {buzones.map((b) => (
              <option key={b.id} value={b.id}>{b.direccion}</option>
            ))}
          </select>
        </label>
        <label className="text-[12px] font-medium text-ink-secondary">
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="input mt-1 block text-[13px]" data-testid="filtro-bitacora-desde" />
        </label>
        <label className="text-[12px] font-medium text-ink-secondary">
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="input mt-1 block text-[13px]" data-testid="filtro-bitacora-hasta" />
        </label>
        {(buzonId !== 'todos' || desde || hasta) && (
          <Button
            variante="ghost"
            tamano="sm"
            onClick={() => {
              setBuzonId('todos')
              setDesde('')
              setHasta('')
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icono={ScrollText} titulo="Sin eventos en este filtro" descripcion="Ajusta el rango de fecha o el buzón." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <Table>
            <THead>
              <TH>Ocurrido</TH>
              <TH>Actor</TH>
              <TH>Evento</TH>
              <TH>Buzón</TH>
              <TH>Hilo</TH>
              <TH>Detalle</TH>
            </THead>
            <TBody>
              {[...filtrados].reverse().map((e) => (
                <TRow key={e.id} data-testid="fila-bitacora">
                  <TCell className="whitespace-nowrap text-ink-secondary">{fmtFecha(e.ocurridoEn)} {fmtHora(e.ocurridoEn)}</TCell>
                  <TCell className="font-mono text-[12px]">{e.actor}</TCell>
                  <TCell>{e.evento}</TCell>
                  <TCell className="text-ink-secondary">{direccionDe(e.buzonId)}</TCell>
                  <TCell className="text-ink-secondary">
                    {e.hiloId ? <Link href={`/buzon/${e.hiloId}`} className="hover:underline">{e.hiloId}</Link> : '—'}
                  </TCell>
                  <TCell className="max-w-xs truncate text-[11px] text-ink-muted" title={JSON.stringify(e.detalle)}>
                    {Object.entries(e.detalle).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}
                  </TCell>
                </TRow>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  )
}
