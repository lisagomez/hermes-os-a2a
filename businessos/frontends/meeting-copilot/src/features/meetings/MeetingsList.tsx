'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CalendarDays, Plus } from 'lucide-react'
import { useAppStore } from '@/features/domain/store'
import { analizarReunion } from '@/features/insights/engine'
import { playbookPorTipo } from '@/features/playbooks/defaults'
import { ETIQUETA_ESTADO_REUNION, ETIQUETA_TIPO_REUNION } from '@/features/domain/types'
import { Card, Chip, EmptyState, ScoreChip, SectionHeader, Table, TBody, TCell, TH, THead, TRow } from '@/shared/components/ui'
import { fmtDuracion, fmtFecha } from '@/shared/lib/format'

const VISTAS: Record<string, { titulo: string; descripcion: string }> = {
  reuniones: { titulo: 'Reuniones', descripcion: 'Pipeline de reuniones y su estado de análisis.' },
  transcripciones: { titulo: 'Transcripts', descripcion: 'Transcripciones con su confianza, motor y speakers.' },
  conversaciones: { titulo: 'Conversations', descripcion: 'Historial de conversaciones agrupado por cuenta.' },
  acciones: { titulo: 'Tasks', descripcion: 'Action items de todas las reuniones, con responsable y fecha.' },
}

export function MeetingsList() {
  const params = useSearchParams()
  const vista = params.get('vista') ?? 'reuniones'
  const meta = VISTAS[vista] ?? VISTAS.reuniones
  const { reuniones, transcripciones, playbooks, accionesEstado, setAccionEstado } = useAppStore()

  const filas = useMemo(
    () =>
      [...reuniones]
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
        .map((r) => {
          const t = transcripciones.find((x) => x.reunionId === r.id) ?? null
          const analisis = t ? analizarReunion(r, t, playbookPorTipo(r.tipoReunion, playbooks)) : null
          return { reunion: r, transcripcion: t, analisis }
        }),
    [reuniones, transcripciones, playbooks]
  )

  const nuevaBtn = (
    <Link href="/reuniones/nueva" className="btn-primary">
      <Plus className="h-3.5 w-3.5" /> Nueva conversación
    </Link>
  )

  if (filas.length === 0) {
    return (
      <div className="space-y-4">
        <SectionHeader titulo={meta.titulo} descripcion={meta.descripcion} acciones={nuevaBtn} />
        <EmptyState
          icono={CalendarDays}
          titulo="Todavía no hay reuniones"
          descripcion="Sube un audio o pega una transcripción para arrancar el flujo: transcripción → insights → guided meeting → resumen."
          accion={nuevaBtn}
        />
      </div>
    )
  }

  if (vista === 'acciones') {
    const acciones = filas.flatMap((f) => (f.analisis ? f.analisis.acciones.map((a) => ({ ...a, reunion: f.reunion })) : []))
    return (
      <div className="space-y-4">
        <SectionHeader titulo={meta.titulo} descripcion={meta.descripcion} acciones={nuevaBtn} />
        <Card className="divide-y divide-line-subtle">
          {acciones.length === 0 && <p className="px-4 py-6 text-center text-[13px] text-ink-secondary">Sin action items todavía.</p>}
          {acciones.map((a) => {
            const estado = accionesEstado[`${a.reunionId}:${a.id}`] ?? a.estado
            return (
              <div key={`${a.reunionId}-${a.id}`} className="flex items-start gap-3 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={estado === 'hecha'}
                  onChange={(e) => setAccionEstado(a.reunionId, a.id, e.target.checked ? 'hecha' : 'pendiente')}
                  className="mt-1 accent-[var(--accent)]"
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] ${estado === 'hecha' ? 'text-ink-muted line-through' : 'text-ink'}`}>{a.tarea}</p>
                  <p className="text-[11px] text-ink-muted">
                    {a.responsable ?? 'sin responsable'} · {a.fechaTexto ?? 'sin fecha'} ·{' '}
                    <Link href={`/reuniones/${a.reunionId}/resumen`} className="hover:text-accent">{a.reunion.cuenta}</Link>
                  </p>
                </div>
              </div>
            )
          })}
        </Card>
      </div>
    )
  }

  const agrupadas =
    vista === 'conversaciones'
      ? Array.from(
          filas.reduce((mapa, f) => {
            const lista = mapa.get(f.reunion.cuenta) ?? []
            lista.push(f)
            mapa.set(f.reunion.cuenta, lista)
            return mapa
          }, new Map<string, typeof filas>())
        )
      : null

  return (
    <div className="space-y-4">
      <SectionHeader titulo={meta.titulo} descripcion={meta.descripcion} acciones={nuevaBtn} />

      {agrupadas ? (
        <div className="space-y-4">
          {agrupadas.map(([cuenta, lista]) => (
            <Card key={cuenta} className="p-4">
              <h3 className="mb-2 text-[13px] font-semibold text-ink">{cuenta}</h3>
              <ul className="space-y-1.5">
                {lista.map((f) => (
                  <li key={f.reunion.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                    <Link href={`/reuniones/${f.reunion.id}/transcripcion`} className="font-medium text-ink hover:text-accent">
                      {f.reunion.titulo}
                    </Link>
                    <span className="text-ink-muted">{fmtFecha(f.reunion.fecha)}</span>
                    {f.analisis && <ScoreChip total={f.analisis.score.total} />}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table data-testid="tabla-reuniones">
            <THead>
              <TH>Reunión</TH>
              <TH className="hidden sm:table-cell">Tipo</TH>
              <TH className="hidden md:table-cell">
                {vista === 'transcripciones' ? 'Motor / confianza' : 'Duración'}
              </TH>
              <TH>Estado</TH>
              <TH>Score</TH>
            </THead>
            <TBody>
              {filas.map(({ reunion, transcripcion, analisis }) => (
                <TRow key={reunion.id}>
                  <TCell>
                    <Link href={`/reuniones/${reunion.id}/transcripcion`} className="font-medium text-ink hover:text-accent" data-testid="link-reunion">
                      {reunion.titulo}
                    </Link>
                    <p className="text-[11px] text-ink-muted">
                      {reunion.cuenta} · {fmtFecha(reunion.fecha)} · {reunion.asesor}
                    </p>
                  </TCell>
                  <TCell className="hidden sm:table-cell"><Chip>{ETIQUETA_TIPO_REUNION[reunion.tipoReunion]}</Chip></TCell>
                  <TCell className="hidden text-ink-secondary md:table-cell">
                    {vista === 'transcripciones'
                      ? transcripcion
                        ? `${transcripcion.motor} · ${transcripcion.confianzaGlobal}`
                        : 'sin transcripción'
                      : fmtDuracion(reunion.duracionS)}
                  </TCell>
                  <TCell><Chip tono={reunion.estado === 'analizada' ? 'success' : 'neutral'}>{ETIQUETA_ESTADO_REUNION[reunion.estado]}</Chip></TCell>
                  <TCell>{analisis ? <ScoreChip total={analisis.score.total} /> : <span className="text-ink-muted">—</span>}</TCell>
                </TRow>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
