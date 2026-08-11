'use client'

// Orquestador del análisis de Pre-Discovery: bloque por bloque, re-ejecutable
// (cola-friendly). Cada bloque intenta el análisis REAL (rutas /api) y ante
// 503/error cae al MOCK determinista con procedencia visible — el flujo jamás
// se rompe y la fuente de cada bloque siempre se declara. Cada corrida APPENDEA
// su costo al ledger del activo del caso (jamás se reemplaza).

import type { Bloque, BloqueId, CasoPreDiscovery, DatosSitio, DatosTecnologia } from './types'
import { type SalidaEnriquecimiento, normalizarEnriquecimiento } from './enriquecimiento'
import { ORDEN_BLOQUES } from './types'
import { mockBloque } from './mock'
import { mockEvaluacionGrafo, type EvaluacionGrafo } from './grafo'
import { escaneoRegulatorio } from './escaneo-regulatorio'
import { escaneoTecnologico } from './escaneo-tecnologico'
import { esBloqueLLM } from '@/features/agents/prompt-prediscovery'
import { usePreDiscoveryStore } from './store'
import { useAppStore } from '@/features/domain/store'
import { costearTokens, hashContenido, useActivosStore } from '@/features/activos/store'
import { useAdminPreDiscovery } from './admin-store'
import { MOTOR_AGENTE } from '@/shared/lib/config'

interface ResultadoAnalisis {
  bloque: Bloque<unknown>
  usage?: { tokensIn: number; tokensOut: number; modelo: string }
}

export const MAX_CONCEPTOS_REGULATORIOS = 6

export function conceptosRegulatorios(caso: CasoPreDiscovery): string[] {
  // Escaneo QUIRÚRGICO: no solo el giro — también los servicios Y los claims
  // observados del sitio derivan conceptos regulatorios (p. ej. "Electronics
  // AWB" observado → concepto e-AWB con su marco IATA/Montreal).
  //
  // Los SERVICIOS mandan: son la actividad regulada. Los claims solo rellenan
  // los huecos que queden, porque suelen ser marketing sin contenido normativo
  // — un despacho con 15 servicios listados gastaba la mitad de sus 6 espacios
  // en "Más de 50 años de experiencia" y "Laborando desde hace dos
  // generaciones", que el grafo no puede sino declarar `dudoso`.
  const sitio = caso.bloques.sitio.datos as { servicios?: { texto: string }[]; claims?: { texto: string }[] } | null
  const conceptos = [`Operación de ${caso.intake.giro} en ${caso.intake.pais}`]
  for (const s of sitio?.servicios ?? []) {
    if (conceptos.length >= MAX_CONCEPTOS_REGULATORIOS) break
    conceptos.push(s.texto)
  }
  for (const c of sitio?.claims ?? []) {
    if (conceptos.length >= MAX_CONCEPTOS_REGULATORIOS) break
    conceptos.push(c.texto)
  }
  return conceptos
}

async function analizarBloqueReal(caso: CasoPreDiscovery, bloque: BloqueId, textoSitio: string | null): Promise<ResultadoAnalisis> {
  const ahora = new Date().toISOString()

  if (bloque === 'regulatorio') {
    const conceptos = conceptosRegulatorios(caso)
    const respuesta = await fetch('/api/grafo/evaluaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contexto: { jurisdiccion: 'MX', dimension: 'regulatorio', regimen: 'GENERAL', fecha: null },
        conceptos: conceptos.map((descripcion) => ({ descripcion, importe: null })),
      }),
    })
    if (!respuesta.ok) {
      const data = (await respuesta.json().catch(() => ({}))) as { error?: string }
      // Fallback declarado: mock FIEL del grafo (mismo fail-safe y citas).
      const evaluacion = mockEvaluacionGrafo(conceptos, 'regulatorio')
      return {
        bloque: {
          estado: evaluacion.estado === 'dudoso' ? 'no_concluyente' : 'listo',
          datos: evaluacion,
          confianza: 'media',
          procedencia: { metodo: 'mock', fuente: `mock fiel del grafo (${data.error ?? `HTTP ${respuesta.status}`})` },
          requiereValidacion: ['Revisar con el grafo real y un especialista los temas marcados dudoso'],
          error: null,
          generadoAt: ahora,
        },
      }
    }
    const evaluacion = (await respuesta.json()) as EvaluacionGrafo
    return {
      bloque: {
        estado: evaluacion.estado === 'dudoso' ? 'no_concluyente' : 'listo',
        datos: evaluacion,
        confianza: 'alta',
        procedencia: { metodo: 'observado', fuente: 'grafo regulatorio (dictamen con fuentes citadas)' },
        requiereValidacion: evaluacion.estado === 'dudoso' ? ['Dictamen dudoso: requiere revisión posterior'] : [],
        error: null,
        generadoAt: ahora,
      },
    }
  }

  if (bloque === 'enriquecimiento') {
    // Waterfall por fuentes públicas (RFC → DENUE → gate 69-B → patrón de
    // dominio) detrás de su gate. Sin servicio no hay bloque: el catch de
    // correrBloque cae al mock DECLARADO, que no inventa contacto alguno.
    //
    const lead = useAppStore.getState().leads.find((l) => l.leadId === caso.leadId)
    const respuesta = await fetch('/api/pre-discovery/enriquecer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpoEnriquecimiento(caso, lead)),
    })
    const data = (await respuesta.json().catch(() => ({}))) as { datos?: SalidaEnriquecimiento; error?: string }
    if (!respuesta.ok || !data.datos) throw new Error(data.error ?? `HTTP ${respuesta.status}`)
    const datos = normalizarEnriquecimiento(caso.leadId, data.datos)
    const hayBloqueo = datos.bloqueos.length > 0
    return {
      bloque: {
        // Un gate que bloquea NO es un error: es el sistema haciendo su trabajo,
        // y el asesor tiene que verlo como hallazgo, no como fallo.
        estado: datos.hallazgos.length === 0 && hayBloqueo ? 'no_concluyente' : 'listo',
        datos,
        confianza: datos.hallazgos.some((h) => h.veredicto === 'confirmado') ? 'alta' : 'media',
        procedencia: { metodo: 'observado', fuente: 'waterfall de fuentes públicas (RFC · DENUE · 69-B CFF · patrón de dominio)' },
        requiereValidacion: [
          ...datos.bloqueos.map((b) => `Bloqueado por el gate regulatorio: ${b.concepto} — ${b.razon}`),
          ...(datos.gate69b && !datos.gate69b.pasa ? [`Gate 69-B CFF sin superar: ${datos.gate69b.razon}`] : []),
          ...datos.hallazgos.filter((h) => h.veredicto !== 'confirmado').map((h) => `Dato NO confirmado (${h.fuente}): ${h.campo} = ${h.valor}`),
        ],
        error: null,
        generadoAt: ahora,
      },
    }
  }

  if (!esBloqueLLM(bloque)) throw new Error(`Bloque desconocido: ${bloque}`)

  const respuesta = await fetch('/api/pre-discovery/analizar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bloque,
      intake: caso.intake,
      textoSitio: textoSitio ?? undefined,
      perfilPrevio: bloque !== 'perfil' ? caso.bloques.perfil.datos : undefined,
      competenciaPrevia: ['diferenciacion', 'foda', 'brief'].includes(bloque) ? caso.bloques.competencia.datos : undefined,
      bloquesPrevios: bloque === 'brief' ? { foda: caso.bloques.foda.datos, diferenciacion: caso.bloques.diferenciacion.datos } : undefined,
    }),
  })
  const data = (await respuesta.json().catch(() => ({}))) as {
    datos?: unknown
    degradados?: number
    modelo?: string
    usage?: { tokensIn: number; tokensOut: number }
    error?: string
  }
  if (!respuesta.ok || data.datos === undefined) {
    throw new Error(data.error ?? `HTTP ${respuesta.status}`)
  }
  const requiereValidacion =
    (data.degradados ?? 0) > 0 ? [`${data.degradados} afirmación(es) sin evidencia degradadas a hipótesis`] : []
  return {
    bloque: {
      estado: 'listo',
      datos: data.datos,
      confianza: textoSitio ? 'alta' : 'media',
      procedencia: {
        metodo: textoSitio && (bloque === 'sitio' || bloque === 'perfil') ? 'observado' : 'inferido',
        fuente: textoSitio ? `sitio del lead + IA (${data.modelo})` : `IA sobre el intake (${data.modelo})`,
        modelo: data.modelo,
      },
      requiereValidacion,
      error: null,
      generadoAt: ahora,
    },
    usage: data.usage && data.modelo ? { ...data.usage, modelo: data.modelo } : undefined,
  }
}

/** TODAS las fuentes del intake: la web, el LinkedIn del contacto y toda URL en
 *  las notas. El campo `linkedin` tiene su propia casilla en el formulario: si no
 *  se incluye aquí, se captura y nunca se lee. Lo que resulte bloqueado (LinkedIn
 *  suele responder 999) se DECLARA como fuente bloqueada, no se omite. */
/** RFC mexicano (persona moral o física) si el asesor lo dejó en las notas.
 *  Además de la forma, la fecha embebida (AAMMDD) debe ser plausible: sin eso,
 *  un folio interno tipo "REF123456ABC" viajaría como RFC al waterfall y podría
 *  traer datos de un tercero equivocado (forma válida ≠ dato válido). */
export function extraerRfc(notas: string): string | undefined {
  for (const m of notas.toUpperCase().matchAll(/\b[A-ZÑ&]{3,4}(\d{2})(\d{2})(\d{2})[A-Z0-9]{3}\b/g)) {
    const mes = Number(m[2])
    const dia = Number(m[3])
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) return m[0]
  }
  return undefined
}

/** Petición al waterfall de enriquecimiento: TODO lo que el intake sabe — la
 *  EMPRESA real del lead (no el giro: buscar "Legal" en RFC/DENUE no devuelve
 *  nada), el nombre del contacto, y el RFC si viene en las notas. Pura y
 *  testeable: es el contrato con /api/pre-discovery/enriquecer. */
export function cuerpoEnriquecimiento(
  caso: CasoPreDiscovery,
  lead: { empresa: string; contacto: string } | undefined
): Record<string, unknown> {
  const rfc = extraerRfc(caso.intake.notas)
  return {
    leadId: caso.leadId,
    empresa: lead?.empresa || caso.intake.giro,
    contacto: lead?.contacto || caso.intake.email,
    telefono: caso.intake.telefono,
    ...(rfc ? { rfc } : {}),
    campos: ['email', 'telefono', 'razon_social'],
  }
}

export function extraerUrls(caso: CasoPreDiscovery): string[] {
  const urls = new Set<string>()
  if (caso.intake.web.trim()) urls.add(caso.intake.web.trim())
  if (caso.intake.linkedin?.trim()) urls.add(caso.intake.linkedin.trim())
  for (const m of caso.intake.notas.matchAll(/https?:\/\/[^\s)"'·]+/g)) {
    urls.add(m[0].replace(/[.,;]+$/, ''))
  }
  return [...urls]
}

/** Compila TODAS las fuentes (web + perfiles): texto agregado + estado por fuente.
 *  Lo bloqueado o fallido se DECLARA — jamás se oculta ni se inventa. */
async function compilarFuentes(caso: CasoPreDiscovery): Promise<{ texto: string | null; fuentes: import('./types').FuenteCompilada[] }> {
  const urls = extraerUrls(caso)
  const fuentes: import('./types').FuenteCompilada[] = []
  const textos: string[] = []
  // Escaneo quirúrgico: los enlaces internos relevantes del sitio (/services,
  // /compliance, /areas-de-practica…) se suman a la cola — hasta 5 extra,
  // declarados. Con 2, un sitio con áreas de práctica + equipo + aviso de
  // privacidad dejaba fuera justo las páginas con la señal.
  const cola = [...urls]
  const vistas = new Set(urls)
  let extrasRestantes = 5
  for (let i = 0; i < cola.length; i++) {
    const url = cola[i]
    try {
      const respuesta = await fetch('/api/pre-discovery/sitio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = (await respuesta.json()) as { texto?: string; titulo?: string; error?: string; enlacesRelevantes?: string[] }
      if (respuesta.ok && data.texto) {
        textos.push(`=== ${url} ===\n${data.titulo ?? ''}\n${data.texto}`.trim())
        fuentes.push({ url, estado: 'leida', detalle: `${data.texto.length.toLocaleString()} caracteres` })
        for (const enlace of data.enlacesRelevantes ?? []) {
          if (extrasRestantes > 0 && !vistas.has(enlace)) {
            vistas.add(enlace)
            cola.push(enlace)
            extrasRestantes--
          }
        }
      } else {
        const bloqueada = /999|403|login|sesi[oó]n|denied/i.test(data.error ?? '')
        fuentes.push({ url, estado: bloqueada ? 'bloqueada' : 'error', detalle: data.error ?? `HTTP ${respuesta.status}` })
      }
    } catch (e) {
      fuentes.push({ url, estado: 'error', detalle: e instanceof Error ? e.message : String(e) })
    }
  }
  // 24k: por debajo del tope del contrato del API (25k) y suficiente para
  // home + 5 páginas internas de un sitio corporativo típico.
  return { texto: textos.length > 0 ? textos.join('\n\n').slice(0, 24_000) : null, fuentes }
}

/** Asegura el activo del caso y appendea el costo de una corrida al ledger. */
async function registrarCostoCorrida(
  casoId: string,
  usage: { tokensIn: number; tokensOut: number; modelo: string } | undefined,
  esMock: boolean,
  origen: string
): Promise<void> {
  const casos = usePreDiscoveryStore.getState()
  const activos = useActivosStore.getState()
  const caso = casos.casos.find((c) => c.id === casoId)
  if (!caso) return
  const hash = await hashContenido(caso.bloques)
  let activoId = caso.activoId
  const existente = activoId ? activos.activos.find((a) => a.id === activoId) : undefined
  if (!activoId || !existente) {
    activoId = activos.registrarActivo({
      clase: 'pre_discovery',
      tipo: 'datos',
      nombre: `Pre-Discovery — ${caso.intake.giro}`,
      ubicacion: `meeting-copilot://caso/${caso.id}`,
      ejeDei: useAdminPreDiscovery.getState().ejeDeiOrigen, // clasificación EN ORIGEN (config del módulo)
      refs: { leadId: caso.leadId, casoId: caso.id, reunionId: null },
      hash,
      origen,
    })
    casos.setActivoId(caso.id, activoId)
  } else {
    activos.nuevaVersion(activoId, hash, origen)
  }
  if (usage) {
    const { montoUsd, fuente } = costearTokens(usage.tokensIn, usage.tokensOut, usage.modelo, useAdminPreDiscovery.getState().tarifas)
    activos.appendCosto({ activoId, componente: 'tokens', tokensIn: usage.tokensIn, tokensOut: usage.tokensOut, modelo: usage.modelo, montoUsd, fuente })
  } else if (esMock) {
    activos.appendCosto({ activoId, componente: 'tokens', montoUsd: 0, fuente: 'estimado_mock (análisis demo, sin llamadas reales)' })
  }
}

/** Corre UN bloque (real → fallback mock). Reutilizable para "regenerar". */
export async function correrBloque(casoId: string, bloque: BloqueId, textoSitio: string | null): Promise<void> {
  const store = usePreDiscoveryStore.getState()
  const caso = store.casos.find((c) => c.id === casoId)
  if (!caso) return
  store.actualizarBloque(casoId, bloque, { ...caso.bloques[bloque], estado: 'analizando', error: null })

  let resultado: ResultadoAnalisis
  let esMock = false
  try {
    if (MOTOR_AGENTE !== 'llm' && bloque !== 'regulatorio') throw new Error('AGENT_ENGINE=rules: análisis demo')
    const casoFresco = usePreDiscoveryStore.getState().casos.find((c) => c.id === casoId)
    resultado = await analizarBloqueReal(casoFresco ?? caso, bloque, textoSitio)
    esMock = resultado.bloque.procedencia?.metodo === 'mock'
  } catch (e) {
    // Fallback VISIBLE: el mock declara por qué entró.
    const motivo = e instanceof Error ? e.message : String(e)
    const mock = mockBloque(bloque, caso.intake)
    resultado = {
      bloque: { ...mock, procedencia: { metodo: 'mock', fuente: `${mock.procedencia?.fuente ?? 'demo'} — motivo: ${motivo}` } },
    }
    esMock = true
  }

  // Hermes-Regulatory-Scan: al dictamen (cualquier camino: grafo/mock/fallback)
  // se le adjunta el cruce DECLARADO vs ESPERADO — el vacío también es hallazgo.
  if (bloque === 'regulatorio' && resultado.bloque.datos) {
    const evaluacion = resultado.bloque.datos as EvaluacionGrafo
    const casoActual = usePreDiscoveryStore.getState().casos.find((c) => c.id === casoId) ?? caso
    const escaneo = escaneoRegulatorio(casoActual.intake, casoActual.bloques.sitio.datos as DatosSitio | null, evaluacion)
    resultado.bloque = {
      ...resultado.bloque,
      datos: { ...evaluacion, escaneo },
      requiereValidacion: [
        ...resultado.bloque.requiereValidacion,
        ...escaneo.matriz.filter((m) => m.estado !== 'evidencia').map((m) => `Marco esperado sin evidencia (${m.estado}): ${m.categoria} — ${m.esperadaPor}`),
        ...(escaneo.vacioDelGrafo ? [escaneo.vacioDelGrafo] : []),
      ],
    }
  }

  // Hermes-Tech-Stack-Scan: mismo cruce, dimensión tecnológica — los vacíos con
  // severidad son las oportunidades de automatización (el pitch se ancla ahí).
  if (bloque === 'tecnologia' && resultado.bloque.datos) {
    const datos = resultado.bloque.datos as DatosTecnologia
    const casoActual = usePreDiscoveryStore.getState().casos.find((c) => c.id === casoId) ?? caso
    const escaneo = escaneoTecnologico(casoActual.intake, casoActual.bloques.sitio.datos as DatosSitio | null, datos)
    resultado.bloque = {
      ...resultado.bloque,
      datos: { ...datos, escaneo },
      requiereValidacion: [
        ...resultado.bloque.requiereValidacion,
        ...escaneo.matriz.filter((m) => m.estado === 'hipotesis').map((m) => `Capacidad declarada sin sistema observable: ${m.capacidad} — validar en entrevista sobre qué corre`),
        ...(escaneo.vacioDelMapa ? [escaneo.vacioDelMapa] : []),
      ],
    }
  }

  usePreDiscoveryStore.getState().actualizarBloque(casoId, bloque, resultado.bloque)
  useAdminPreDiscovery.getState().log('regenerar_bloque', `caso:${casoId} bloque:${bloque} (${esMock ? 'mock' : 'real'})`)
  await registrarCostoCorrida(casoId, resultado.usage, esMock, `caso:${casoId} bloque:${bloque}`)
}

/** Corre el pipeline completo en orden (perfil → … → brief), compilando ANTES
 *  todas las fuentes del intake (web + perfiles de redes en las notas). */
export async function correrPipeline(casoId: string): Promise<void> {
  const caso = usePreDiscoveryStore.getState().casos.find((c) => c.id === casoId)
  if (!caso) return
  const { texto: textoSitio, fuentes } =
    MOTOR_AGENTE === 'llm' ? await compilarFuentes(caso) : { texto: null, fuentes: [] as import('./types').FuenteCompilada[] }
  for (const bloque of ORDEN_BLOQUES) {
    await correrBloque(casoId, bloque, textoSitio)
  }
  // El estado de la compilación queda PLASMADO en el bloque sitio (fuente por fuente).
  if (fuentes.length > 0) {
    const casoFinal = usePreDiscoveryStore.getState().casos.find((c) => c.id === casoId)
    const bloqueSitio = casoFinal?.bloques.sitio
    if (casoFinal && bloqueSitio?.datos) {
      const noLeidas = fuentes.filter((f) => f.estado !== 'leida')
      usePreDiscoveryStore.getState().actualizarBloque(casoId, 'sitio', {
        ...bloqueSitio,
        datos: { ...(bloqueSitio.datos as object), fuentes },
        requiereValidacion: [
          ...bloqueSitio.requiereValidacion,
          ...noLeidas.map((f) => `Fuente no compilada (${f.estado}): ${f.url} — ${f.detalle}`),
        ],
      })
    }
  }
}
