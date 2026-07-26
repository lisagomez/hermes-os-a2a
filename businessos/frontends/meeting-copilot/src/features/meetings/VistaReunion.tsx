'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { SearchX, Sparkles } from 'lucide-react'
import { useAppStore, useReunion } from '@/features/domain/store'
import { analizarReunion } from '@/features/insights/engine'
import { fusionarAnalisis, useAnalisisIAStore } from '@/features/insights/ia'
import { playbookPorTipo } from '@/features/playbooks/defaults'
import { MOTOR_AGENTE } from '@/shared/lib/config'
import { Chip } from '@/shared/components/ui'
import { MeetingHeader } from './MeetingHeader'
import { TranscriptViewer } from '@/features/transcription/TranscriptViewer'
import { InsightsPanel } from '@/features/insights/InsightsPanel'
import { GuidedMeeting } from '@/features/guided/GuidedMeeting'
import { WorkspacePanel } from '@/features/workspace/WorkspacePanel'
import { EmptyState } from '@/shared/components/ui'

export function VistaReunion({ vista }: { vista: 'transcripcion' | 'insights' | 'guiada' | 'resumen' }) {
  const params = useParams<{ id: string }>()
  const { reunion, transcripcion } = useReunion(params.id)
  const playbooks = useAppStore((s) => s.playbooks)

  const analisisReglas = useMemo(
    () => (reunion && transcripcion ? analizarReunion(reunion, transcripcion, playbookPorTipo(reunion.tipoReunion, playbooks)) : null),
    [reunion, transcripcion, playbooks]
  )

  // Motor llm: el Discovery Analyst IA analiza la transcripción real UNA vez y
  // sus dimensiones/insights (con evidencia validada) mandan sobre el léxico.
  const solicitarIA = useAnalisisIAStore((s) => s.solicitar)
  const estadoIACrudo = useAnalisisIAStore((s) => (transcripcion ? s.porTranscripcion[transcripcion.id] : undefined))
  const estadoIA = useMemo(() => estadoIACrudo ?? { estado: 'inactivo' as const }, [estadoIACrudo])
  useEffect(() => {
    if (MOTOR_AGENTE === 'llm' && reunion && transcripcion) solicitarIA(reunion, transcripcion)
  }, [reunion, transcripcion, solicitarIA])

  const analisis = useMemo(() => {
    if (!reunion || !analisisReglas) return null
    if (estadoIA.estado === 'listo') {
      return fusionarAnalisis(analisisReglas, estadoIA.analisis, playbookPorTipo(reunion.tipoReunion, playbooks), reunion)
    }
    return analisisReglas
  }, [reunion, analisisReglas, estadoIA, playbooks])

  if (!reunion) {
    return (
      <EmptyState
        icono={SearchX}
        titulo="Reunión no encontrada"
        descripcion="El enlace apunta a una reunión que no existe en este workspace."
        accion={<Link href="/reuniones" className="btn-primary">Ver reuniones</Link>}
      />
    )
  }

  if (!transcripcion || !analisis) {
    return (
      <div>
        <MeetingHeader reunion={reunion} />
        <EmptyState
          titulo="Esta reunión aún no tiene transcripción"
          descripcion="Procesa su audio en Voice Transcription o pega la transcripción para desbloquear insights, guided meeting y resumen."
          accion={<Link href="/herramientas/transcripcion" className="btn-primary">Abrir Voice Transcription</Link>}
        />
      </div>
    )
  }

  return (
    <div>
      <MeetingHeader reunion={reunion} />
      {MOTOR_AGENTE === 'llm' && (vista === 'insights' || vista === 'resumen') && (
        <div className="-mt-1 mb-3 flex items-center gap-2" data-testid="estado-analisis-ia">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          {estadoIA.estado === 'listo' ? (
            <>
              <Chip tono="accent">análisis IA</Chip>
              <span className="text-[11px] text-ink-muted">
                Discovery Analyst con evidencia validada contra la transcripción
                {estadoIA.analisis.descartados > 0 ? ` (${estadoIA.analisis.descartados} hallazgo(s) descartados por evidencia inválida)` : ''}.
              </span>
            </>
          ) : estadoIA.estado === 'cargando' ? (
            <Chip tono="info">analizando con IA…</Chip>
          ) : estadoIA.estado === 'error' ? (
            <Chip tono="warning">
              <span title={estadoIA.error}>IA no disponible — análisis por reglas</span>
            </Chip>
          ) : (
            <Chip>análisis por reglas</Chip>
          )}
        </div>
      )}
      {vista === 'transcripcion' && <TranscriptViewer reunion={reunion} transcripcion={transcripcion} />}
      {vista === 'insights' && <InsightsPanel reunion={reunion} analisis={analisis} />}
      {vista === 'guiada' && <GuidedMeeting reunion={reunion} transcripcion={transcripcion} />}
      {vista === 'resumen' && <WorkspacePanel reunion={reunion} transcripcion={transcripcion} analisis={analisis} />}
    </div>
  )
}
