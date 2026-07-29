'use client'

// M4 — Tablero de seguimiento (pipeline HubSpot + tabla Acuity): cada renglón
// es un cliente con su cita; el filtro vive en la URL (?estado=) y las
// acciones son ESPEJO de la máquina de estados. El botón Llamar hace handoff
// tel:/wa.me y registra el evento en el historial.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CalendarX2, Phone } from 'lucide-react'
import { Button, Callout, Chip, Dialog, EmptyState, PillToggle, SectionHeader, Stat, Table, TBody, TCell, TH, THead, TRow } from '@/shared/components/ui'
import { fmtFecha } from '@/shared/lib/format'
import type { Cita, EstadoCita } from './types'
import { ETIQUETA_DEPTH, ETIQUETA_ESTADO_CITA, ETIQUETA_TIPO_ASESOR } from './types'
import { fmtHoraEnTz } from './slots'
import { construirHandoffLlamada } from './llamada'
import { FILTROS_TABLERO, accionesDisponibles, metricasCitas } from './metricas'
import { useAgendaStore } from './store'

const TONO_ESTADO: Record<EstadoCita, 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'> = {
  solicitada: 'warning',
  aprobada: 'info',
  rechazada: 'neutral',
  confirmada: 'success',
  en_curso: 'accent',
  completada: 'neutral',
  cancelada: 'danger',
  no_show: 'danger',
}

export function ChipEstadoCita({ estado }: { estado: EstadoCita }) {
  return (
    <Chip tono={TONO_ESTADO[estado]}>
      <span data-testid="chip-estado-cita" data-estado={estado}>
        {ETIQUETA_ESTADO_CITA[estado]}
      </span>
    </Chip>
  )
}

function DialogLlamar({ cita, onCerrar }: { cita: Cita; onCerrar: () => void }) {
  const transicionar = useAgendaStore((s) => s.transicionar)
  const handoff = construirHandoffLlamada(cita.cliente.telefono)

  const registrar = (via: string) => {
    transicionar(cita.id, 'llamada_iniciada', 'asesor', new Date().toISOString(), { detalle: `${via} desde tablero` })
  }

  return (
    <Dialog abierto onCerrar={onCerrar} etiqueta={`Llamar a ${cita.cliente.nombre}`} data-testid="dialog-llamar">
      <div className="space-y-3 p-5">
        <h3 className="text-[14px] font-semibold text-ink">Llamar a {cita.cliente.nombre}</h3>
        {handoff ? (
          <>
            <p className="text-[13px] text-ink-secondary">
              Teléfono: <span className="font-medium text-ink">+{cita.cliente.telefono.replace(/^\+/, '')}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <a href={handoff.tel} onClick={() => registrar('tel:')} data-testid="llamar-tel">
                <Button variante="primary" tamano="sm">
                  <Phone className="mr-1 inline h-3.5 w-3.5" /> Llamar desde este dispositivo
                </Button>
              </a>
              <a href={handoff.whatsapp} target="_blank" rel="noreferrer" onClick={() => registrar('wa.me')} data-testid="llamar-whatsapp">
                <Button tamano="sm">Abrir WhatsApp</Button>
              </a>
            </div>
          </>
        ) : (
          <Callout tono="warning" variante="inline">
            <p className="text-[12px]">El teléfono registrado no es utilizable ({cita.cliente.telefono || 'vacío'}). Corrige el dato del cliente.</p>
          </Callout>
        )}
        <Callout tono="info" variante="inline">
          <p className="text-[12px]">La herramienta de llamadas integrada está en camino (seam declarado: /llamadas?cita=…). Cada llamada queda registrada en el historial de la cita.</p>
        </Callout>
      </div>
    </Dialog>
  )
}

export function TableroCitas() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const citas = useAgendaStore((s) => s.citas)
  // asesoresTodos: las citas históricas de un asesor borrado conservan su nombre.
  const asesores = useAgendaStore((s) => s.asesoresTodos)
  const servicios = useAgendaStore((s) => s.servicios)
  const transicionar = useAgendaStore((s) => s.transicionar)
  const [llamando, setLlamando] = useState<Cita | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ahora = useMemo(() => new Date().toISOString(), [])
  const m = useMemo(() => metricasCitas(citas, ahora), [citas, ahora])

  const filtroId = searchParams.get('estado') ?? 'todas'
  const filtro = FILTROS_TABLERO.find((f) => f.id === filtroId) ?? FILTROS_TABLERO[0]

  const visibles = useMemo(() => {
    const lista = filtro.estados === null ? citas : citas.filter((c) => filtro.estados!.includes(c.estado))
    return [...lista].sort((a, b) => b.inicio.localeCompare(a.inicio))
  }, [citas, filtro])

  const asesorDe = (id: string) => asesores.find((a) => a.id === id)
  const servicioDe = (id: string | null) => (id ? servicios.find((s) => s.id === id) : null)

  return (
    <div data-testid="tablero-citas">
      <SectionHeader
        titulo="Citas"
        descripcion="Seguimiento de clientes: estado de la programación y acción de llamada por renglón."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat etiqueta="Hoy" valor={String(m.hoy)} />
        <Stat etiqueta="Por aprobar" valor={String(m.pendientes)} tono="warning" detalle="en bandeja" />
        <Stat etiqueta="Confirmadas" valor={String(m.confirmadas)} tono="success" />
        <Stat etiqueta="No show (mes)" valor={String(m.noShowMes)} tono="danger" />
        <Stat etiqueta="Aprobación media" valor={m.tiempoMedioAprobacionMin === null ? '—' : `${m.tiempoMedioAprobacionMin} min`} detalle="solicitada → aprobada" />
      </div>

      <PillToggle
        variante="suelto"
        opciones={FILTROS_TABLERO.map((f) => ({ id: f.id, contenido: f.etiqueta, testid: `filtro-citas-${f.id}` }))}
        valor={filtro.id}
        onCambio={(id) => router.replace(id === 'todas' ? pathname : `${pathname}?estado=${id}`, { scroll: false })}
        etiqueta="Filtrar citas por estado"
        claseBoton="px-2.5 py-1 text-[12px]"
        className="mb-4"
      />

      {error ? (
        <Callout tono="danger" variante="inline" className="mb-3">
          <p className="text-[12px]">{error}</p>
        </Callout>
      ) : null}

      {visibles.length === 0 ? (
        <EmptyState
          icono={CalendarX2}
          titulo="Sin citas en este estado"
          descripcion="Cambia el filtro o espera nuevas solicitudes desde la página de reserva."
        />
      ) : (
        <div className="card overflow-x-auto p-0">
          <Table>
            <THead>
              <TH>Cliente</TH>
              <TH>Asesor</TH>
              <TH>Fecha / hora</TH>
              <TH>Servicio</TH>
              <TH>Prof.</TH>
              <TH>Estado</TH>
              <TH className="text-right">Acciones</TH>
            </THead>
            <TBody>
              {visibles.map((c) => {
                const asesor = asesorDe(c.asesorId)
                const servicio = servicioDe(c.servicioId)
                return (
                  <TRow key={c.id} data-testid="fila-cita" data-cita={c.id}>
                    <TCell>
                      <p className="font-medium text-ink">{c.cliente.nombre}</p>
                      <p className="text-[11px] text-ink-muted">{c.cliente.email}</p>
                    </TCell>
                    <TCell>
                      <span className="inline-flex items-center gap-1.5">
                        {asesor?.nombre ?? c.asesorId}
                        {asesor ? <Chip tono={asesor.tipo === 'ia' ? 'info' : 'neutral'}>{ETIQUETA_TIPO_ASESOR[asesor.tipo]}</Chip> : null}
                      </span>
                    </TCell>
                    <TCell>
                      <p>{fmtFecha(c.inicio)}</p>
                      <p className="text-[11px] text-ink-muted">
                        {asesor ? `${fmtHoraEnTz(c.inicio, asesor.zonaHoraria)} (${asesor.zonaHoraria.split('/').pop()?.replace(/_/g, ' ')})` : ''}
                      </p>
                    </TCell>
                    <TCell className="text-ink-secondary">{servicio?.nombre ?? '—'}</TCell>
                    <TCell>
                      <div className="flex flex-col items-start gap-1">
                        <Chip tono={c.sessionDepth === 'discovery' ? 'accent' : 'neutral'}>{ETIQUETA_DEPTH[c.sessionDepth]}</Chip>
                        {c.pagoEstado === 'pendiente' ? <Chip tono="warning">Pago pendiente</Chip> : null}
                      </div>
                    </TCell>
                    <TCell>
                      <ChipEstadoCita estado={c.estado} />
                    </TCell>
                    <TCell>
                      <div className="flex items-center justify-end gap-1.5">
                        {c.estado === 'solicitada' ? (
                          <Link href={`/asesores/${c.asesorId}/agenda`} title="Decidir en la bandeja del asesor">
                            <Button variante="ghost" tamano="sm">Bandeja</Button>
                          </Link>
                        ) : (
                          accionesDisponibles(c.estado).map(({ evento, etiqueta }) => (
                            <Button
                              key={evento}
                              variante="ghost"
                              tamano="sm"
                              data-testid={`accion-${evento}`}
                              onClick={() => {
                                const r = transicionar(c.id, evento, 'asesor', new Date().toISOString())
                                setError(r.ok ? null : r.motivo)
                              }}
                            >
                              {etiqueta}
                            </Button>
                          ))
                        )}
                        <Button tamano="sm" onClick={() => setLlamando(c)} data-testid="boton-llamar" title="Llamar al cliente">
                          <Phone className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TCell>
                  </TRow>
                )
              })}
            </TBody>
          </Table>
        </div>
      )}

      {llamando ? <DialogLlamar cita={llamando} onCerrar={() => setLlamando(null)} /> : null}
    </div>
  )
}
