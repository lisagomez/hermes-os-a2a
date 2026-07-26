import { describe, expect, it } from 'vitest'
import { CAPACIDADES_INICIALES, detectarCapacidades, type VentanaCapaz } from './capacidades'

/** Ventana de un navegador moderno; cada caso quita lo que quiere probar. */
function ventana(parcial: Partial<VentanaCapaz> = {}): VentanaCapaz {
  return {
    MediaRecorder: class {},
    SpeechRecognition: class {},
    navigator: { mediaDevices: {} },
    ...parcial,
  }
}

describe('detectarCapacidades', () => {
  it('sin ventana (render del servidor) no reporta ninguna capacidad', () => {
    expect(detectarCapacidades(undefined)).toEqual({ grabacion: false, micVivo: false })
  })

  it('navegador moderno: grabación y micrófono en vivo', () => {
    expect(detectarCapacidades(ventana())).toEqual({ grabacion: true, micVivo: true })
  })

  it('sin MediaRecorder no hay grabación aunque haya mediaDevices', () => {
    expect(detectarCapacidades(ventana({ MediaRecorder: undefined })).grabacion).toBe(false)
  })

  it('sin mediaDevices no hay grabación aunque exista MediaRecorder', () => {
    expect(detectarCapacidades(ventana({ navigator: {} })).grabacion).toBe(false)
  })

  it('acepta el prefijo webkit para Web Speech (Safari/Chrome)', () => {
    const safari = ventana({ SpeechRecognition: undefined, webkitSpeechRecognition: class {} })
    expect(detectarCapacidades(safari).micVivo).toBe(true)
  })

  it('sin Web Speech no hay transcripción en vivo, pero la grabación sigue viva', () => {
    const sinWebSpeech = ventana({ SpeechRecognition: undefined })
    expect(detectarCapacidades(sinWebSpeech)).toEqual({ grabacion: true, micVivo: false })
  })
})

describe('invariante de hidratación', () => {
  // El HTML del servidor y el render de hidratación usan esta constante — nunca
  // la detección. Si dejara de ser optimista, la vista serviría la tarjeta de
  // "navegador no soportado" y el cliente la reemplazaría: mismatch.
  it('el primer render asume soporte, sin consultar el navegador', () => {
    expect(CAPACIDADES_INICIALES).toEqual({ grabacion: true, micVivo: true })
    expect(CAPACIDADES_INICIALES).not.toEqual(detectarCapacidades(undefined))
  })
})
