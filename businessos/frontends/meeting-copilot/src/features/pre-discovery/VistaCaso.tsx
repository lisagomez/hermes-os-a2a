'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Compass, Download, Mic, NotebookPen, SearchX, Sparkles } from 'lucide-react'
import { useCaso } from './store'
import { useAppStore } from '@/features/domain/store'
import { useActivo } from '@/features/activos/store'
import { correrBloque, correrPipeline } from './pipeline'
import { briefAMarkdown, descargarArchivo } from './export'
import {
  AvisosValidacion,
  BriefView,
  CabeceraBloque,
  CompetenciaView,
  EstrategiaView,
  PerfilView,
  RegulatorioView,
  SitioView,
  TecnologiaView,
} from './bloques-ui'
import type {
  DatosBrief,
  DatosCompetencia,
  DatosDiferenciacion,
  DatosFoda,
  DatosPerfil,
  DatosSitio,
  DatosTecnologia,
  BloqueId,
  CasoPreDiscovery,
} from './types'
import type { EvaluacionGrafo } from './grafo'
import { Button, Card, Chip, EmptyState } from '@/shared/components/ui'
import { Clis } from './Clis'
import { ActivoCosteo } from './ActivoCosteo'

const TABS = [
  { id: 'resumen', etiqueta: 'Resumen' },
  { id: 'sitio', etiqueta: 'Sitio y servicios' },
  { id: 'benchmark', etiqueta: 'Benchmark' },
  { id: 'estrategia', etiqueta: 'Estrategia' },
  { id: 'marcos', etiqueta: 'Marcos' },
  { id: 'brief', etiqueta: 'Brief del asesor' },
  { id: 'activo', etiqueta: 'Activo & Costeo' },
  { id: 'clis', etiqueta: 'CLIs' },
] as const

type TabId = (typeof TABS)[number]['id']

function BloquePendiente({ caso, bloque }: { caso: CasoPreDiscovery; bloque: BloqueId }) {
  const b = caso.bloques[bloque]
  if (b.estado === 'analizando') {
    return <p className="py-6 text-center text-[13px] text-ink-secondary">Analizando este bloque… el resultado aparece aquí en cuanto termine.</p>
  }
  if (b.estado === 'error') {
    return (
      <p className="rounded-s bg-danger-muted px-3 py-2 text-[12px] text-danger">
        {b.error ?? 'El análisis de este bloque falló.'} Usa “Regenerar” para reintentarlo.
      </p>
    )
  }
  return <p className="py-6 text-center text-[13px] text-ink-secondary">Este bloque aún no corre — usa “Regenerar” o vuelve a lanzar el análisis completo.</p>
}

export function VistaCaso() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const tab = (searchParams.get('tab') as TabId) ?? 'resumen'
  const caso = useCaso(params.id)
  const leads = useAppStore((s) => s.leads)
  const reunionDelLead = useAppStore((s) => (caso ? (s.reuniones.find((r) => r.leadId === caso.leadId) ?? null) : null))
  const { activo, ledger, total } = useActivo(caso?.activoId ?? null)
  const [regenerando, setRegenerando] = useState<BloqueId | null>(null)

  const lead = useMemo(() => leads.find((l) => l.leadId === caso?.leadId) ?? null, [leads, caso?.leadId])

  if (!caso) {
    return (
      <EmptyState
        icono={SearchX}
        titulo="Caso no encontrado"
        descripcion="El enlace apunta a un caso de Pre-Discovery que no existe en este workspace."
        accion={<Link href="/pre-discovery" className="btn-primary">Ver casos</Link>}
      />
    )
  }

  const regenerar = async (bloque: BloqueId) => {
    setRegenerando(bloque)
    try {
      await correrBloque(caso.id, bloque, null)
    } finally {
      setRegenerando(null)
    }
  }

  const cabecera = (id: BloqueId) => (
    <CabeceraBloque id={id} bloque={caso.bloques[id]} onRegenerar={() => void regenerar(id)} regenerando={regenerando === id} />
  )

  const brief = caso.bloques.brief.datos as DatosBrief | null

  return (
    <div>
      {/* Cabecera del caso (patrón MeetingHeader) */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/pre-discovery" className="rounded-s p-1 text-ink-muted hover:text-ink" title="Volver a casos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-base font-semibold text-ink">{lead?.empresa ?? caso.leadId}</h1>
          <Chip tono={caso.estado === 'listo' ? 'success' : caso.estado === 'error' ? 'danger' : caso.estado === 'analizando' ? 'info' : 'warning'}>
            {caso.estado}
          </Chip>
          <span className="text-[12px] text-ink-secondary">
            {lead?.contacto} · {caso.intake.giro} · {caso.intake.pais}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button tamano="sm" onClick={() => void correrPipeline(caso.id)} data-testid="reanalizar-caso">
              Re-analizar todo
            </Button>
            {activo && <Chip>{activo.folio} · ${total.toFixed(4)}</Chip>}
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-b border-line">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/pre-discovery/${caso.id}?tab=${t.id}`}
              data-testid={`tab-caso-${t.id}`}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium transition-colors ${
                tab === t.id ? 'border-accent text-accent' : 'border-transparent text-ink-secondary hover:text-ink'
              }`}
            >
              {t.etiqueta}
            </Link>
          ))}
        </nav>
      </div>

      {tab === 'resumen' && (
        <div className="space-y-4">
          <Card className="p-4">
            {cabecera('perfil')}
            {caso.bloques.perfil.datos ? <PerfilView datos={caso.bloques.perfil.datos as DatosPerfil} /> : <BloquePendiente caso={caso} bloque="perfil" />}
            <AvisosValidacion bloque={caso.bloques.perfil} />
          </Card>
          {brief && (
            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">Brief ejecutivo</h2>
                <Link href={`/pre-discovery/${caso.id}?tab=brief`} className="text-[12px] font-medium text-accent hover:underline">
                  Ver brief completo →
                </Link>
              </div>
              <p className="text-[13px] text-ink">{brief.resumen}</p>
            </Card>
          )}
        </div>
      )}

      {tab === 'sitio' && (
        <Card className="p-4">
          {cabecera('sitio')}
          {caso.bloques.sitio.datos ? <SitioView datos={caso.bloques.sitio.datos as DatosSitio} /> : <BloquePendiente caso={caso} bloque="sitio" />}
          <AvisosValidacion bloque={caso.bloques.sitio} />
        </Card>
      )}

      {tab === 'benchmark' && (
        <Card className="p-4">
          {cabecera('competencia')}
          {caso.bloques.competencia.estado === 'no_concluyente' && !caso.bloques.competencia.datos ? (
            <p className="rounded-s bg-warning-muted px-3 py-2 text-[12px] text-warning" data-testid="competencia-no-concluyente">
              Competencia no identificada con confianza suficiente — no se inventa. Corre el análisis real (con sitio) o
              añade competidores conocidos en las notas del intake y re-analiza.
            </p>
          ) : caso.bloques.competencia.datos ? (
            <CompetenciaView datos={caso.bloques.competencia.datos as DatosCompetencia} />
          ) : (
            <BloquePendiente caso={caso} bloque="competencia" />
          )}
          <AvisosValidacion bloque={caso.bloques.competencia} />
        </Card>
      )}

      {tab === 'estrategia' && (
        <Card className="p-4">
          {cabecera('diferenciacion')}
          <EstrategiaView dif={caso.bloques.diferenciacion.datos as DatosDiferenciacion | null} foda={caso.bloques.foda.datos as DatosFoda | null} />
          <AvisosValidacion bloque={caso.bloques.foda} />
        </Card>
      )}

      {tab === 'marcos' && (
        <div className="space-y-4">
          <Card className="p-4">
            {cabecera('regulatorio')}
            {caso.bloques.regulatorio.datos ? (
              <RegulatorioView datos={caso.bloques.regulatorio.datos as EvaluacionGrafo} caso={caso} />
            ) : (
              <BloquePendiente caso={caso} bloque="regulatorio" />
            )}
            <AvisosValidacion bloque={caso.bloques.regulatorio} />
          </Card>
          <Card className="p-4">
            {cabecera('tecnologia')}
            {caso.bloques.tecnologia.datos ? <TecnologiaView datos={caso.bloques.tecnologia.datos as DatosTecnologia} /> : <BloquePendiente caso={caso} bloque="tecnologia" />}
            <AvisosValidacion bloque={caso.bloques.tecnologia} />
          </Card>
        </div>
      )}

      {tab === 'brief' && (
        <Card className="p-4">
          {cabecera('brief')}
          {brief ? <BriefView datos={brief} icono={Sparkles} /> : <BloquePendiente caso={caso} bloque="brief" />}
          {brief && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line-subtle pt-3">
              <Link href="/grabacion" className="btn-primary" data-testid="brief-a-grabacion">
                <Mic className="h-3.5 w-3.5" /> Usar en modo asesor (Grabación)
              </Link>
              {reunionDelLead && (
                <Link href={`/reuniones/${reunionDelLead.id}/guiada`} className="btn-secondary">
                  <Compass className="h-3.5 w-3.5" /> Abrir Guided Meeting del lead
                </Link>
              )}
              <Button onClick={() => descargarArchivo(`brief-${lead?.empresa ?? caso.leadId}.md`, briefAMarkdown(caso, lead), 'text/markdown')} data-testid="descargar-brief">
                <Download className="h-3.5 w-3.5" /> Descargar brief (MD)
              </Button>
              <Chip tono="info">
                <NotebookPen className="h-3 w-3" /> el brief aparece también en CRM notes de la entrevista del lead
              </Chip>
            </div>
          )}
        </Card>
      )}

      {tab === 'activo' && <ActivoCosteo caso={caso} activo={activo} ledger={ledger} total={total} />}

      {tab === 'clis' && <Clis caso={caso} activo={activo} />}
    </div>
  )
}
