// Motor DETERMINISTA de análisis de discovery (AGENT_ENGINE=rules).
// Regla de oro: todo insight cita evidencia (segmento) y ninguna dimensión se
// marca sin explicar el porqué. Mismo input → mismo output → mismo porqué.

import type {
  Accion,
  CategoriaInsight,
  ConductaLlamada,
  DimensionId,
  DimensionScore,
  EstadoDimension,
  Evidencia,
  HuecoDiscovery,
  Insight,
  NodoStakeholder,
  Participante,
  Playbook,
  Reunion,
  RiesgoDeal,
  ScoreDiscovery,
  Segmento,
  Transcripcion,
} from '@/features/domain/types'
import { ETIQUETA_DIMENSION, UMBRAL_INAUDIBLE } from '@/features/domain/types'
import { ORDEN_PRIORIDAD } from '@/features/playbooks/defaults'
import { fmtTiempo } from '@/shared/lib/format'

export interface AnalisisReunion {
  insights: Insight[]
  score: ScoreDiscovery
  acciones: Accion[]
  riesgos: RiesgoDeal[]
  stakeholders: NodoStakeholder[]
}

// ─── Normalización ──────────────────────────────────────────────────────────

function norm(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const NUMEROS =
  /\d|\b(un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|veinte|treinta|cuarenta|cincuenta|ochenta|cien|ciento|mil|millon)\b/

// ─── Léxicos (es-MX) ────────────────────────────────────────────────────────

const LEX = {
  pain: /(perdemos|se nos cae|se nos caen|se nos complica|nos duele|batallamos|retrabajo|cuello de botella|cotizamos lento|tardamos|a mano|desorden|nos falla|caido|reconciliar)/,
  causa: /(porque|ya que|cada vez que|debido a)/,
  impacto: /(nos cuesta|cuesta como|nos pega|nos afecta|penalizacion|horas en)/,
  urgenciaPlazo: /(antes de (que\s+)?\w+|para (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|este (mes|trimestre|ano)|temporada alta|cuanto antes|proxima semana|fin de mes)/,
  urgenciaVaga: /(nos urge|urgente|pronto|lo antes posible)/,
  decisorQuien: /(la toma|lo decide|decide el|decide la|autoriza|da el visto bueno)/,
  decisorComo: /(comite|proceso de compra|corporativo|pasos|se aprueba|firma)/,
  stakeholderMencion: /(director general|directora general|mi jefa|mi jefe|el dueno|la duena|finanzas|compras|corporativo|mi socio|sistemas)/,
  presupuestoMonto: /(\$|mil (pesos|dolares)|usd|pesos al mes|dolares al mes)/,
  presupuestoSenal: /(partida|presupuesto|tope aprobado|rango de inversion)/,
  herramientaUsa: /(trabajamos con|usamos|lo llevamos en|llevamos en|sistema que se llama|con un contador)/,
  competidorEvalua: /(estamos evaluando|estamos viendo|cotizamos con|comparando con)/,
  proximoPaso: /(quedamos en|te mando|te envio|agendamos|te busco|te comparto|les mando|le aviso)/,
  fechaTexto:
    /(el (lunes|martes|miercoles|jueves|viernes|sabado|domingo)(\s+\d+)?|(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s+\d+|manana|proxima semana|primera semana de \w+|el \d+ de \w+|fin de mes)/,
  objetivo: /(nuestro objetivo|nuestra meta|queremos (crecer|lograr|llegar|duplicar)|buscamos (crecer|reducir|mejorar))/,
  necesidadExplicita: /(necesitamos|requerimos|nos hace falta)/,
  necesidadImplicita: /(seria ideal|nos gustaria|estaria bien|ayudaria mucho)/,
  riesgo: /(nos preocupa|me preocupa|riesgo|no estamos seguros|nos da miedo|quedemos a medias)/,
  objecion: /(se me hace caro|es caro|muy caro|el precio|no tenemos tiempo|no se si tengamos|ya intentamos|no creo que|no lo adopta|dificil de implementar)/,
  senalCompra: /(nos interesa|mandanos la propuesta|mandame la (propuesta|cotizacion)|cuanto (cuesta|tardaria)|cuando podriamos empezar|como seria la implementacion|aparte el espacio)/,
  evasiva: /(tendria que revisar|luego te digo|no sabria decir|no me se los pasos|dejame verlo|eso lo veria|tendria que preguntar|tendria que revisarlo)/,
  preguntaAbierta: /^(que|como|cual|cuanto|cuanta|cuantos|por que|para cuando|quien|cuentame|platicame|y (que|como|cuanto|en tiempos))/,
} as const

// ─── Utilidades ─────────────────────────────────────────────────────────────

function evidenciaDe(segmentos: Segmento[], idx: number): Evidencia {
  const s = segmentos[idx]
  const cita = s.texto.length > 140 ? `${s.texto.slice(0, 137)}…` : s.texto
  return { segmentoIdx: idx, inicioS: s.inicioS, cita }
}

function ladoDe(hablante: string, participantes: Participante[]): 'interno' | 'cliente' | 'desconocido' {
  const p = participantes.find((x) => norm(x.nombre) === norm(hablante))
  return p ? p.lado : 'desconocido'
}

interface Ctx {
  reunion: Reunion
  segmentos: Segmento[]
  /** [idx, lado, textoNormalizado] solo de segmentos audibles */
  filas: { idx: number; lado: 'interno' | 'cliente' | 'desconocido'; t: string }[]
}

// ─── Extracción de insights ─────────────────────────────────────────────────

export function extraerInsights(reunion: Reunion, transcripcion: Transcripcion): Insight[] {
  const segmentos = transcripcion.segmentos
  const filas = segmentos
    .map((s, idx) => ({ idx, lado: ladoDe(s.hablante, reunion.participantes), t: norm(s.texto) }))
    .filter((f) => segmentos[f.idx].confianza >= UMBRAL_INAUDIBLE)
  const ctx: Ctx = { reunion, segmentos, filas }
  const insights: Insight[] = []
  let n = 0
  const agregar = (
    categoria: CategoriaInsight,
    idx: number,
    texto: string,
    confianza: 'alta' | 'media' = 'alta',
    extra?: Record<string, string>
  ) => {
    n += 1
    insights.push({
      id: `${reunion.id}-i${n}`,
      reunionId: reunion.id,
      categoria,
      texto,
      evidencia: [evidenciaDe(segmentos, idx)],
      confianza,
      extra,
    })
  }

  for (const { idx, lado, t } of ctx.filas) {
    const original = segmentos[idx].texto
    if (lado === 'cliente') {
      if (LEX.pain.test(t)) agregar('pain', idx, original, 'alta', LEX.causa.test(t) ? { causa: 'explicada' } : undefined)
      // El "impacto" no es categoría de insight aparte: vive como evidencia de la
      // dimensión impacto del score (evaluarDimension).
      if (LEX.objetivo.test(t)) agregar('objetivo', idx, original)
      if (LEX.necesidadExplicita.test(t)) agregar('necesidad_explicita', idx, original)
      if (LEX.necesidadImplicita.test(t)) agregar('necesidad_implicita', idx, original, 'media')
      if (LEX.riesgo.test(t)) agregar('riesgo', idx, original)
      if (LEX.objecion.test(t)) agregar('objecion', idx, original)
      if (LEX.herramientaUsa.test(t)) agregar('herramienta_actual', idx, original, 'alta', { estado: 'en uso' })
      if (LEX.competidorEvalua.test(t)) agregar('competidor', idx, original, 'alta', { estado: 'en evaluación' })
      if (LEX.presupuestoMonto.test(t) || LEX.presupuestoSenal.test(t))
        agregar('presupuesto', idx, original, LEX.presupuestoMonto.test(t) ? 'alta' : 'media')
      if (LEX.urgenciaPlazo.test(t) || LEX.urgenciaVaga.test(t))
        agregar('urgencia', idx, original, LEX.urgenciaPlazo.test(t) ? 'alta' : 'media')
      if (LEX.decisorQuien.test(t) || LEX.decisorComo.test(t)) agregar('proceso_decision', idx, original)
      if (LEX.senalCompra.test(t)) agregar('senal_compra', idx, original)
      if (LEX.stakeholderMencion.test(t)) agregar('stakeholder', idx, original, 'media', { origen: 'mencionado' })
    }
    if (LEX.proximoPaso.test(t)) {
      const fecha = t.match(LEX.fechaTexto)
      agregar('proximo_paso', idx, original, 'alta', fecha ? { fechaTexto: fecha[0] } : undefined)
    }
  }

  // Preguntas sin responder: pregunta del lado interno seguida de evasiva del cliente.
  for (let i = 0; i < ctx.filas.length - 1; i += 1) {
    const fila = ctx.filas[i]
    const siguiente = ctx.filas[i + 1]
    if (fila.lado === 'interno' && segmentos[fila.idx].texto.includes('?') && LEX.evasiva.test(siguiente.t)) {
      const insight: Insight = {
        id: `${reunion.id}-q${fila.idx}`,
        reunionId: reunion.id,
        categoria: 'pregunta_sin_responder',
        texto: segmentos[fila.idx].texto,
        evidencia: [evidenciaDe(segmentos, fila.idx), evidenciaDe(segmentos, siguiente.idx)],
        confianza: 'alta',
      }
      insights.push(insight)
    }
  }

  return insights
}

// ─── Dimensiones del score ──────────────────────────────────────────────────

interface EvalDimension {
  estado: EstadoDimension
  evidencia: Evidencia[]
  explicacion: string
  motivoHueco: string
}

function evaluarDimension(dimension: DimensionId, ctx: Ctx): EvalDimension {
  const { segmentos } = ctx
  const cliente = ctx.filas.filter((f) => f.lado === 'cliente')
  const todas = ctx.filas
  const ev = (idxs: number[]) => idxs.map((i) => evidenciaDe(segmentos, i))

  switch (dimension) {
    case 'problema': {
      const conCausa = cliente.filter((f) => LEX.pain.test(f.t) && LEX.causa.test(f.t))
      const simples = cliente.filter((f) => LEX.pain.test(f.t))
      if (conCausa.length > 0)
        return {
          estado: 'cubierta',
          evidencia: ev(conCausa.map((f) => f.idx)),
          explicacion: 'El cliente describió el problema y su causa.',
          motivoHueco: '',
        }
      if (simples.length > 0)
        return {
          estado: 'parcial',
          evidencia: ev(simples.map((f) => f.idx).slice(0, 2)),
          explicacion: 'Hay dolor mencionado, pero sin causa ni contexto que lo explique.',
          motivoHueco: 'El pain se mencionó sin explorar su causa.',
        }
      return { estado: 'faltante', evidencia: [], explicacion: 'No se identificó ningún problema del cliente.', motivoHueco: 'No se habló del problema.' }
    }
    case 'impacto': {
      const cuant = cliente.filter((f) => LEX.impacto.test(f.t) && NUMEROS.test(f.t))
      const cual = cliente.filter((f) => LEX.impacto.test(f.t))
      if (cuant.length > 0)
        return { estado: 'cubierta', evidencia: ev(cuant.map((f) => f.idx)), explicacion: 'El impacto está dimensionado con cifras.', motivoHueco: '' }
      if (cual.length > 0)
        return {
          estado: 'parcial',
          evidencia: ev(cual.map((f) => f.idx)),
          explicacion: 'El cliente reconoce impacto pero sin dimensionarlo.',
          motivoHueco: 'El impacto se mencionó sin cifras (dinero, horas, %).',
        }
      return { estado: 'faltante', evidencia: [], explicacion: 'Nadie cuantificó (ni mencionó) el costo del problema.', motivoHueco: 'No se validó cuánto cuesta el problema.' }
    }
    case 'urgencia': {
      const plazo = cliente.filter((f) => LEX.urgenciaPlazo.test(f.t))
      const vaga = cliente.filter((f) => LEX.urgenciaVaga.test(f.t))
      if (plazo.length > 0)
        return { estado: 'cubierta', evidencia: ev(plazo.map((f) => f.idx)), explicacion: 'Hay un plazo o disparador explícito.', motivoHueco: '' }
      if (vaga.length > 0)
        return {
          estado: 'parcial',
          evidencia: ev(vaga.map((f) => f.idx)),
          explicacion: 'Hay deseo de resolver, pero sin fecha ni disparador.',
          motivoHueco: 'La urgencia quedó sin plazo concreto.',
        }
      return { estado: 'faltante', evidencia: [], explicacion: 'No se detectó urgencia ni plazo.', motivoHueco: 'No se validó para cuándo lo necesitan.' }
    }
    case 'proceso_decision': {
      const quien = cliente.filter((f) => LEX.decisorQuien.test(f.t))
      const como = cliente.filter((f) => LEX.decisorComo.test(f.t))
      if (quien.length > 0 && como.length > 0)
        return {
          estado: 'cubierta',
          evidencia: ev([...quien, ...como].map((f) => f.idx)),
          explicacion: 'Se sabe quién decide y cómo se aprueba.',
          motivoHueco: '',
        }
      if (quien.length > 0 || como.length > 0)
        return {
          estado: 'parcial',
          evidencia: ev([...quien, ...como].map((f) => f.idx)),
          explicacion: quien.length > 0 ? 'Se sabe quién decide, pero no el mecanismo de aprobación.' : 'Se conoce el mecanismo, pero no quién decide.',
          motivoHueco: quien.length > 0 ? 'Falta el mecanismo de aprobación (pasos, comité, firma).' : 'Falta identificar al decisor.',
        }
      return { estado: 'faltante', evidencia: [], explicacion: 'El proceso de decisión no se tocó.', motivoHueco: 'No se preguntó cómo deciden una compra así.' }
    }
    case 'stakeholders': {
      const presentes = ctx.reunion.participantes.filter((p) => p.lado === 'cliente')
      const menciones = cliente.filter((f) => LEX.stakeholderMencion.test(f.t))
      const decisorConfirmado = cliente.some((f) => LEX.decisorQuien.test(f.t))
      const total = presentes.length + menciones.length
      const evidencia = ev(menciones.map((f) => f.idx))
      if (total >= 2 && decisorConfirmado)
        return { estado: 'cubierta', evidencia, explicacion: `${total} stakeholders identificados, con decisor confirmado.`, motivoHueco: '' }
      if (total >= 1)
        return {
          estado: 'parcial',
          evidencia,
          explicacion: `${total} stakeholder(s) identificados, sin decisor confirmado.`,
          motivoHueco: 'Falta confirmar quién es el decisor.',
        }
      return { estado: 'faltante', evidencia: [], explicacion: 'No se identificaron stakeholders.', motivoHueco: 'No se mapeó quién participa en la decisión.' }
    }
    case 'presupuesto': {
      // El monto solo cuenta en contexto de presupuesto: una cifra de impacto
      // ("nos cuesta 80 mil pesos") NO es presupuesto disponible.
      const senal = cliente.filter((f) => LEX.presupuestoSenal.test(f.t))
      const monto = senal.filter((f) => LEX.presupuestoMonto.test(f.t))
      if (monto.length > 0)
        return { estado: 'cubierta', evidencia: ev(monto.map((f) => f.idx)), explicacion: 'Hay monto o rango explícito.', motivoHueco: '' }
      if (senal.length > 0)
        return {
          estado: 'parcial',
          evidencia: ev(senal.map((f) => f.idx)),
          explicacion: 'Hay señal de presupuesto (partida/tope) sin monto.',
          motivoHueco: 'Existe partida pero no se validó el rango.',
        }
      return { estado: 'faltante', evidencia: [], explicacion: 'El presupuesto no se tocó.', motivoHueco: 'No se habló de presupuesto ni rango de inversión.' }
    }
    case 'competencia': {
      const conEstado = cliente.filter((f) => LEX.herramientaUsa.test(f.t) || LEX.competidorEvalua.test(f.t))
      if (conEstado.length > 0)
        return {
          estado: 'cubierta',
          evidencia: ev(conEstado.map((f) => f.idx)),
          explicacion: 'Se conocen las herramientas actuales / alternativas y su estado.',
          motivoHueco: '',
        }
      return { estado: 'faltante', evidencia: [], explicacion: 'No se exploró con qué resuelven esto hoy.', motivoHueco: 'No se preguntó por herramientas actuales ni competidores.' }
    }
    case 'proximos_pasos': {
      const pasos = todas.filter((f) => LEX.proximoPaso.test(f.t))
      const conFecha = pasos.filter((f) => LEX.fechaTexto.test(f.t))
      if (conFecha.length > 0)
        return { estado: 'cubierta', evidencia: ev(conFecha.map((f) => f.idx)), explicacion: 'Hay siguiente paso con responsable y fecha.', motivoHueco: '' }
      if (pasos.length > 0)
        return {
          estado: 'parcial',
          evidencia: ev(pasos.map((f) => f.idx)),
          explicacion: 'Hay siguiente paso, pero sin fecha comprometida.',
          motivoHueco: 'El siguiente paso quedó sin fecha.',
        }
      return { estado: 'faltante', evidencia: [], explicacion: 'La reunión cerró sin siguiente paso.', motivoHueco: 'No se acordó ningún siguiente paso.' }
    }
  }
}

// ─── Score + huecos + conducta ──────────────────────────────────────────────

export function calcularScore(reunion: Reunion, transcripcion: Transcripcion, playbook: Playbook): ScoreDiscovery {
  const segmentos = transcripcion.segmentos
  const filas = segmentos
    .map((s, idx) => ({ idx, lado: ladoDe(s.hablante, reunion.participantes), t: norm(s.texto) }))
    .filter((f) => segmentos[f.idx].confianza >= UMBRAL_INAUDIBLE)
  const ctx: Ctx = { reunion, segmentos, filas }

  const dimensiones: DimensionScore[] = playbook.dimensiones.map(({ dimension, peso }) => {
    const r = evaluarDimension(dimension, ctx)
    return { dimension, peso, estado: r.estado, evidencia: r.evidencia, explicacion: r.explicacion }
  })

  const total = Math.round(
    dimensiones.reduce((acc, d) => acc + (d.estado === 'cubierta' ? d.peso : d.estado === 'parcial' ? d.peso / 2 : 0), 0)
  )

  const huecos: HuecoDiscovery[] = ORDEN_PRIORIDAD.filter((dim) => playbook.dimensiones.some((d) => d.dimension === dim))
    .map((dim) => ({ dim, r: evaluarDimension(dim, ctx) }))
    .filter(({ r }) => r.estado !== 'cubierta')
    .map(({ dim, r }) => ({
      dimension: dim,
      motivo: r.motivoHueco,
      preguntaSugerida: playbook.bancoPreguntas[dim][0],
      justificacion: `${ETIQUETA_DIMENSION[dim]}: ${r.motivoHueco}`,
    }))

  const duracionInterno = filas
    .filter((f) => f.lado === 'interno')
    .reduce((a, f) => a + (segmentos[f.idx].finS - segmentos[f.idx].inicioS), 0)
  const duracionTotal = filas.reduce((a, f) => a + (segmentos[f.idx].finS - segmentos[f.idx].inicioS), 0)
  const conducta: ConductaLlamada = {
    ratioHablaInterno: duracionTotal > 0 ? Number((duracionInterno / duracionTotal).toFixed(2)) : 0,
    preguntasAbiertas: filas.filter((f) => f.lado === 'interno' && segmentos[f.idx].texto.includes('?') && LEX.preguntaAbierta.test(f.t.replace(/^¿/, ''))).length,
    segmentosInaudibles: segmentos.filter((s) => s.confianza < UMBRAL_INAUDIBLE).length,
  }

  return { reunionId: reunion.id, total, dimensiones, conducta, huecos }
}

// ─── Acciones (shape tareas_reunion) ────────────────────────────────────────

export function extraerAcciones(reunion: Reunion, transcripcion: Transcripcion): Accion[] {
  const acciones: Accion[] = []
  transcripcion.segmentos.forEach((s, idx) => {
    if (s.confianza < UMBRAL_INAUDIBLE) return
    const t = norm(s.texto)
    if (!LEX.proximoPaso.test(t)) return
    const fecha = t.match(LEX.fechaTexto)
    acciones.push({
      id: `T${acciones.length + 1}`,
      reunionId: reunion.id,
      tarea: s.texto,
      responsable: s.hablante,
      fechaLimite: null,
      fechaTexto: fecha ? fecha[0] : null,
      fuente: `${s.hablante} [${fmtTiempo(s.inicioS)}]`,
      estado: 'pendiente',
    })
    void idx
  })
  return acciones
}

// ─── Riesgos (Risk Reviewer, reglas fijas) ──────────────────────────────────

export function evaluarRiesgos(score: ScoreDiscovery, insights: Insight[]): RiesgoDeal[] {
  const riesgos: RiesgoDeal[] = []
  const dim = (d: DimensionId) => score.dimensiones.find((x) => x.dimension === d)
  const haySenalCompra = insights.some((i) => i.categoria === 'senal_compra')

  const sinProceso = dim('proceso_decision')
  if (sinProceso && sinProceso.estado !== 'cubierta')
    riesgos.push({
      tipo: 'proceso_desconocido',
      severidad: haySenalCompra ? 'alta' : 'media',
      descripcion: haySenalCompra
        ? 'Hay interés de compra pero el proceso de decisión no está mapeado: el deal puede morir en la aprobación.'
        : 'No se conoce el proceso de decisión completo.',
      evidencia: sinProceso.evidencia,
      mitigacion: 'Valida quién autoriza y qué pasos siguen antes de enviar propuesta.',
    })

  const sinPresupuesto = dim('presupuesto')
  if (sinPresupuesto && sinPresupuesto.estado === 'faltante')
    riesgos.push({
      tipo: 'sin_presupuesto',
      severidad: 'media',
      descripcion: 'No hay evidencia de presupuesto disponible.',
      evidencia: [],
      mitigacion: 'Pregunta por partida o rango de inversión en el siguiente contacto.',
    })

  const sinUrgencia = dim('urgencia')
  if (sinUrgencia && sinUrgencia.estado === 'faltante')
    riesgos.push({
      tipo: 'sin_urgencia',
      severidad: 'media',
      descripcion: 'Sin plazo ni disparador, el deal tiende a posponerse indefinidamente.',
      evidencia: [],
      mitigacion: 'Identifica un evento que marque el plazo (temporada, cierre, auditoría).',
    })

  const competidores = insights.filter((i) => i.categoria === 'competidor')
  if (competidores.length > 0)
    riesgos.push({
      tipo: 'competidor_activo',
      severidad: 'media',
      descripcion: 'El cliente está evaluando alternativas en paralelo.',
      evidencia: competidores.flatMap((i) => i.evidencia),
      mitigacion: 'Prepara comparativo honesto y valida el criterio de decisión.',
    })

  const objeciones = insights.filter((i) => i.categoria === 'objecion')
  if (objeciones.length > 0)
    riesgos.push({
      tipo: 'objecion_sin_respuesta',
      severidad: objeciones.length > 1 ? 'alta' : 'media',
      descripcion: `${objeciones.length} objeción(es) registradas; revisa cuáles quedaron sin respuesta sólida.`,
      evidencia: objeciones.flatMap((i) => i.evidencia),
      mitigacion: 'Responde cada objeción con evidencia en el follow-up.',
    })

  if (score.total < 50)
    riesgos.push({
      tipo: 'discovery_incompleto',
      severidad: 'alta',
      descripcion: `El discovery está al ${score.total}/100: avanzar a propuesta con esta base es apostar a ciegas.`,
      evidencia: [],
      mitigacion: 'Agenda una segunda llamada de discovery antes de proponer.',
    })

  return riesgos
}

// ─── Stakeholder Mapper ─────────────────────────────────────────────────────

export function mapearStakeholders(reunion: Reunion, insights: Insight[]): NodoStakeholder[] {
  const nodos: NodoStakeholder[] = reunion.participantes
    .filter((p) => p.lado === 'cliente')
    .map((p) => ({ nombre: p.nombre, rol: p.rol, presente: true, influencia: 'usuario', evidencia: [] }))

  const procesos = insights.filter((i) => i.categoria === 'proceso_decision')
  for (const i of insights.filter((x) => x.categoria === 'stakeholder')) {
    const m = norm(i.texto).match(LEX.stakeholderMencion)
    if (!m) continue
    const rol = m[0]
    if (nodos.some((nd) => norm(nd.rol).includes(rol))) continue
    // Si el proceso de decisión nombra al decisor, la mención hereda esa influencia.
    const esDecisor = procesos.some((p) => norm(p.texto).includes(rol))
    nodos.push({ nombre: rol, rol, presente: false, influencia: esDecisor ? 'decisor' : 'desconocida', evidencia: i.evidencia })
  }
  return nodos
}

// ─── Orquestación + caché ───────────────────────────────────────────────────

const cache = new Map<string, AnalisisReunion>()

export function analizarReunion(reunion: Reunion, transcripcion: Transcripcion, playbook: Playbook): AnalisisReunion {
  const clave = `${transcripcion.id}:${playbook.id}:${playbook.dimensiones.map((d) => `${d.dimension}${d.peso}`).join()}`
  const previo = cache.get(clave)
  if (previo) return previo

  const insights = extraerInsights(reunion, transcripcion)
  const score = calcularScore(reunion, transcripcion, playbook)
  const acciones = extraerAcciones(reunion, transcripcion)
  const riesgos = evaluarRiesgos(score, insights)
  const stakeholders = mapearStakeholders(reunion, insights)
  const resultado: AnalisisReunion = { insights, score, acciones, riesgos, stakeholders }
  cache.set(clave, resultado)
  return resultado
}
