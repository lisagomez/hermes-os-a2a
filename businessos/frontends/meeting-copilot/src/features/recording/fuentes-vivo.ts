// Fuentes de segmentos EN VIVO para el modo asesor. Arquitectura lista para
// streaming real: cualquier fuente emite Segmento y el Prompter no distingue.
// - 'microfono': Web Speech API del navegador (transcripción en vivo REAL, es-MX;
//   sin diarización → el asesor atribuye con el switch ¿Quién habla?).
// - 'demo': reproduce la conversación demo de TransLogika (para probar el modo
//   asesor sin micrófono; etiquetada como demo en la UI).

import type { Segmento } from '@/features/domain/types'
import { AUDIO_DEMO } from '@/features/domain/fixtures'

export type FuenteVivoId = 'microfono' | 'demo'

export interface FuenteVivo {
  nombre: FuenteVivoId
  iniciar(): void
  pausar(): void
  reanudar(): void
  detener(): void
}

// ─── Tipos mínimos de Web Speech (no vienen en lib.dom por defecto) ─────────

interface ResultadoReconocimiento {
  isFinal: boolean
  0: { transcript: string; confidence: number }
}
interface EventoReconocimiento {
  resultIndex: number
  results: { length: number; [i: number]: ResultadoReconocimiento }
}
interface Reconocimiento {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: EventoReconocimiento) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start(): void
  stop(): void
}

function constructorReconocimiento(): (new () => Reconocimiento) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Reconocimiento) | null
}

export function webSpeechDisponible(): boolean {
  return constructorReconocimiento() !== null
}

export function crearFuenteMicrofono(
  onSegmento: (s: Segmento) => void,
  hablanteActual: () => string,
  onError: (mensaje: string) => void
): FuenteVivo {
  const Ctor = constructorReconocimiento()
  let activa = false
  let rec: Reconocimiento | null = null
  let inicioSesion = 0
  let inicioFrase = 0

  const arrancar = () => {
    if (!Ctor) {
      onError('Este navegador no soporta transcripción en vivo (Web Speech). Usa la fuente demo o Chrome/Edge.')
      return
    }
    rec = new Ctor()
    rec.lang = 'es-MX'
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i]
        if (!r.isFinal) continue
        const texto = r[0].transcript.trim()
        if (!texto) continue
        const ahora = (Date.now() - inicioSesion) / 1000
        onSegmento({
          inicioS: inicioFrase,
          finS: ahora,
          hablante: hablanteActual(),
          texto,
          confianza: r[0].confidence > 0 ? r[0].confidence : 0.8,
        })
        inicioFrase = ahora
      }
    }
    rec.onend = () => {
      // El reconocimiento del navegador se corta solo cada cierto tiempo: si la
      // sesión sigue activa, se re-arranca (continuidad del prompter).
      if (activa) {
        try {
          rec?.start()
        } catch {
          onError('La transcripción en vivo se interrumpió y no pudo reanudarse.')
        }
      }
    }
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        activa = false
        onError('Permiso de micrófono denegado para la transcripción en vivo.')
      } else if (e.error === 'network') {
        activa = false
        onError('La transcripción en vivo del navegador requiere conexión; cambia a la fuente demo si no la tienes.')
      }
      // 'no-speech'/'aborted' son normales: onend re-arranca.
    }
    rec.start()
  }

  return {
    nombre: 'microfono',
    iniciar() {
      activa = true
      inicioSesion = Date.now()
      inicioFrase = 0
      arrancar()
    },
    pausar() {
      activa = false
      rec?.stop()
    },
    reanudar() {
      activa = true
      arrancar()
    },
    detener() {
      activa = false
      rec?.stop()
      rec = null
    },
  }
}

export function crearFuenteDemo(onSegmento: (s: Segmento) => void): FuenteVivo {
  let idx = 0
  let timer: ReturnType<typeof setInterval> | null = null
  const tick = () => {
    if (idx >= AUDIO_DEMO.segmentos.length) {
      if (timer) clearInterval(timer)
      return
    }
    onSegmento(AUDIO_DEMO.segmentos[idx])
    idx += 1
  }
  const arrancar = () => {
    if (timer) clearInterval(timer)
    timer = setInterval(tick, 1300)
  }
  return {
    nombre: 'demo',
    iniciar: arrancar,
    pausar() {
      if (timer) clearInterval(timer)
      timer = null
    },
    reanudar: arrancar,
    detener() {
      if (timer) clearInterval(timer)
      timer = null
      idx = 0
    },
  }
}
