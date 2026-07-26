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

  const alertas = (base?.alertas ?? []).filter(
    (a) => !(a.tipo === 'dimension_critica_pendiente' && opciones.temasCubiertosManual.some((d) => a.mensaje.includes(d.replaceAll('_', ' '))))
  )

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
 *  atribuye con el switch ¿Quién habla? (Yo/Cliente). */
export function reunionVivoStub(id: string, titulo: string): Reunion {
  return {
    id,
    titulo,
    cuenta: 'Sesión en vivo',
    tipoReunion: 'discovery',
    participantes: [
      { nombre: 'Yo', rol: 'Asesor', lado: 'interno' },
      { nombre: 'Cliente', rol: 'Cliente', lado: 'cliente' },
    ],
    asesor: 'Yo',
    fecha: new Date(0).toISOString(), // se fija al guardar la sesión
    duracionS: null,
    origen: 'audio',
    estado: 'capturada',
  }
}
