import { beforeEach, describe, expect, it } from 'vitest'
import { useLiveStore } from './live-store'
import type { Segmento } from '@/features/domain/types'

const seg = (inicioS: number, finS: number): Segmento => ({
  inicioS,
  finS,
  hablante: 'Cliente',
  texto: 'Perdemos embarques cada mes.',
  confianza: 0.9,
})

describe('live-store — "La usé" vs "Otra pregunta" (semánticas distintas)', () => {
  beforeEach(() => {
    useLiveStore.getState().resetSesion()
  })

  it('"La usé" deja constancia en la bitácora de sesión (timestamp) Y avanza la rotación', () => {
    useLiveStore.getState().registrarPreguntaUsada('¿Qué se les complica hoy?', 'problema')
    const st = useLiveStore.getState()
    expect(st.preguntasUsadas).toHaveLength(1)
    expect(st.preguntasUsadas[0].pregunta).toBe('¿Qué se les complica hoy?')
    expect(st.preguntasUsadas[0].dimension).toBe('problema')
    expect(new Date(st.preguntasUsadas[0].timestampISO).getTime()).not.toBeNaN()
    // Avanza igual que un descarte: el prompter no vuelve a sugerir la misma.
    expect(st.preguntasDescartadas).toContain('¿Qué se les complica hoy?')
  })

  it('registra el segundo de la conversación si hay segmentos capturados (null si no)', () => {
    useLiveStore.getState().registrarPreguntaUsada('¿Quién decide?', 'proceso_decision')
    expect(useLiveStore.getState().preguntasUsadas[0].enSegundoS).toBeNull()

    useLiveStore.getState().resetSesion()
    useLiveStore.getState().agregarSegmento(seg(0, 10))
    useLiveStore.getState().agregarSegmento(seg(10, 23.4))
    useLiveStore.getState().registrarPreguntaUsada('¿Quién decide?', 'proceso_decision')
    expect(useLiveStore.getState().preguntasUsadas[0].enSegundoS).toBe(23)
  })

  it('"Otra pregunta" (descartar) solo rota: NO deja constancia de uso', () => {
    useLiveStore.getState().descartarPregunta('¿Presupuesto asignado?')
    const st = useLiveStore.getState()
    expect(st.preguntasDescartadas).toContain('¿Presupuesto asignado?')
    expect(st.preguntasUsadas).toHaveLength(0)
  })

  it('usar dos veces la misma pregunta no duplica la constancia', () => {
    useLiveStore.getState().registrarPreguntaUsada('¿Qué pasa si no lo resuelven?', 'problema')
    useLiveStore.getState().registrarPreguntaUsada('¿Qué pasa si no lo resuelven?', 'problema')
    expect(useLiveStore.getState().preguntasUsadas).toHaveLength(1)
  })

  it('resetSesion limpia la bitácora de preguntas usadas', () => {
    useLiveStore.getState().registrarPreguntaUsada('¿Qué se les complica hoy?', 'problema')
    useLiveStore.getState().resetSesion()
    expect(useLiveStore.getState().preguntasUsadas).toHaveLength(0)
    expect(useLiveStore.getState().preguntasDescartadas).toHaveLength(0)
  })
})
