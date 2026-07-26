'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, Compass, FileAudio, Loader2, Mic, RotateCcw, ScanSearch, Upload } from 'lucide-react'
import { useTranscripcionStore } from './store'
import { useAppStore } from '@/features/domain/store'
import { Card, Chip, EmptyState, ProgressBar, SectionHeader } from '@/shared/components/ui'
import { PROVIDER_STT } from '@/shared/lib/config'
import { fmtTiempo } from '@/shared/lib/format'
import type { TrabajoTranscripcion } from '@/features/domain/types'

function FilaJob({ job }: { job: TrabajoTranscripcion }) {
  const reintentar = useTranscripcionStore((s) => s.reintentar)
  const transcripcion = useAppStore((s) => s.transcripciones.find((t) => t.reunionId === job.reunionId) ?? null)

  return (
    <Card className="p-4" >
      <div className="flex items-start gap-3" data-testid={`job-${job.estado}`}>
        <FileAudio className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-semibold text-ink">{job.filename}</p>
            <Chip>{job.motor}</Chip>
            <Chip>{job.idioma}</Chip>
            {job.estado === 'pendiente' && <Chip>en cola</Chip>}
            {job.estado === 'procesando' && (
              <Chip tono="info">
                <Loader2 className="h-3 w-3 animate-spin" /> procesando {job.progreso}%
              </Chip>
            )}
            {job.estado === 'completado' && (
              <Chip tono="success">
                <CheckCircle2 className="h-3 w-3" /> completado
              </Chip>
            )}
            {job.estado === 'fallido' && (
              <Chip tono="danger">
                <AlertCircle className="h-3 w-3" /> fallido (intento {job.intentos}/3)
              </Chip>
            )}
          </div>

          {job.estado === 'procesando' && <ProgressBar valor={job.progreso} tono="info" />}

          {job.estado === 'fallido' && job.error && (
            <div className="flex items-start justify-between gap-3 rounded-lg bg-danger-muted px-3 py-2">
              <p className="text-[12px] text-danger">{job.error}</p>
              {job.intentos < 3 && (
                <button type="button" onClick={() => reintentar(job.id)} className="btn-secondary shrink-0" data-testid="reintentar-job">
                  <RotateCcw className="h-3 w-3" /> Reintentar
                </button>
              )}
            </div>
          )}

          {job.estado === 'completado' && job.reunionId && transcripcion && (
            <div className="space-y-2">
              <p className="text-[12px] text-ink-secondary">
                {transcripcion.segmentos.length} segmentos · {fmtTiempo(transcripcion.segmentos.at(-1)?.finS ?? 0)} ·
                confianza <span className="font-medium">{transcripcion.confianzaGlobal}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/reuniones/${job.reunionId}/transcripcion`} className="btn-secondary" data-testid="ver-transcripcion">
                  Ver transcripción
                </Link>
                <Link href={`/reuniones/${job.reunionId}/insights`} className="btn-primary" data-testid="enviar-analyzer">
                  <ScanSearch className="h-3.5 w-3.5" /> Analizar discovery
                </Link>
                <Link href={`/reuniones/${job.reunionId}/guiada`} className="btn-secondary">
                  <Compass className="h-3.5 w-3.5" /> Abrir en Guided Meeting
                </Link>
                <Link href={`/reuniones/${job.reunionId}/resumen`} className="btn-secondary">
                  Resumen rápido
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export function VoiceTranscriptionTool() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { jobs, agregarArchivos, agregarDemo } = useTranscripcionStore()

  return (
    <div className="space-y-5">
      <SectionHeader
        titulo="Voice Transcription"
        descripcion={`Audio → transcripción diarizada con timestamps y confianza. Provider activo: ${PROVIDER_STT}.`}
      />

      <Card className="border-dashed p-6">
        <div
          className="flex flex-col items-center gap-3 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const archivos = Array.from(e.dataTransfer.files).map((f) => ({ filename: f.name }))
            if (archivos.length > 0) agregarArchivos(archivos)
          }}
          data-testid="dropzone"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-muted text-accent">
            <Mic className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Arrastra audios aquí o selecciónalos</p>
            <p className="mt-0.5 text-[12px] text-ink-secondary">
              MP3, WAV, M4A, OGG · la cola procesa un archivo a la vez · es-MX
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" className="btn-primary" onClick={() => inputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Elegir archivos
            </button>
            <button type="button" className="btn-secondary" onClick={agregarDemo} data-testid="usar-audio-demo">
              Usar audio de demostración
            </button>
          </div>
          <p className="text-[11px] text-ink-muted">
            El provider mock produce la transcripción demo de TransLogika; un archivo cuyo nombre contenga
            “error” demuestra el estado de fallo.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.opus,.webm"
            multiple
            hidden
            onChange={(e) => {
              const archivos = Array.from(e.target.files ?? []).map((f) => ({ filename: f.name }))
              if (archivos.length > 0) agregarArchivos(archivos)
              e.target.value = ''
            }}
          />
        </div>
      </Card>

      {jobs.length === 0 ? (
        <EmptyState
          icono={FileAudio}
          titulo="Sin trabajos de transcripción"
          descripcion="Sube un audio o usa el de demostración: verás la cola, el progreso y la transcripción resultante conectada al Discovery Analyzer."
        />
      ) : (
        <div className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Cola de procesamiento</h2>
          {[...jobs].reverse().map((j) => (
            <FilaJob key={j.id} job={j} />
          ))}
        </div>
      )}
    </div>
  )
}
