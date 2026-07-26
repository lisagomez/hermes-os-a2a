'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ClipboardCheck } from 'lucide-react'
import { useAppStore } from '@/features/domain/store'
import { analizarReunion } from '@/features/insights/engine'
import { playbookPorTipo } from '@/features/playbooks/defaults'
import { ETIQUETA_DIMENSION, ETIQUETA_TIPO_REUNION, type DimensionId } from '@/features/domain/types'
import { Card, Chip, EmptyState, ScoreChip, SectionHeader, Stat, Table, TBody, TCell, TH, THead, TRow, tonoScore } from '@/shared/components/ui'
import { fmtFecha } from '@/shared/lib/format'
import { ORDEN_PRIORIDAD } from '@/features/playbooks/defaults'

export function ManagerView() {
  const { reuniones, transcripciones, playbooks } = useAppStore()

  const filas = useMemo(
    () =>
      reuniones
        .map((r) => {
          const t = transcripciones.find((x) => x.reunionId === r.id)
          if (!t) return null
          return { reunion: r, analisis: analizarReunion(r, t, playbookPorTipo(r.tipoReunion, playbooks)) }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => b.reunion.fecha.localeCompare(a.reunion.fecha)),
    [reuniones, transcripciones, playbooks]
  )

  const porAsesor = useMemo(() => {
    const mapa = new Map<string, { total: number; suma: number }>()
    for (const f of filas) {
      const prev = mapa.get(f.reunion.asesor) ?? { total: 0, suma: 0 }
      mapa.set(f.reunion.asesor, { total: prev.total + 1, suma: prev.suma + f.analisis.score.total })
    }
    return Array.from(mapa.entries()).map(([asesor, v]) => ({ asesor, llamadas: v.total, promedio: Math.round(v.suma / v.total) }))
  }, [filas])

  const preguntasFaltantes = useMemo(() => {
    const conteo = new Map<DimensionId, number>()
    for (const f of filas) for (const h of f.analisis.score.huecos) conteo.set(h.dimension, (conteo.get(h.dimension) ?? 0) + 1)
    return ORDEN_PRIORIDAD.filter((d) => conteo.has(d)).map((d) => ({ dimension: d, veces: conteo.get(d) ?? 0 }))
  }, [filas])

  const objecionesFrecuentes = useMemo(() => {
    const todas = filas.flatMap((f) => f.analisis.insights.filter((i) => i.categoria === 'objecion').map((i) => ({ reunion: f.reunion, texto: i.texto })))
    return todas
  }, [filas])

  if (filas.length === 0) {
    return (
      <EmptyState
        icono={ClipboardCheck}
        titulo="Aún no hay llamadas analizadas"
        descripcion="Cuando el equipo procese reuniones, aquí verás scorecards por llamada, calidad por agente y patrones de objeciones."
      />
    )
  }

  const promedioEquipo = Math.round(filas.reduce((a, f) => a + f.analisis.score.total, 0) / filas.length)

  return (
    <div className="space-y-5">
      <SectionHeader
        titulo="Manager — calidad de discovery"
        descripcion="Scorecards con criterios objetivos: cada número tiene su desglose y su evidencia en la llamada."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat etiqueta="Llamadas analizadas" valor={String(filas.length)} />
        <Stat etiqueta="Score promedio del equipo" valor={`${promedioEquipo}/100`} tono={tonoScore(promedioEquipo)} detalle={tonoScore(promedioEquipo) === 'success' ? 'sano' : 'hay coaching pendiente'} />
        <Stat etiqueta="Objeciones registradas" valor={String(objecionesFrecuentes.length)} />
        <Stat etiqueta="Huecos más repetidos" valor={preguntasFaltantes[0] ? ETIQUETA_DIMENSION[preguntasFaltantes[0].dimension] : '—'} detalle={preguntasFaltantes[0] ? `${preguntasFaltantes[0].veces} llamada(s)` : undefined} />
      </div>

      <Card>
        <Table data-testid="tabla-scorecards">
          <THead>
            <TH>Reunión</TH>
            <TH>Asesor</TH>
            <TH>Tipo</TH>
            <TH>Score</TH>
            <TH className="hidden md:table-cell">Adherencia al playbook</TH>
            <TH>Huecos</TH>
          </THead>
          <TBody>
            {filas.map(({ reunion, analisis }) => {
              const cubiertas = analisis.score.dimensiones.filter((d) => d.estado === 'cubierta').length
              return (
                <TRow key={reunion.id}>
                  <TCell>
                    <Link href={`/reuniones/${reunion.id}/resumen`} className="font-medium text-ink hover:text-accent">
                      {reunion.titulo}
                    </Link>
                    <p className="text-[11px] text-ink-muted">
                      {reunion.cuenta} · {fmtFecha(reunion.fecha)}
                    </p>
                  </TCell>
                  <TCell className="text-ink">{reunion.asesor}</TCell>
                  <TCell><Chip>{ETIQUETA_TIPO_REUNION[reunion.tipoReunion]}</Chip></TCell>
                  <TCell><ScoreChip total={analisis.score.total} /></TCell>
                  <TCell className="hidden text-ink-secondary md:table-cell">
                    {cubiertas}/{analisis.score.dimensiones.length} dimensiones cubiertas
                  </TCell>
                  <TCell className="text-ink-secondary">
                    {analisis.score.huecos.length === 0 ? '—' : analisis.score.huecos.map((h) => ETIQUETA_DIMENSION[h.dimension]).join(', ')}
                  </TCell>
                </TRow>
              )
            })}
          </TBody>
        </Table>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2" id="analytics">
        <Card className="p-4">
          <h3 className="mb-2 text-[13px] font-semibold text-ink">Calidad por agente</h3>
          <ul className="space-y-2">
            {porAsesor.map((a) => (
              <li key={a.asesor} className="flex items-center justify-between rounded-s bg-surface-muted px-3 py-2">
                <span className="text-[13px] font-medium text-ink">{a.asesor}</span>
                <span className="text-[12px] text-ink-secondary">{a.llamadas} llamada(s)</span>
                <ScoreChip total={a.promedio} />
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h3 className="mb-2 text-[13px] font-semibold text-ink">Preguntas faltantes recurrentes</h3>
          {preguntasFaltantes.length === 0 ? (
            <p className="text-[12px] text-ink-secondary">Ningún hueco recurrente — el equipo está cubriendo el playbook.</p>
          ) : (
            <ul className="space-y-2">
              {preguntasFaltantes.map((p) => (
                <li key={p.dimension} className="flex items-center justify-between rounded-s bg-surface-muted px-3 py-2">
                  <span className="text-[13px] text-ink">{ETIQUETA_DIMENSION[p.dimension]}</span>
                  <Chip tono={p.veces > 1 ? 'warning' : 'neutral'}>{p.veces} llamada(s)</Chip>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mb-2 mt-4 text-[13px] font-semibold text-ink">Objeciones detectadas</h3>
          {objecionesFrecuentes.length === 0 ? (
            <p className="text-[12px] text-ink-secondary">Sin objeciones registradas.</p>
          ) : (
            <ul className="space-y-1.5">
              {objecionesFrecuentes.map((o, i) => (
                <li key={i} className="text-[12px] text-ink-secondary">
                  “{o.texto}” — <span className="text-ink-muted">{o.reunion.cuenta}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
