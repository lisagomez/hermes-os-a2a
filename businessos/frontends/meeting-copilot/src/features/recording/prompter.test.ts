import { describe, expect, it } from 'vitest'
import { estadoPrompter, reunionVivoStub } from './prompter'
import { REUNIONES_DEMO, TRANSCRIPCIONES_DEMO } from '@/features/domain/fixtures'
import { playbookPorTipo } from '@/features/playbooks/defaults'
import { evaluarCoach } from '@/features/guided/coach'

const R1 = REUNIONES_DEMO[0]
const T1 = TRANSCRIPCIONES_DEMO[0]
const pb = playbookPorTipo('discovery')
const sinOpciones = { temasCubiertosManual: [], preguntasDescartadas: [] }

describe('Prompter — paridad con Guided Meeting (mismo motor)', () => {
  it('sin overrides, el estado es EXACTAMENTE el del coach de Guided Meeting', () => {
    const prompter = estadoPrompter(R1, T1.segmentos, pb, sinOpciones)
    const guided = evaluarCoach(R1, T1, pb, T1.segmentos.length)
    expect(prompter.dimensiones).toEqual(guided.score.dimensiones)
    expect(prompter.total).toBe(guided.score.total)
    expect(prompter.sugerencia?.dimension).toBe(guided.sugerencia?.dimension)
    expect(prompter.alertas).toEqual(guided.alertas)
  })

  it('sin conversación aún: todas las dimensiones faltantes, sugerencia = primera prioridad', () => {
    const estado = estadoPrompter(reunionVivoStub('s1', 'Sesión'), [], pb, sinOpciones)
    expect(estado.total).toBe(0)
    expect(estado.dimensiones.every((d) => d.estado === 'faltante')).toBe(true)
    expect(estado.sugerencia?.dimension).toBe('problema')
    expect(estado.senales).toEqual([])
  })

  it('marcar tema cubierto lo saca de los huecos y sube el total (solo presentación)', () => {
    const antes = estadoPrompter(R1, T1.segmentos, pb, sinOpciones)
    expect(antes.sugerencia?.dimension).toBe('proceso_decision')
    const despues = estadoPrompter(R1, T1.segmentos, pb, {
      temasCubiertosManual: ['proceso_decision'],
      preguntasDescartadas: [],
    })
    expect(despues.sugerencia?.dimension).toBe('presupuesto')
    expect(despues.total).toBeGreaterThan(antes.total)
    expect(despues.dimensiones.find((d) => d.dimension === 'proceso_decision')?.estado).toBe('cubierta')
  })

  it('pedir otra pregunta rota dentro del banco y con el banco agotado pasa al siguiente hueco', () => {
    const banco = pb.bancoPreguntas.proceso_decision
    const conUnaDescartada = estadoPrompter(R1, T1.segmentos, pb, {
      temasCubiertosManual: [],
      preguntasDescartadas: [banco[0]],
    })
    expect(conUnaDescartada.sugerencia?.dimension).toBe('proceso_decision')
    expect(conUnaDescartada.sugerencia?.preguntaSugerida).toBe(banco[1])

    const agotado = estadoPrompter(R1, T1.segmentos, pb, {
      temasCubiertosManual: [],
      preguntasDescartadas: [...banco],
    })
    expect(agotado.sugerencia?.dimension).toBe('presupuesto')
  })

  it('las señales en vivo citan evidencia (regla de oro intacta)', () => {
    const estado = estadoPrompter(R1, T1.segmentos.slice(0, 8), pb, sinOpciones)
    expect(estado.senales.length).toBeGreaterThan(0)
    for (const s of estado.senales) expect(s.evidencia.length).toBeGreaterThanOrEqual(1)
  })
})
