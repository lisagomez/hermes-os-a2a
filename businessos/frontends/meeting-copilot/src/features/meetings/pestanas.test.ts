import { describe, expect, it } from 'vitest'
import { ETIQUETA_ORIGEN_REUNION, type OrigenReunion } from '@/features/domain/types'
import { pestanasDeReunion } from './pestanas'

const ORIGENES_CON_AUDIO: OrigenReunion[] = ['audio', 'texto', 'virtual']

describe('pestanasDeReunion', () => {
  it.each(ORIGENES_CON_AUDIO)('una reunión %s conserva las cuatro vistas de análisis', (origen) => {
    expect(pestanasDeReunion(origen).map((p) => p.seg)).toEqual([
      'transcripcion',
      'insights',
      'guiada',
      'resumen',
    ])
  })

  // El motivo no es cosmético: `VistaReunion` corta con "procesa su audio en
  // Voice Transcription" cuando falta la transcripción. En una reunión de
  // audio ese aviso es transitorio; en una presencial sería permanente y
  // falso, porque nunca va a haber audio que procesar.
  it('una reunión presencial no ofrece las vistas que dependen de la transcripción', () => {
    const segs = pestanasDeReunion('presencial').map((p) => p.seg)
    expect(segs).not.toContain('transcripcion')
    expect(segs).not.toContain('insights')
    expect(segs).not.toContain('guiada')
    expect(segs).not.toContain('resumen')
  })

  it('una reunión presencial ofrece la captura de contactos', () => {
    expect(pestanasDeReunion('presencial').map((p) => p.seg)).toEqual(['gafetes'])
  })

  it('ninguna pestaña sale sin etiqueta ni sin segmento de ruta', () => {
    for (const origen of [...ORIGENES_CON_AUDIO, 'presencial'] as OrigenReunion[]) {
      for (const p of pestanasDeReunion(origen)) {
        expect(p.seg).toMatch(/^[a-z]+$/)
        expect(p.etiqueta.trim().length).toBeGreaterThan(0)
      }
    }
  })
})

describe('ETIQUETA_ORIGEN_REUNION', () => {
  // El `Record` ya obliga a TypeScript a exigir la etiqueta de cada origen; esto
  // caza el descuido de dejarla vacía o repetida para salir del paso.
  it('cada origen tiene una etiqueta propia y no vacía', () => {
    const etiquetas = Object.values(ETIQUETA_ORIGEN_REUNION)
    expect(etiquetas.every((e) => e.trim().length > 0)).toBe(true)
    expect(new Set(etiquetas).size).toBe(etiquetas.length)
  })

  it('el origen presencial está nombrado', () => {
    expect(ETIQUETA_ORIGEN_REUNION.presencial).toBe('Presencial')
  })
})
