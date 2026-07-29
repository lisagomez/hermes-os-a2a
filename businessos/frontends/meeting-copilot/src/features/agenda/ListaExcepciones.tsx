'use client'

// Excepciones de agenda (bloqueos puntuales y vacaciones) — patrón Acuity.

import { useMemo, useState } from 'react'
import { CalendarOff } from 'lucide-react'
import { Button, Card, Chip, Dialog, PillToggle, Table, TBody, TCell, TH, THead, TRow } from '@/shared/components/ui'
import { fmtFecha, nuevoId } from '@/shared/lib/format'
import type { Asesor, Excepcion } from './types'
import { useAgendaStore } from './store'

export function ListaExcepciones({ asesor }: { asesor: Asesor }) {
  // El filtro NO va en el selector (array nuevo por render = bucle) — regla activos/store.
  const todas = useAgendaStore((s) => s.excepciones)
  const excepciones = useMemo(() => todas.filter((e) => e.asesorId === asesor.id), [todas, asesor.id])
  const agregarExcepcion = useAgendaStore((s) => s.agregarExcepcion)
  const quitarExcepcion = useAgendaStore((s) => s.quitarExcepcion)

  const [abierto, setAbierto] = useState(false)
  const [tipo, setTipo] = useState<Excepcion['tipo']>('bloqueo')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [motivo, setMotivo] = useState('')
  const valida = desde !== '' && hasta !== '' && desde <= hasta

  const guardar = () => {
    agregarExcepcion({
      id: nuevoId('exc'),
      asesorId: asesor.id,
      tipo,
      desde: `${desde}T00:00:00.000Z`,
      hasta: `${hasta}T23:59:59.000Z`,
      motivo: motivo.trim(),
    })
    setAbierto(false)
    setDesde('')
    setHasta('')
    setMotivo('')
  }

  return (
    <Card className="p-4" data-testid="lista-excepciones">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-semibold text-ink">Excepciones</h2>
          <p className="text-[12px] text-ink-secondary">Días bloqueados y vacaciones: sus slots dejan de ofrecerse.</p>
        </div>
        <Button tamano="sm" data-testid="nueva-excepcion" onClick={() => setAbierto(true)}>
          Nueva excepción
        </Button>
      </div>

      {excepciones.length === 0 ? (
        <div className="flex items-center gap-2 py-3 text-[12px] text-ink-muted">
          <CalendarOff className="h-4 w-4" /> Sin excepciones registradas.
        </div>
      ) : (
        <Table>
          <THead>
            <TH>Desde</TH>
            <TH>Hasta</TH>
            <TH>Tipo</TH>
            <TH>Motivo</TH>
            <TH className="text-right">Acción</TH>
          </THead>
          <TBody>
            {excepciones.map((e) => (
              <TRow key={e.id}>
                <TCell>{fmtFecha(e.desde)}</TCell>
                <TCell>{fmtFecha(e.hasta)}</TCell>
                <TCell>
                  <Chip tono={e.tipo === 'vacaciones' ? 'info' : 'warning'}>{e.tipo}</Chip>
                </TCell>
                <TCell className="text-ink-secondary">{e.motivo || '—'}</TCell>
                <TCell className="text-right">
                  <Button variante="ghost" tamano="sm" onClick={() => quitarExcepcion(e.id)}>
                    Quitar
                  </Button>
                </TCell>
              </TRow>
            ))}
          </TBody>
        </Table>
      )}

      <Dialog abierto={abierto} onCerrar={() => setAbierto(false)} etiqueta="Nueva excepción" data-testid="dialog-excepcion">
        <div className="space-y-3 p-5">
          <h3 className="text-[14px] font-semibold text-ink">Nueva excepción</h3>
          <PillToggle
            opciones={[
              { id: 'bloqueo', contenido: 'Bloqueo' },
              { id: 'vacaciones', contenido: 'Vacaciones' },
            ]}
            valor={tipo}
            onCambio={(v) => setTipo(v as Excepcion['tipo'])}
            etiqueta="Tipo de excepción"
            claseBoton="px-3 py-1 text-[12px]"
          />
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="input w-40" aria-label="Desde" />
            <span className="text-[12px] text-ink-muted">a</span>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="input w-40" aria-label="Hasta" />
          </div>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (opcional)" className="input" aria-label="Motivo" />
          <div className="flex justify-end gap-2 pt-1">
            <Button tamano="sm" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button variante="primary" tamano="sm" disabled={!valida} onClick={guardar} data-testid="guardar-excepcion">
              Guardar
            </Button>
          </div>
        </div>
      </Dialog>
    </Card>
  )
}
