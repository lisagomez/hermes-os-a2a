// Meeting Coach (motor rules): opera sobre el PREFIJO de segmentos revelado.
// Máximo una sugerencia y una alerta activas a la vez (SPEC §9.2).

import { calcularScore, extraerInsights } from '@/features/insights/engine'
import type { HuecoDiscovery, Playbook, Reunion, ScoreDiscovery, Transcripcion } from '@/features/domain/types'

export type TipoAlerta = 'objecion_sin_respuesta' | 'superficial' | 'dimension_critica_pendiente' | 'monologo'

export interface AlertaCoach {
  tipo: TipoAlerta
  mensaje: string
}

export interface EstadoCoach {
  score: ScoreDiscovery
  sugerencia: HuecoDiscovery | null
  /** Activas AHORA, en orden de prioridad. La UI muestra la primera de forma prominente. */
  alertas: AlertaCoach[]
}

const RESPUESTA_OBJECION = /(vale la pena|retorno|justific|entiendo tu punto|buen punto|es valido)/

function norm(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function evaluarCoach(
  reunion: Reunion,
  transcripcion: Transcripcion,
  playbook: Playbook,
  cursor: number // cantidad de segmentos revelados (1..n)
): EstadoCoach {
  const prefijo: Transcripcion = { ...transcripcion, segmentos: transcripcion.segmentos.slice(0, cursor) }
  const score = calcularScore(reunion, prefijo, playbook)
  const insights = extraerInsights(reunion, prefijo)
  const total = transcripcion.segmentos.length

  const alertas: AlertaCoach[] = []

  // 1) Objeción sin respuesta: pasaron ≥3 segmentos y nadie del equipo la trabajó.
  const lado = (h: string) => reunion.participantes.find((p) => norm(p.nombre) === norm(h))?.lado
  for (const obj of insights.filter((i) => i.categoria === 'objecion')) {
    const idx = obj.evidencia[0].segmentoIdx
    if (cursor - 1 - idx < 3) continue
    const respondida = prefijo.segmentos
      .slice(idx + 1)
      .some((s) => lado(s.hablante) === 'interno' && RESPUESTA_OBJECION.test(norm(s.texto)))
    if (!respondida) {
      alertas.push({
        tipo: 'objecion_sin_respuesta',
        mensaje: `Quedó una objeción en el aire: “${obj.texto}”. Trabájala antes de seguir avanzando.`,
      })
      break
    }
  }

  // 2) Monólogo del equipo (>90 s continuos) — coaching del momento, alta prioridad.
  const ultimo = prefijo.segmentos[cursor - 1]
  if (ultimo && lado(ultimo.hablante) === 'interno' && ultimo.finS - ultimo.inicioS > 90) {
    alertas.push({
      tipo: 'monologo',
      mensaje: `${ultimo.hablante} lleva ${Math.round(ultimo.finS - ultimo.inicioS)} s hablando sin pausa: devuelve la palabra con una pregunta.`,
    })
  }

  // 3) Discovery superficial: hay dolor pero el impacto sigue sin dimensionarse.
  const dim = (d: string) => score.dimensiones.find((x) => x.dimension === d)
  if (dim('problema')?.estado !== 'faltante' && dim('impacto')?.estado === 'faltante' && cursor >= 5) {
    alertas.push({
      tipo: 'superficial',
      mensaje: 'El cliente ya mencionó dolor y nadie lo ha dimensionado: pregunta cuánto cuesta antes de pasar a producto.',
    })
  }

  // 4) Dimensión crítica sin tocar pasada la mitad de la reunión.
  if (cursor >= total / 2) {
    const critica = playbook.dimensiones.find((d) => d.critica && dim(d.dimension)?.estado === 'faltante')
    if (critica) {
      alertas.push({
        tipo: 'dimension_critica_pendiente',
        mensaje: `Va media reunión y una dimensión crítica sigue sin tocarse: ${critica.dimension.replaceAll('_', ' ')}.`,
      })
    }
  }

  return {
    score,
    sugerencia: score.huecos[0] ?? null, // UNA sugerencia activa a la vez
    alertas, // prioridad: objeción > monólogo > superficial > crítica
  }
}
