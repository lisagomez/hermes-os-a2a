// Prompter (modo asesor de Grabación): capa PURA sobre el MISMO motor de
// Guided Meeting (evaluarCoach / extraerInsights). Aquí no hay inteligencia
// nueva — solo la adaptación al contexto en-vivo: overrides manuales del
// asesor (marcar tema cubierto), rotación de preguntas (pedir otra) y el
// feed de señales. Diferencia con Guided Meeting = presentación, no motor.

import { evaluarCoach, type AlertaCoach } from '@/features/guided/coach'
import { extraerInsights } from '@/features/insights/engine'
import type {
  DimensionId,
  DimensionScore,
  HuecoDiscovery,
  Insight,
  Playbook,
  Reunion,
  Segmento,
  Transcripcion,
} from '@/features/domain/types'
import { ETIQUETA_DIMENSION } from '@/features/domain/types'

export interface OpcionesPrompter {
  /** Dimensiones que el asesor marcó cubiertas a mano (override de presentación). */
  temasCubiertosManual: DimensionId[]
  /** Preguntas ya usadas/descartadas ("pedir otra" / "marcar usada"). */
  preguntasDescartadas: string[]
}

export interface EstadoPrompter {
  dimensiones: DimensionScore[]
  total: number
  cubiertas: number
  sugerencia: HuecoDiscovery | null
  alertas: AlertaCoach[]
  senales: Insight[]
}

/** Transcripción efímera desde los segmentos vivos de la sesión. */
export function transcripcionVivo(reunionId: string, segmentos: Segmento[]): Transcripcion {
  return { id: `${reunionId}-vivo`, reunionId, motor: 'en-vivo', confianzaGlobal: 'media', contenido: '', segmentos }
}

export function estadoPrompter(
  reunion: Reunion,
  segmentos: Segmento[],
  playbook: Playbook,
  opciones: OpcionesPrompter
): EstadoPrompter {
  const transcripcion = transcripcionVivo(reunion.id, segmentos)
  const cursor = Math.max(1, segmentos.length)
  const base = segmentos.length === 0 ? null : evaluarCoach(reunion, transcripcion, playbook, cursor)

  // Overrides manuales: solo presentación — el motor sigue puro y el análisis
  // post-reunión recalcula desde los segmentos (nada se pierde ni se inventa).
  const dimensiones: DimensionScore[] = (
    base?.score.dimensiones ??
    playbook.dimensiones.map(({ dimension, peso }) => ({
      dimension,
      peso,
      estado: 'faltante' as const,
      evidencia: [],
      explicacion: 'Aún no hay conversación capturada.',
    }))
  ).map((d) =>
    opciones.temasCubiertosManual.includes(d.dimension)
      ? { ...d, estado: 'cubierta' as const, explicacion: 'Marcada como cubierta por el asesor durante la sesión.' }
      : d
  )

  const total = Math.round(
    dimensiones.reduce((acc, d) => acc + (d.estado === 'cubierta' ? d.peso : d.estado === 'parcial' ? d.peso / 2 : 0), 0)
  )

  // Sugerencia: primer hueco NO cubierto manualmente; dentro de su banco, la
  // primera pregunta no descartada ("pedir otra" rota; agotado el banco → siguiente hueco).
  let sugerencia: HuecoDiscovery | null = null
  const huecosBase = (base?.score.huecos ?? playbook.dimensiones.map(({ dimension }) => ({
    dimension,
    motivo: 'Aún no se toca en la conversación.',
    preguntaSugerida: playbook.bancoPreguntas[dimension][0],
    justificacion: `${ETIQUETA_DIMENSION[dimension]}: aún no se toca en la conversación.`,
  }))).filter((h) => !opciones.temasCubiertosManual.includes(h.dimension))

  for (const hueco of huecosBase) {
    const pregunta = playbook.bancoPreguntas[hueco.dimension].find((q) => !opciones.preguntasDescartadas.includes(q))
    if (pregunta) {
      sugerencia = { ...hueco, preguntaSugerida: pregunta }
      break
    }
  }

  // En vivo el "total" de la reunión crece con cada frase: la condición "va
  // media reunión" del coach de replay sería SIEMPRE cierta. La alerta de
  // dimensión crítica solo aplica con conversación suficiente (~12 frases).
  const MIN_SEGMENTOS_ALERTA_CRITICA = 12
  const alertas = (base?.alertas ?? []).filter((a) => {
    if (a.tipo === 'dimension_critica_pendiente') {
      if (segmentos.length < MIN_SEGMENTOS_ALERTA_CRITICA) return false
      if (opciones.temasCubiertosManual.some((d) => a.mensaje.includes(d.replaceAll('_', ' ')))) return false
    }
    return true
  })

  const senales = segmentos.length === 0 ? [] : extraerInsights(reunion, transcripcion)

  return {
    dimensiones,
    total,
    cubiertas: dimensiones.filter((d) => d.estado === 'cubierta').length,
    sugerencia,
    alertas,
    senales,
  }
}

/** Participantes stub para captura en vivo sin diarización real: el asesor
 *  atribuye con el switch ¿Quién habla?. Los nombres capturados en el modo
 *  asesor (asesor / lead) se vuelven los hablantes reales de la sesión. */
export function reunionVivoStub(
  id: string,
  titulo: string,
  nombres: { interno: string; cliente: string } = { interno: 'Yo', cliente: 'Cliente' }
): Reunion {
  return {
    id,
    titulo,
    cuenta: nombres.cliente === 'Cliente' ? 'Sesión en vivo' : nombres.cliente,
    tipoReunion: 'discovery',
    participantes: [
      { nombre: nombres.interno, rol: 'Asesor', lado: 'interno' },
      { nombre: nombres.cliente, rol: 'Lead', lado: 'cliente' },
    ],
    asesor: nombres.interno,
    fecha: new Date(0).toISOString(), // se fija al guardar la sesión
    duracionS: null,
    origen: 'audio',
    estado: 'capturada',
  }
}
