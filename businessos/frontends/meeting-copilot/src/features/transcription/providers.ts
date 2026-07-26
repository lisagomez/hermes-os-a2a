// Providers de transcripción detrás de UNA interfaz (SPEC §13). Conectar el
// provider real jamás toca UI ni análisis: mismo contrato de salida.

import type { Segmento } from '@/features/domain/types'
import { PROVIDER_STT, type ProviderSTT } from '@/shared/lib/config'
import { AUDIO_DEMO } from '@/features/domain/fixtures'

export interface ResultadoTranscripcion {
  motor: string
  segmentos: Segmento[]
}

export interface ProviderTranscripcion {
  nombre: ProviderSTT
  /** Diarización real por participante (mock: sí; whisper puro: no). */
  diarizacion: boolean
  transcribir(archivo: { filename: string }, onProgreso: (pct: number) => void): Promise<ResultadoTranscripcion>
}

// ─── mock (MVP): determinista, progreso realista, cero red ──────────────────

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

const providerMock: ProviderTranscripcion = {
  nombre: 'mock',
  diarizacion: true,
  async transcribir(archivo, onProgreso) {
    // Fallo VISIBLE reproducible para demo del estado de error (nunca silencioso):
    if (archivo.filename.toLowerCase().includes('error')) {
      onProgreso(12)
      await espera(600)
      throw new Error('El audio no pudo decodificarse (formato no soportado por el motor mock).')
    }
    for (const pct of [8, 21, 37, 52, 68, 83, 94]) {
      onProgreso(pct)
      await espera(420)
    }
    return { motor: 'mock', segmentos: AUDIO_DEMO.segmentos }
  },
}

// ─── transcriptor-local: adapter al Flask de altaventasllc/transcriptor ─────
// Contrato observado en su app.py: POST /upload (FormData "files") → {ids},
// GET /status → lista con {id, status, progress, text, timed_text}, líneas "[M:SS] texto".
// Sin diarización → hablante 'desconocido'; sin confianza por segmento → 0.75 fijo
// (media honesta: el motor no la reporta, no la inventamos alta).

const TRANSCRIPTOR_URL = process.env.NEXT_PUBLIC_TRANSCRIPTOR_URL ?? 'http://localhost:5000'

interface EstadoTranscriptor {
  id: string
  status: string
  progress?: number
  timed_text?: string
}

export function parsearLineasTimed(timedText: string): Segmento[] {
  // "[1:23] texto" → Segmento; finS = inicio del siguiente (última: +8s).
  const lineas = timedText.split('\n').filter((l) => l.trim().length > 0)
  const crudos = lineas
    .map((linea) => {
      const m = linea.match(/^\[(\d+):(\d{2})\]\s*(.*)$/)
      if (!m) return null
      return { inicioS: Number(m[1]) * 60 + Number(m[2]), texto: m[3] }
    })
    .filter((x): x is { inicioS: number; texto: string } => x !== null)
  return crudos.map((c, i) => ({
    inicioS: c.inicioS,
    finS: i + 1 < crudos.length ? crudos[i + 1].inicioS : c.inicioS + 8,
    hablante: 'desconocido',
    texto: c.texto,
    confianza: 0.75,
  }))
}

const providerTranscriptorLocal: ProviderTranscripcion = {
  nombre: 'transcriptor-local',
  diarizacion: false,
  async transcribir(archivo, onProgreso) {
    const respuesta = await fetch(`${TRANSCRIPTOR_URL}/upload`, {
      method: 'POST',
      body: (() => {
        const fd = new FormData()
        const f = archivo as { filename: string; blob?: Blob }
        if (!f.blob) throw new Error('transcriptor-local requiere el archivo binario (blob).')
        fd.append('files', f.blob, f.filename)
        return fd
      })(),
    })
    if (!respuesta.ok) throw new Error(`transcriptor-local respondió ${respuesta.status} al subir.`)
    const { ids } = (await respuesta.json()) as { ids: string[] }
    const id = ids[0]
    for (;;) {
      await espera(1500)
      const st = await fetch(`${TRANSCRIPTOR_URL}/status`)
      if (!st.ok) throw new Error(`transcriptor-local respondió ${st.status} en /status.`)
      const lista = (await st.json()) as EstadoTranscriptor[]
      const job = lista.find((j) => j.id === id)
      if (!job) throw new Error('transcriptor-local perdió el job (no aparece en /status).')
      onProgreso(job.progress ?? 0)
      if (job.status === 'done' && job.timed_text) {
        return { motor: 'transcriptor-local(faster-whisper)', segmentos: parsearLineasTimed(job.timed_text) }
      }
      if (job.status === 'error') throw new Error('transcriptor-local reportó error en la transcripción.')
    }
  },
}

// ─── Factory (seam) ─────────────────────────────────────────────────────────

export function crearProvider(): ProviderTranscripcion {
  switch (PROVIDER_STT) {
    case 'mock':
      return providerMock
    case 'transcriptor-local':
      return providerTranscriptorLocal
    case 'transcripcion-a2a':
      throw new Error(
        'Provider transcripcion-a2a: el servicio A2A (:4800, businessos/transcripcion-a2a) aún no está desplegado con motor real. El contrato de Segmento es idéntico — al desplegarse, este adapter se implementa sin tocar UI.'
      )
    case 'groq-whisper':
      throw new Error(
        'Provider groq-whisper: requiere GROQ_API_KEY server-side (patrón chat/transcribe de control-interno). Post-MVP.'
      )
  }
}
