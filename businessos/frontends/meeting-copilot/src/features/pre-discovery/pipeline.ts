'use client'

// Orquestador del análisis de Pre-Discovery: bloque por bloque, re-ejecutable
// (cola-friendly). Cada bloque intenta el análisis REAL (rutas /api) y ante
// 503/error cae al MOCK determinista con procedencia visible — el flujo jamás
// se rompe y la fuente de cada bloque siempre se declara. Cada corrida APPENDEA
// su costo al ledger del activo del caso (jamás se reemplaza).

import type { Bloque, BloqueId, CasoPreDiscovery, DatosSitio, DatosTecnologia } from './types'
import { ORDEN_BLOQUES } from './types'
import { mockBloque } from './mock'
import { mockEvaluacionGrafo, type EvaluacionGrafo } from './grafo'
import { escaneoRegulatorio } from './escaneo-regulatorio'
import { escaneoTecnologico } from './escaneo-tecnologico'
import { esBloqueLLM } from '@/features/agents/prompt-prediscovery'
import { usePreDiscoveryStore } from './store'
import { costearTokens, hashContenido, useActivosStore } from '@/features/activos/store'
import { useAdminPreDiscovery } from './admin-store'
import { MOTOR_AGENTE } from '@/shared/lib/config'

interface ResultadoAnalisis {
  bloque: Bloque<unknown>
  usage?: { tokensIn: number; tokensOut: number; modelo: string }
}

function conceptosRegulatorios(caso: CasoPreDiscovery): string[] {
  // Escaneo QUIRÚRGICO: no solo el giro — también los servicios Y los claims
  // observados del sitio derivan conceptos regulatorios (p. ej. "Electronics
  // AWB" observado → concepto e-AWB con su marco IATA/Montreal).
  const sitio = caso.bloques.sitio.datos as { servicios?: { texto: string }[]; claims?: { texto: string }[] } | null
  const servicios = (sitio?.servicios ?? []).slice(0, 3).map((s) => s.texto)
  const claims = (sitio?.claims ?? []).slice(0, 3).map((c) => c.texto)
  return [`Operación de ${caso.intake.giro} en ${caso.intake.pais}`, ...servicios, ...claims].slice(0, 6)
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

/** TODAS las fuentes del intake: la web + toda URL en las notas (LinkedIn, etc.). */
export function extraerUrls(caso: CasoPreDiscovery): string[] {
  const urls = new Set<string>()
  if (caso.intake.web.trim()) urls.add(caso.intake.web.trim())
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
  // /compliance, /legal…) se suman a la cola — máximo 2 extra, declarados.
  const cola = [...urls]
  const vistas = new Set(urls)
  let extrasRestantes = 2
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
  return { texto: textos.length > 0 ? textos.join('\n\n').slice(0, 18_000) : null, fuentes }
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
