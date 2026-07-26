'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { SearchX } from 'lucide-react'
import { useAppStore, useReunion } from '@/features/domain/store'
import { analizarReunion } from '@/features/insights/engine'
import { playbookPorTipo } from '@/features/playbooks/defaults'
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

  const analisis = useMemo(
    () => (reunion && transcripcion ? analizarReunion(reunion, transcripcion, playbookPorTipo(reunion.tipoReunion, playbooks)) : null),
    [reunion, transcripcion, playbooks]
  )

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
      {vista === 'transcripcion' && <TranscriptViewer reunion={reunion} transcripcion={transcripcion} />}
      {vista === 'insights' && <InsightsPanel reunion={reunion} analisis={analisis} />}
      {vista === 'guiada' && <GuidedMeeting reunion={reunion} transcripcion={transcripcion} />}
      {vista === 'resumen' && <WorkspacePanel reunion={reunion} transcripcion={transcripcion} analisis={analisis} />}
    </div>
  )
}
