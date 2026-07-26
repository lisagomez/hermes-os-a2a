// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { useTranscripcionStore } from './store'
import { useAppStore } from '@/features/domain/store'
import { reunionVivoStub } from '@/features/recording/prompter'
import type { Segmento } from '@/features/domain/types'

const SEGMENTOS_VIVOS: Segmento[] = [
  { inicioS: 0, finS: 8, hablante: 'Victor', texto: 'Gracias por el tiempo, cuéntame de su operación.', confianza: 0.85 },
  { inicioS: 8, finS: 20, hablante: 'Alex (GAL)', texto: 'Necesitamos llevar un registro de la información.', confianza: 0.82 },
  { inicioS: 20, finS: 30, hablante: 'Alex (GAL)', texto: 'Cada proveedor registra la información a su manera.', confianza: 0.8 },
]

describe('cola de transcripción con sesión en vivo', () => {
  it('usa la transcripción capturada EN VIVO tal cual — jamás la demo del mock', async () => {
    const reunionBase = {
      ...reunionVivoStub('sesion-vivo', 'Discovery en vivo — Alex (GAL)', { interno: 'Victor', cliente: 'Alex (GAL)' }),
      titulo: 'Discovery en vivo — Alex (GAL)',
    }
    useTranscripcionStore.getState().agregarArchivos([
      {
        filename: 'grabacion-test.webm',
        sesion: { segmentos: SEGMENTOS_VIVOS, motor: 'en-vivo (web-speech)', reunionBase },
      },
    ])

    await vi.waitFor(() => {
      const job = useTranscripcionStore.getState().jobs.find((j) => j.filename === 'grabacion-test.webm')
      expect(job?.estado).toBe('completado')
    })

    const job = useTranscripcionStore.getState().jobs.find((j) => j.filename === 'grabacion-test.webm')
    const transcripcion = useAppStore.getState().transcripciones.find((t) => t.reunionId === job?.reunionId)
    const reunion = useAppStore.getState().reuniones.find((r) => r.id === job?.reunionId)

    expect(transcripcion?.motor).toBe('en-vivo (web-speech)')
    expect(transcripcion?.segmentos).toEqual(SEGMENTOS_VIVOS) // la conversación REAL, no la demo
    expect(reunion?.titulo).toBe('Discovery en vivo — Alex (GAL)')
    expect(reunion?.participantes.map((p) => p.nombre)).toEqual(['Victor', 'Alex (GAL)'])
  })

  it('sin sesión en vivo, el provider mock produce la demo (comportamiento documentado)', async () => {
    useTranscripcionStore.getState().agregarArchivos([{ filename: 'audio-sin-sesion.mp3' }])
    await vi.waitFor(
      () => {
        const job = useTranscripcionStore.getState().jobs.find((j) => j.filename === 'audio-sin-sesion.mp3')
        expect(job?.estado).toBe('completado')
      },
      { timeout: 10_000 }
    )
    const job = useTranscripcionStore.getState().jobs.find((j) => j.filename === 'audio-sin-sesion.mp3')
    const transcripcion = useAppStore.getState().transcripciones.find((t) => t.reunionId === job?.reunionId)
    expect(transcripcion?.motor).toBe('mock')
  }, 15_000)
})
