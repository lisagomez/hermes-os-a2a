// Agentes de salida (motor rules): Follow-up Writer, CRM Notes, Executive Summary.
// Regla común: solo afirman lo que existe como insight/acción con evidencia;
// el mismo contrato de salida servirá al motor LLM (AGENT_ENGINE=llm) sin tocar UI.

import type { AnalisisReunion } from '@/features/insights/engine'
import type { Reunion, Transcripcion } from '@/features/domain/types'
import { ETIQUETA_DIMENSION, ETIQUETA_TIPO_REUNION } from '@/features/domain/types'
import { fmtFecha } from '@/shared/lib/format'

// Etapas canónicas del embudo (tabla `leads` del repo).
type EtapaEmbudo =
  | 'nuevo'
  | 'calificado'
  | 'contactado'
  | 'descubrimiento'
  | 'propuesta'
  | 'negociacion'
  | 'contrato'
  | 'onboarding'
  | 'ganado'
  | 'perdido'

function primerNombreCliente(reunion: Reunion): string {
  return reunion.participantes.find((p) => p.lado === 'cliente')?.nombre ?? 'equipo'
}

function pains(analisis: AnalisisReunion): string[] {
  return analisis.insights.filter((i) => i.categoria === 'pain').map((i) => i.texto)
}

// ─── Executive Summary ──────────────────────────────────────────────────────

export function generarResumenEjecutivo(reunion: Reunion, analisis: AnalisisReunion): string {
  const dolores = pains(analisis)
  const senales = analisis.insights.filter((i) => i.categoria === 'senal_compra')
  const objeciones = analisis.insights.filter((i) => i.categoria === 'objecion')
  const cubiertas = analisis.score.dimensiones.filter((d) => d.estado === 'cubierta').length

  const partes: string[] = []
  partes.push(
    `${ETIQUETA_TIPO_REUNION[reunion.tipoReunion]} con ${reunion.cuenta} (${fmtFecha(reunion.fecha)}). ` +
      `Discovery al ${analisis.score.total}/100: ${cubiertas} de ${analisis.score.dimensiones.length} dimensiones cubiertas.`
  )
  if (dolores.length > 0) partes.push(`Dolor principal (en palabras del cliente): “${dolores[0]}”`)
  if (senales.length > 0) partes.push(`Señales de compra: ${senales.length} (p. ej. “${senales[0].texto}”).`)
  if (objeciones.length > 0) partes.push(`Objeciones abiertas: ${objeciones.length}.`)
  if (analisis.score.huecos.length > 0)
    partes.push(`Huecos por cerrar: ${analisis.score.huecos.map((h) => ETIQUETA_DIMENSION[h.dimension]).join(', ')}.`)
  if (analisis.acciones.length > 0)
    partes.push(`Compromisos: ${analisis.acciones.map((a) => `${a.tarea} (${a.responsable ?? 'sin responsable'})`).join(' · ')}`)
  return partes.join('\n\n')
}

// ─── Follow-up Writer ───────────────────────────────────────────────────────

export function generarFollowUp(reunion: Reunion, analisis: AnalisisReunion): { asunto: string; cuerpo: string } {
  const nombre = primerNombreCliente(reunion)
  const dolores = pains(analisis).slice(0, 2)
  const lineas: string[] = []
  lineas.push(`${nombre}:`)
  lineas.push('')
  lineas.push(`Gracias por el tiempo de hoy. Le comparto lo que me llevo de la conversación para confirmar que lo entendí bien:`)
  if (dolores.length > 0) {
    lineas.push('')
    for (const d of dolores) lineas.push(`- ${d}`)
  }
  const conFecha = analisis.acciones.filter((a) => a.fechaTexto)
  const sinFecha = analisis.acciones.filter((a) => !a.fechaTexto)
  if (analisis.acciones.length > 0) {
    lineas.push('')
    lineas.push('Quedamos en lo siguiente:')
    for (const a of conFecha) lineas.push(`- ${a.tarea} (${a.responsable ?? 'por definir'}, ${a.fechaTexto})`)
    for (const a of sinFecha) lineas.push(`- ${a.tarea} (${a.responsable ?? 'por definir'})`)
  }
  const hueco = analisis.score.huecos[0]
  if (hueco) {
    lineas.push('')
    lineas.push(`Para preparar bien la siguiente conversación me ayudaría confirmar un punto: ${hueco.preguntaSugerida}`)
  }
  lineas.push('')
  lineas.push('Quedo pendiente. Saludos,')
  lineas.push(reunion.asesor)
  return { asunto: `Seguimiento — ${reunion.cuenta} · próximos pasos`, cuerpo: lineas.join('\n') }
}

// ─── CRM Notes ──────────────────────────────────────────────────────────────

export function generarCrmNotes(reunion: Reunion, analisis: AnalisisReunion): { etapaSugerida: string; justificacionEtapa: string; notas: string } {
  const dolores = pains(analisis)
  const stakeholders = analisis.stakeholders
  const presupuesto = analisis.score.dimensiones.find((d) => d.dimension === 'presupuesto')
  const urgencia = analisis.score.dimensiones.find((d) => d.dimension === 'urgencia')
  const senales = analisis.insights.filter((i) => i.categoria === 'senal_compra')

  // Sugerencia de etapa con evidencia (nunca cambia la etapa por sí sola):
  let etapaSugerida: EtapaEmbudo = 'contactado'
  let justificacionEtapa = 'Hubo contacto pero el discovery aún no aporta base suficiente.'
  if (analisis.score.total >= 70) {
    etapaSugerida = 'propuesta'
    justificacionEtapa = `Discovery al ${analisis.score.total}/100 con señales de compra: hay base para proponer.`
  } else if (analisis.score.total >= 50 || senales.length > 0) {
    etapaSugerida = 'descubrimiento'
    justificacionEtapa = `Discovery al ${analisis.score.total}/100: hay interés, faltan dimensiones por cerrar.`
  }

  const lineas: string[] = []
  lineas.push(`## ${reunion.cuenta} — ${ETIQUETA_TIPO_REUNION[reunion.tipoReunion]} (${fmtFecha(reunion.fecha)})`)
  lineas.push('')
  lineas.push(`- Asesor: ${reunion.asesor} · Score discovery: ${analisis.score.total}/100`)
  if (dolores.length > 0) {
    lineas.push(`- Pains: ${dolores.map((d) => `“${d}”`).join(' · ')}`)
  }
  if (stakeholders.length > 0) {
    lineas.push(`- Stakeholders: ${stakeholders.map((s) => `${s.nombre} (${s.rol}, ${s.influencia}${s.presente ? '' : ', no presente'})`).join(' · ')}`)
  }
  if (presupuesto) lineas.push(`- Presupuesto: ${presupuesto.explicacion}`)
  if (urgencia) lineas.push(`- Urgencia: ${urgencia.explicacion}`)
  if (analisis.acciones.length > 0) {
    lineas.push(`- Próximos pasos: ${analisis.acciones.map((a) => `${a.tarea} (${a.responsable ?? '—'}${a.fechaTexto ? `, ${a.fechaTexto}` : ''})`).join(' · ')}`)
  }
  if (analisis.riesgos.length > 0) {
    lineas.push(`- Riesgos: ${analisis.riesgos.map((r) => `${r.descripcion} [${r.severidad}]`).join(' · ')}`)
  }
  return { etapaSugerida, justificacionEtapa, notas: lineas.join('\n') }
}

// ─── Recomendaciones para la siguiente reunión (Meeting Coach, post) ────────

export function generarRecomendaciones(reunion: Reunion, analisis: AnalisisReunion, transcripcion: Transcripcion): string[] {
  const recs: string[] = []
  for (const h of analisis.score.huecos.slice(0, 3)) {
    recs.push(`Abrir con ${ETIQUETA_DIMENSION[h.dimension].toLowerCase()}: “${h.preguntaSugerida}”`)
  }
  if (analisis.score.conducta.ratioHablaInterno > 0.45) {
    recs.push(
      `Hablar menos: el equipo ocupó el ${Math.round(analisis.score.conducta.ratioHablaInterno * 100)}% del aire (ideal < 45%).`
    )
  }
  const sinResponder = analisis.insights.filter((i) => i.categoria === 'pregunta_sin_responder')
  for (const p of sinResponder.slice(0, 2)) {
    recs.push(`Retomar la pregunta que quedó sin respuesta: “${p.texto}”`)
  }
  if (analisis.score.conducta.segmentosInaudibles / transcripcion.segmentos.length > 0.2) {
    recs.push('Cuidar la captura de audio: hubo demasiados tramos inaudibles para analizar con confianza.')
  }
  return recs
}
