'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Chip } from '@/shared/components/ui'
import { actorInfo, ICONO_ACTOR } from './actores'
import { agruparPorEtapa, type LeadResumen, type Movimiento } from './types'

/**
 * Tablero kanban del pipeline: una columna por etapa (embudo + Perdido),
 * tarjetas de lead arrastrables. Soltar en otra columna dispara la server
 * action (RPC auditada con actor de la sesión); mientras revalida, la tarjeta
 * muestra su etapa optimista con un pulso. La MISMA experiencia refleja al
 * agente: la tarjeta lleva la señal del calificador (🤖) y el último actor
 * que la movió — un lead movido por el agente se distingue de uno movido por
 * el equipo sin abrir nada.
 */

function LeadCard({
  lead,
  ultimo,
  pendiente,
}: {
  lead: LeadResumen
  ultimo?: Movimiento
  pendiente: boolean
}) {
  const actor = ultimo ? actorInfo(ultimo.actor) : null
  return (
    <div className={`rounded-s border border-line bg-surface px-2.5 py-2 shadow-sm ${pendiente ? 'animate-pulse-once opacity-70' : ''}`}>
      <p className="truncate text-[12px] font-semibold text-ink">{lead.empresa || 'Sin empresa'}</p>
      <p className="truncate text-[11px] text-ink-muted">{lead.contacto || 'sin contacto'}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <Chip>{lead.origen}</Chip>
        {lead.canal ? <Chip>{lead.canal}</Chip> : null}
        {lead.calificacion === 'califica' ? <Chip tono="success">🤖 califica</Chip> : null}
        {lead.calificacion === 'no_califica' ? <Chip tono="danger">🤖 no califica</Chip> : null}
        {lead.calificacion === 'indeterminado' ? <Chip tono="warning">🤖 a revisión</Chip> : null}
      </div>
      {actor ? (
        <p className="mt-1.5 truncate text-[10px] text-ink-muted" title={ultimo?.motivo || undefined}>
          {ICONO_ACTOR[actor.tipo]} {actor.nombre}
          {ultimo?.de_etapa ? ` · ${ultimo.de_etapa} → ${ultimo.a_etapa}` : ''}
        </p>
      ) : null}
    </div>
  )
}

function CardArrastrable(props: { lead: LeadResumen; ultimo?: Movimiento; pendiente: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: props.lead.lead_id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab touch-none active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}
      data-testid={`tablero-lead-${props.lead.lead_id}`}
    >
      <LeadCard {...props} />
    </div>
  )
}

function Columna({
  etapa,
  leads,
  ultimoPorLead,
  pendientes,
}: {
  etapa: string
  leads: LeadResumen[]
  ultimoPorLead: Map<string, Movimiento>
  pendientes: Set<string>
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa })
  const esSalida = etapa === 'perdido'
  return (
    <div
      ref={setNodeRef}
      data-testid={`tablero-col-${etapa}`}
      className={`flex w-48 shrink-0 flex-col rounded-m border p-2 transition-colors ${
        isOver ? 'border-accent bg-accent-muted' : esSalida ? 'border-danger/40 bg-surface-muted' : 'border-line bg-surface-muted'
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${esSalida ? 'text-danger' : 'text-ink-secondary'}`}>
          {etapa.replace(/_/g, ' ')}
        </span>
        <span className="text-[11px] font-semibold tabular-nums text-ink-muted">{leads.length}</span>
      </div>
      <div className="flex min-h-16 flex-col gap-1.5">
        {leads.map((l) => (
          <CardArrastrable key={l.lead_id} lead={l} ultimo={ultimoPorLead.get(l.lead_id)} pendiente={pendientes.has(l.lead_id)} />
        ))}
      </div>
    </div>
  )
}

export function TableroLeads({
  leads,
  movimientos,
  accionMover,
}: {
  leads: LeadResumen[]
  movimientos: Movimiento[]
  accionMover: (formData: FormData) => Promise<void>
}) {
  // Estado optimista: leadId → etapa a la que se soltó, hasta que el server
  // revalide y las props traigan la verdad de la BD.
  const [optimista, setOptimista] = useState<Record<string, string>>({})
  const [arrastrando, setArrastrando] = useState<LeadResumen | null>(null)
  const [, startTransition] = useTransition()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const efectivos = useMemo(
    () => leads.map((l) => (optimista[l.lead_id] && optimista[l.lead_id] !== l.etapa ? { ...l, etapa: optimista[l.lead_id] } : l)),
    [leads, optimista]
  )
  const columnas = useMemo(() => agruparPorEtapa(efectivos), [efectivos])
  const ultimoPorLead = useMemo(() => {
    const m = new Map<string, Movimiento>()
    // movimientos llega DESC: el primero por lead es el último movimiento real.
    for (const mov of movimientos) if (!m.has(mov.lead_id)) m.set(mov.lead_id, mov)
    return m
  }, [movimientos])
  const pendientes = useMemo(
    () => new Set(leads.filter((l) => optimista[l.lead_id] && optimista[l.lead_id] !== l.etapa).map((l) => l.lead_id)),
    [leads, optimista]
  )

  const onDragStart = (e: DragStartEvent) => {
    setArrastrando(efectivos.find((l) => l.lead_id === e.active.id) ?? null)
  }
  const onDragEnd = (e: DragEndEvent) => {
    setArrastrando(null)
    const leadId = String(e.active.id)
    const destino = e.over ? String(e.over.id) : null
    const lead = leads.find((l) => l.lead_id === leadId)
    if (!destino || !lead || destino === lead.etapa) return
    setOptimista((o) => ({ ...o, [leadId]: destino }))
    const fd = new FormData()
    fd.set('lead_id', leadId)
    fd.set('etapa', destino)
    fd.set('motivo', 'tablero (drag & drop)')
    startTransition(async () => {
      try {
        await accionMover(fd)
      } catch (err) {
        // Fallo VISIBLE: se revierte la tarjeta y queda rastro en consola.
        console.error('[crm] mover falló:', err)
      } finally {
        setOptimista((o) => {
          const resto = { ...o }
          delete resto[leadId]
          return resto
        })
      }
    })
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-2 overflow-x-auto pb-2" data-testid="tablero-leads">
        {columnas.map((c) => (
          <Columna key={c.etapa} etapa={c.etapa} leads={c.leads} ultimoPorLead={ultimoPorLead} pendientes={pendientes} />
        ))}
      </div>
      <DragOverlay>
        {arrastrando ? (
          <div className="w-44 rotate-2">
            <LeadCard lead={arrastrando} ultimo={ultimoPorLead.get(arrastrando.lead_id)} pendiente={false} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
