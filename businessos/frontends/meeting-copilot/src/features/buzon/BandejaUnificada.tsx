'use client'

// Bandeja unificada (/buzon, SPEC §6.1): un renglón por HILO (no por correo),
// con tabs por buzón (patrón TableroCitas: filtro en la URL, PillToggle
// suelto). El contador de pendientes es un Stat derivado del store — nunca
// una copia paralela.

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Inbox, ShieldAlert } from 'lucide-react'
import { Chip, EmptyState, PillToggle, SectionHeader, Stat, Table, TBody, TCell, TH, THead, TRow } from '@/shared/components/ui'
import { fmtFecha, fmtHora } from '@/shared/lib/format'
import { ETIQUETA_ESTADO_HILO } from './types'
import type { EstadoHilo } from './types'
import { resumenHilos } from './hilos'
import { useBuzonStore } from './store'

const TONO_ESTADO_HILO: Record<EstadoHilo, 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'> = {
  submitted: 'neutral',
  working: 'info',
  input_required: 'warning',
  completed: 'success',
}

export function BandejaUnificada() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const buzones = useBuzonStore((s) => s.buzones)
  const entrantes = useBuzonStore((s) => s.entrantes)
  const salientes = useBuzonStore((s) => s.salientes)

  const filtroId = searchParams.get('buzon') ?? 'todos'
  const buzonActivo = buzones.find((b) => b.id === filtroId) ?? null

  const { entrantesFiltrados, salientesFiltrados } = useMemo(() => {
    if (!buzonActivo) return { entrantesFiltrados: entrantes, salientesFiltrados: salientes }
    return {
      entrantesFiltrados: entrantes.filter((e) => e.buzonId === buzonActivo.id),
      salientesFiltrados: salientes.filter((s) => s.buzonId === buzonActivo.id),
    }
  }, [entrantes, salientes, buzonActivo])

  const hilos = useMemo(() => resumenHilos(entrantesFiltrados, salientesFiltrados), [entrantesFiltrados, salientesFiltrados])
  const pendientesTotal = useMemo(() => salientes.filter((s) => s.estado === 'pendiente_aprobacion').length, [salientes])
  const pendientesFiltro = hilos.reduce((acc, h) => acc + h.pendientes, 0)

  const direccionDe = (buzonId: string) => buzones.find((b) => b.id === buzonId)?.direccion ?? buzonId

  return (
    <div data-testid="bandeja-buzon">
      <SectionHeader
        titulo="Buzón"
        descripcion="Correo institucional operado por agentes: cada hilo muestra su estado del ciclo A2A y cuántos borradores esperan tu firma."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat etiqueta="Hilos" valor={String(hilos.length)} />
        <Stat etiqueta="Por aprobar (buzón)" valor={String(pendientesFiltro)} tono={pendientesFiltro > 0 ? 'warning' : 'neutral'} detalle="en este filtro" />
        <Stat etiqueta="Por aprobar (total)" valor={String(pendientesTotal)} tono={pendientesTotal > 0 ? 'warning' : 'neutral'} detalle="todos los buzones" />
        <Stat etiqueta="Buzones activos" valor={String(buzones.filter((b) => b.activo).length)} detalle={`de ${buzones.length}`} />
      </div>

      <PillToggle
        variante="suelto"
        opciones={[
          { id: 'todos', contenido: 'Todos', testid: 'filtro-buzon-todos' },
          ...buzones.map((b) => ({ id: b.id, contenido: b.direccion, testid: `filtro-buzon-${b.id}` })),
        ]}
        valor={filtroId}
        onCambio={(id) => router.replace(id === 'todos' ? pathname : `${pathname}?buzon=${id}`, { scroll: false })}
        etiqueta="Filtrar por buzón"
        claseBoton="px-2.5 py-1 text-[12px]"
        className="mb-4"
      />

      {hilos.length === 0 ? (
        <EmptyState icono={Inbox} titulo="Sin hilos en este buzón" descripcion="Cuando llegue correo a este buzón, sus hilos aparecerán aquí." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <Table>
            <THead>
              <TH>Estado</TH>
              <TH>Buzón</TH>
              <TH>Remitente</TH>
              <TH>Asunto</TH>
              <TH>Último movimiento</TH>
              <TH className="text-right">Pendientes</TH>
            </THead>
            <TBody>
              {hilos.map((h) => (
                <TRow key={h.hiloId} data-testid="fila-hilo" data-hilo={h.hiloId}>
                  <TCell>
                    <Chip tono={TONO_ESTADO_HILO[h.estado]}>{ETIQUETA_ESTADO_HILO[h.estado]}</Chip>
                    {h.intentoInyeccion ? (
                      <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] text-danger" title="Intento de inyección reportado en este hilo">
                        <ShieldAlert className="h-3 w-3" /> reportado
                      </span>
                    ) : null}
                  </TCell>
                  <TCell className="text-ink-secondary">{direccionDe(h.buzonId)}</TCell>
                  <TCell>{h.remitente}</TCell>
                  <TCell>
                    <Link href={`/buzon/${h.hiloId}`} className="font-medium text-ink hover:underline" data-testid="link-hilo">
                      {h.asunto}
                    </Link>
                  </TCell>
                  <TCell className="text-ink-secondary">
                    {h.ultimoMovimiento ? `${fmtFecha(h.ultimoMovimiento)} · ${fmtHora(h.ultimoMovimiento)}` : '—'}
                  </TCell>
                  <TCell className="text-right">
                    {h.pendientes > 0 ? <Chip tono="warning">{h.pendientes} por aprobar</Chip> : <span className="text-ink-muted">—</span>}
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
