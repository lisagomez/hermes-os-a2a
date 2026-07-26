'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Circle, Download, Mic, MicOff, Pause, Play, Send, Square, Trash2 } from 'lucide-react'
import { useTranscripcionStore } from '@/features/transcription/store'
import { Card, Chip, SectionHeader } from '@/shared/components/ui'
import { PROVIDER_STT } from '@/shared/lib/config'

type EstadoGrabacion = 'inactivo' | 'grabando' | 'pausado' | 'listo'

function nombreDefault(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `grabacion-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.webm`
}

function fmtCrono(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function RecorderView() {
  const router = useRouter()
  const agregarArchivos = useTranscripcionStore((s) => s.agregarArchivos)
  const [estado, setEstado] = useState<EstadoGrabacion>('inactivo')
  const [error, setError] = useState<string | null>(null)
  const [segundos, setSegundos] = useState(0)
  const [nombre, setNombre] = useState('')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobRef = useRef<Blob | null>(null)

  // Cronómetro mientras se graba.
  useEffect(() => {
    if (estado !== 'grabando') return
    const id = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [estado])

  // Liberar la URL del audio al desmontar o descartar.
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const soportado = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined' && !!navigator.mediaDevices

  const iniciar = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        blobRef.current = blob
        setAudioUrl(URL.createObjectURL(blob))
        setEstado('listo')
        stream.getTracks().forEach((t) => t.stop())
      }
      recorderRef.current = recorder
      recorder.start(1000)
      setSegundos(0)
      setNombre(nombreDefault())
      setEstado('grabando')
    } catch (e) {
      // Fallo VISIBLE (permiso denegado, sin micrófono): nunca silencioso.
      setError(
        e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError')
          ? 'Permiso de micrófono denegado. Autorízalo en el navegador (icono de candado junto a la URL) y vuelve a intentar.'
          : `No se pudo iniciar la grabación: ${e instanceof Error ? e.message : String(e)}`
      )
      setEstado('inactivo')
    }
  }

  const pausar = () => {
    recorderRef.current?.pause()
    setEstado('pausado')
  }
  const reanudar = () => {
    recorderRef.current?.resume()
    setEstado('grabando')
  }
  const detener = () => {
    recorderRef.current?.stop()
  }
  const descartar = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    blobRef.current = null
    setAudioUrl(null)
    setSegundos(0)
    setEstado('inactivo')
  }
  const enviar = () => {
    if (!blobRef.current) return
    const filename = nombre.trim() || nombreDefault()
    agregarArchivos([{ filename, blob: blobRef.current }])
    router.push('/herramientas/transcripcion')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SectionHeader
        titulo="Grabación"
        descripcion="Graba la reunión desde la app con tu micrófono; al terminar, la grabación entra a la cola de Voice Transcription."
      />

      {!soportado ? (
        <Card className="border-danger bg-danger-muted p-4">
          <p className="text-[13px] text-danger">
            Este navegador no soporta MediaRecorder — la grabación en-app necesita un navegador moderno (Chrome, Edge, Firefox).
          </p>
        </Card>
      ) : (
        <Card className="space-y-4 p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span
              className={`flex h-16 w-16 items-center justify-center rounded-full ${
                estado === 'grabando' ? 'animate-pulse bg-danger-muted text-danger' : 'bg-accent-muted text-accent'
              }`}
            >
              {estado === 'grabando' || estado === 'pausado' ? <Circle className="h-6 w-6 fill-current" /> : <Mic className="h-7 w-7" />}
            </span>

            <p className="font-mono text-2xl font-semibold tabular-nums text-ink" data-testid="crono">
              {fmtCrono(segundos)}
            </p>

            <div className="flex items-center gap-2">
              {estado === 'inactivo' && (
                <button type="button" className="btn-primary" onClick={iniciar} data-testid="grabar">
                  <Mic className="h-3.5 w-3.5" /> Grabar
                </button>
              )}
              {estado === 'grabando' && (
                <>
                  <button type="button" className="btn-secondary" onClick={pausar} data-testid="pausar">
                    <Pause className="h-3.5 w-3.5" /> Pausar
                  </button>
                  <button type="button" className="btn-primary" onClick={detener} data-testid="detener">
                    <Square className="h-3.5 w-3.5" /> Detener
                  </button>
                </>
              )}
              {estado === 'pausado' && (
                <>
                  <button type="button" className="btn-secondary" onClick={reanudar}>
                    <Play className="h-3.5 w-3.5" /> Reanudar
                  </button>
                  <button type="button" className="btn-primary" onClick={detener} data-testid="detener">
                    <Square className="h-3.5 w-3.5" /> Detener
                  </button>
                </>
              )}
            </div>

            {estado === 'grabando' && <Chip tono="danger">grabando</Chip>}
            {estado === 'pausado' && <Chip tono="warning">en pausa</Chip>}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-danger-muted px-3 py-2" data-testid="error-grabacion">
              <MicOff className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p className="text-[12px] text-danger">{error}</p>
            </div>
          )}

          {estado === 'listo' && audioUrl && (
            <div className="space-y-3 border-t border-line-subtle pt-4" data-testid="grabacion-lista">
              <audio controls src={audioUrl} className="w-full" />
              <label className="block text-[12px] font-medium text-ink-secondary">
                Nombre del archivo
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="input mt-1" data-testid="nombre-grabacion" />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn-primary" onClick={enviar} data-testid="enviar-transcripcion">
                  <Send className="h-3.5 w-3.5" /> Enviar a transcripción
                </button>
                <a href={audioUrl} download={nombre || nombreDefault()} className="btn-secondary">
                  <Download className="h-3.5 w-3.5" /> Descargar
                </a>
                <button type="button" className="btn-secondary" onClick={descartar}>
                  <Trash2 className="h-3.5 w-3.5" /> Descartar
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className="p-4">
        <p className="text-[12px] text-ink-secondary">
          Provider de transcripción activo: <span className="font-medium">{PROVIDER_STT}</span>.
          {PROVIDER_STT === 'mock' && (
            <>
              {' '}
              Con el provider mock la grabación recorre TODO el pipeline (cola, progreso, análisis) pero la transcripción
              resultante es la demo — el audio real se transcribirá al conectar un provider real (faster-whisper /
              transcripcion-a2a), que ya recibe el binario de esta grabadora.
            </>
          )}
        </p>
      </Card>
    </div>
  )
}
