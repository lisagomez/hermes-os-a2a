import { describe, expect, it } from 'vitest'
import { NucleoDiarizador, detectarPitch } from './diarizacion'

function seno(hz: number, sampleRate = 16000, n = 2048, amplitud = 0.3): Float32Array {
  const buf = new Float32Array(n)
  for (let i = 0; i < n; i += 1) buf[i] = amplitud * Math.sin((2 * Math.PI * hz * i) / sampleRate)
  return buf
}

describe('detectarPitch (autocorrelación)', () => {
  it('detecta el F0 de tonos en el rango de voz', () => {
    for (const hz of [110, 165, 220]) {
      const detectado = detectarPitch(seno(hz), 16000)
      expect(detectado).not.toBeNull()
      expect(Math.abs((detectado as number) - hz) / hz).toBeLessThan(0.06)
    }
  })

  it('silencio o ruido de baja energía → null (no adivina)', () => {
    expect(detectarPitch(new Float32Array(2048), 16000)).toBeNull()
    expect(detectarPitch(seno(220, 16000, 2048, 0.001), 16000)).toBeNull()
  })
})

describe('NucleoDiarizador (clustering online de 2 voces)', () => {
  it('la primera frase con voz calibra al asesor; una voz distinta se vuelve el cliente', () => {
    const d = new NucleoDiarizador()
    expect(d.asignarFrase(120)).toBe('interno') // calibración: quien abre la llamada
    expect(d.asignarFrase(210)).toBe('cliente') // voz claramente distinta
    expect(d.asignarFrase(118)).toBe('interno')
    expect(d.asignarFrase(205)).toBe('cliente')
  })

  it('la misma voz con variación pequeña sigue siendo el asesor (no inventa un cliente)', () => {
    const d = new NucleoDiarizador()
    d.asignarFrase(120)
    expect(d.asignarFrase(128)).toBe('interno') // +6%: dentro del margen
  })

  it('sin voz clara → desconocido (fallback al modo manual, nunca adivina)', () => {
    const d = new NucleoDiarizador()
    expect(d.asignarFrase(null)).toBe('desconocido')
    d.asignarFrase(120)
    expect(d.asignarFrase(null)).toBe('desconocido')
  })

  it('la corrección humana re-aprende: tras corregir, frases similares van al lado correcto', () => {
    const d = new NucleoDiarizador()
    d.asignarFrase(140) // calibra interno
    // Voz del cliente parecida (150 Hz) cae mal como interno la primera vez:
    expect(d.asignarFrase(150)).toBe('interno')
    // El asesor corrige: esa frase era del cliente.
    d.corregir(150, 'cliente')
    // Las siguientes frases a ~152 Hz ya se asignan al cliente.
    expect(d.asignarFrase(152)).toBe('cliente')
  })
})
