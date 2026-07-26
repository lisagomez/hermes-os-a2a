'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Compass, Mail, Mic, ScanSearch, Sparkles } from 'lucide-react'
import { useAppStore } from '@/features/domain/store'
import { analizarReunion } from '@/features/insights/engine'
import { playbookPorTipo } from '@/features/playbooks/defaults'
import { ETIQUETA_DIMENSION, ETIQUETA_TIPO_REUNION } from '@/features/domain/types'
import { Card, Chip, ScoreChip, Stat, Table, TBody, TCell, TRow, tonoScore } from '@/shared/components/ui'
import { fmtFecha } from '@/shared/lib/format'

export function HomeView() {
  const { reuniones, transcripciones, playbooks, accionesEstado } = useAppStore()

  const filas = useMemo(
    () =>
      [...reuniones]
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
        .map((r) => {
          const t = transcripciones.find((x) => x.reunionId === r.id)
          return t ? { reunion: r, analisis: analizarReunion(r, t, playbookPorTipo(r.tipoReunion, playbooks)) } : null
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [reuniones, transcripciones, playbooks]
  )

  const scorePromedio = filas.length > 0 ? Math.round(filas.reduce((a, f) => a + f.analisis.score.total, 0) / filas.length) : 0
  const accionesPendientes = filas.flatMap((f) =>
    f.analisis.acciones.filter((a) => (accionesEstado[`${a.reunionId}:${a.id}`] ?? a.estado) === 'pendiente')
  )
  const conRiesgoAlto = filas.filter((f) => f.analisis.riesgos.some((r) => r.severidad === 'alta'))

  // Recomendaciones DERIVADAS de los datos del workspace — nunca decorativas.
  const recomendaciones = useMemo(() => {
    const recs: { texto: string; href: string }[] = []
    for (const f of filas) {
      if (f.analisis.score.total < 50)
        recs.push({
          texto: `${f.reunion.cuenta}: discovery al ${f.analisis.score.total}/100 — agenda una segunda llamada antes de proponer.`,
          href: `/reuniones/${f.reunion.id}/insights`,
        })
    }
    for (const f of conRiesgoAlto) {
      const riesgo = f.analisis.riesgos.find((r) => r.severidad === 'alta')
      if (riesgo) recs.push({ texto: `${f.reunion.cuenta}: riesgo alto — ${riesgo.descripcion}`, href: `/reuniones/${f.reunion.id}/resumen#riesgos` })
    }
    if (accionesPendientes.length > 0)
      recs.push({ texto: `${accionesPendientes.length} action item(s) pendientes en el equipo.`, href: '/reuniones?vista=acciones' })
    return recs.slice(0, 4)
  }, [filas, conRiesgoAlto, accionesPendientes.length])

  const huecoFrecuente = useMemo(() => {
    const conteo = new Map<string, number>()
    for (const f of filas) for (const h of f.analisis.score.huecos) conteo.set(h.dimension, (conteo.get(h.dimension) ?? 0) + 1)
    const top = Array.from(conteo.entries()).sort((a, b) => b[1] - a[1])[0]
    return top ? ETIQUETA_DIMENSION[top[0] as keyof typeof ETIQUETA_DIMENSION] : null
  }, [filas])

  const AGENTES = [
    { nombre: 'Discovery Analyst', Icono: ScanSearch, href: filas[0] ? `/reuniones/${filas[0].reunion.id}/insights` : '/reuniones' },
    { nombre: 'Meeting Coach', Icono: Compass, href: filas[0] ? `/reuniones/${filas[0].reunion.id}/guiada` : '/reuniones' },
    { nombre: 'Follow-up Writer', Icono: Mail, href: filas[0] ? `/reuniones/${filas[0].reunion.id}/resumen#followup` : '/reuniones' },
    { nombre: 'Voice Transcription', Icono: Mic, href: '/herramientas/transcripcion' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-ink">Mission Control</h1>
        <p className="text-[13px] text-ink-secondary">Tu operación comercial de reuniones, en un solo lugar.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat etiqueta="Reuniones analizadas" valor={String(filas.length)} />
        <Stat
          etiqueta="Score promedio"
          valor={filas.length > 0 ? `${scorePromedio}/100` : '—'}
          tono={tonoScore(scorePromedio)}
          detalle={huecoFrecuente ? `hueco más común: ${huecoFrecuente}` : undefined}
        />
        <Stat etiqueta="Acciones pendientes" valor={String(accionesPendientes.length)} tono={accionesPendientes.length > 0 ? 'warning' : 'success'} />
        <Stat etiqueta="Deals con riesgo alto" valor={String(conRiesgoAlto.length)} tono={conRiesgoAlto.length > 0 ? 'danger' : 'success'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card>
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <h2 className="text-[13px] font-semibold text-ink">Reuniones recientes</h2>
            <Link href="/reuniones" className="flex items-center gap-1 text-[12px] font-medium text-accent hover:underline">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <Table data-testid="home-reuniones">
            <TBody>
              {filas.slice(0, 5).map(({ reunion, analisis }) => (
                <TRow key={reunion.id}>
                  <TCell>
                    <Link href={`/reuniones/${reunion.id}/resumen`} className="font-medium text-ink hover:text-accent">
                      {reunion.titulo}
                    </Link>
                    <p className="text-[11px] text-ink-muted">{reunion.cuenta} · {fmtFecha(reunion.fecha)}</p>
                  </TCell>
                  <TCell className="hidden sm:table-cell"><Chip>{ETIQUETA_TIPO_REUNION[reunion.tipoReunion]}</Chip></TCell>
                  <TCell className="text-right"><ScoreChip total={analisis.score.total} /></TCell>
                </TRow>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-[13px] text-ink-secondary">
                    Sin reuniones aún — empieza con una <Link href="/reuniones/nueva" className="text-accent hover:underline">nueva conversación</Link>.
                  </td>
                </tr>
              )}
            </TBody>
          </Table>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <h2 className="text-[13px] font-semibold text-ink">Recomendaciones</h2>
            </div>
            {recomendaciones.length === 0 ? (
              <p className="text-[12px] text-ink-secondary">Nada urgente: los deals analizados están en orden.</p>
            ) : (
              <ul className="space-y-2" data-testid="home-recomendaciones">
                {recomendaciones.map((r) => (
                  <li key={r.texto}>
                    <Link href={r.href} className="block rounded-s bg-surface-muted px-2.5 py-2 text-[12px] text-ink hover:bg-accent-muted">
                      {r.texto}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="mb-2 text-[13px] font-semibold text-ink">Agentes</h2>
            <div className="grid grid-cols-2 gap-2">
              {AGENTES.map(({ nombre, Icono, href }) => (
                <Link key={nombre} href={href} className="flex flex-col items-center gap-1.5 rounded-s border border-line bg-surface px-2 py-3 text-center hover:border-accent">
                  <Icono className="h-4 w-4 text-accent" />
                  <span className="text-[11px] font-medium text-ink">{nombre}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
