// Hermes-Regulatory-Scan (adaptado): cruce DECLARADO vs ESPERADO.
// La dirección inversa del dictamen — dada la clase de servicio del lead,
// ¿qué marcos ESPERA el grafo y cuáles NO declara el sitio? El vacío es el
// hallazgo. Reglas de diseño heredadas del skill y de la doctrina del grafo:
//  · toda afirmación tiene fuente o se marca hipótesis (jamás se siembra como
//    hecho sin revisión humana)
//  · sector sin categorías en el grafo → "VACÍO DEL GRAFO", no se inventa
//  · la retroalimentación al grafo sale en modo PROPUESTA (JSONL) hacia
//    grafo/seed/reglas.json por el gate de procedencia — nunca escritura directa

import type { EvaluacionGrafo } from './grafo'
import type { CasoPreDiscovery, DatosSitio, IntakeLead } from './types'

export interface ExpectativaRegulatoria {
  categoria: string // categoría del grafo esperada para la clase de servicio
  esperadaPor: string // qué servicio/clase del lead la dispara
  estado: 'evidencia' | 'vacio' | 'hipotesis'
  severidad: 'alta' | 'media' | 'baja'
  detalle: string
  evidencia?: string
}

export interface EscaneoRegulatorio {
  sector: string | null
  cobertura: 'alta' | 'media' | 'baja'
  /** El sitio no declara NADA de lo que su sector espera. */
  opacidadAlta: boolean
  matriz: ExpectativaRegulatoria[]
  /** Sector sin categorías en el grafo → hueco DEL GRAFO (alimenta el seed). */
  vacioDelGrafo: string | null
}

// Espejo curado de las categorías del seed del grafo por SECTOR (la "ontología"
// mínima del skill, sin duplicar el seed: solo mapea clase de servicio →
// categorías esperadas). Ampliar el grafo real = canal de propuestas, no aquí.
interface DefSector {
  sector: string
  patron: RegExp
  expectativas: { categoria: string; esperadaPor: string; senal: RegExp; severidadVacio: 'alta' | 'media' | 'baja' }[]
}

const SECTORES: DefSector[] = [
  {
    sector: 'Logística / carga (freight forwarding)',
    patron: /(carga|freight|forwarder|log[ií]stic|flete|transporte|embarque)/i,
    expectativas: [
      {
        categoria: 'CARGA_AEREA_EAWB',
        esperadaPor: 'carga aérea / emisión de guía aérea (AWB)',
        senal: /(a[ée]re|air|awb|vuelo|flight|charter|hand carry|courier)/i,
        severidadVacio: 'alta',
      },
      {
        categoria: 'AUTOTRANSPORTE_CARGA',
        esperadaPor: 'transporte terrestre / agencia de carga',
        senal: /(terrestre|autotransporte|ground|road|puerta a puerta|door.to.door|cami[oó]n|flete)/i,
        severidadVacio: 'media',
      },
      {
        categoria: 'AGENTES_SEGUROS',
        esperadaPor: 'venta o intermediación de seguro de carga',
        senal: /(seguro|insurance|asegur)/i,
        severidadVacio: 'media',
      },
    ],
  },
  {
    sector: 'Intermediación de seguros',
    patron: /(seguros|insurance|correduría|broker de seguros|agente de seguros)/i,
    expectativas: [
      {
        categoria: 'AGENTES_SEGUROS',
        esperadaPor: 'intermediación de seguros',
        senal: /(seguro|insurance|p[oó]liza)/i,
        severidadVacio: 'alta',
      },
    ],
  },
  {
    sector: 'Drones / RPAS',
    patron: /(dron|drones|rpas|uav)/i,
    expectativas: [
      {
        categoria: 'DRONES_DELIVERY',
        esperadaPor: 'operación de RPAS / entregas con dron',
        senal: /(dron|rpas|uav|delivery a[ée]reo)/i,
        severidadVacio: 'alta',
      },
    ],
  },
  // Al FINAL a propósito: "legal" aparece de pasada en sitios de otros sectores
  // ("departamento legal", "aviso legal") — los sectores con señal más específica
  // ganan por orden, y "legal" lleva frontera de palabra (\b) para que "ilegales"
  // o "legalidad" no disparen el sector (hallazgo del ataque adversarial 2026-08-08).
  // Las categorías espejean el seed del grafo (SERVICIOS_LEGALES es la transversal
  // que dictamina el giro; las demás son áreas de práctica que el seed YA cubre).
  {
    sector: 'Servicios legales (bufete / despacho jurídico)',
    patron: /(bufete|despacho (de abogados|jur[ií]dico)|law ?firm|abogad|attorney|lawyer|firma legal|servicios (legales|jur[ií]dicos)|asesor[ií]a (jur[ií]dica|legal)|litig|\blegal\b)/i,
    expectativas: [
      {
        categoria: 'SERVICIOS_LEGALES',
        esperadaPor: 'operar como despacho de abogados (cédula profesional + PLD/LFPIORPI)',
        senal: /(\blegal\b|abogad|bufete|jur[ií]dic|law ?firm|attorney|lawyer|litig)/i,
        severidadVacio: 'alta',
      },
      {
        categoria: 'CONSTITUCION_SOCIEDADES',
        esperadaPor: 'práctica corporativa / constitución de sociedades',
        senal: /(corporativ|societari|constituci[oó]n de sociedad|acta constitutiva|mercantil|corporate)/i,
        severidadVacio: 'media',
      },
      {
        categoria: 'FUSION_ESCISION',
        esperadaPor: 'práctica de fusiones y adquisiciones (M&A)',
        senal: /(m&a|fusion|fusiones|adquisicion|escisi[oó]n|merger|acquisition)/i,
        severidadVacio: 'media',
      },
      {
        categoria: 'COMPRAVENTA_INMUEBLES',
        esperadaPor: 'práctica inmobiliaria',
        senal: /(inmobiliari|inmueble|bienes ra[ií]ces|real estate|property law)/i,
        severidadVacio: 'media',
      },
      {
        categoria: 'MARCAS_REGISTRO',
        esperadaPor: 'práctica de propiedad intelectual / registro de marcas',
        senal: /(propiedad intelectual|intellectual property|marca|patente|\bip\b)/i,
        severidadVacio: 'media',
      },
      {
        categoria: 'PODERES_REPRESENTACION',
        esperadaPor: 'representación legal / litigio y controversias',
        senal: /(litigio|litigation|arbitraje|arbitration|controversia|juicio|poder notarial)/i,
        severidadVacio: 'media',
      },
      {
        categoria: 'TESTAMENTOS_SUCESIONES',
        esperadaPor: 'práctica sucesoria (testamentos y herencias)',
        senal: /(testament|sucesi[oó]n|sucesori|herencia|estate planning)/i,
        severidadVacio: 'baja',
      },
    ],
  },
]

function textoObservado(intake: IntakeLead, sitio: DatosSitio | null): string {
  const partes = [
    intake.giro,
    intake.notas,
    ...(sitio?.servicios ?? []).map((s) => `${s.texto} ${s.evidencia ?? ''}`),
    ...(sitio?.claims ?? []).map((c) => `${c.texto} ${c.evidencia ?? ''}`),
  ]
  return partes.join(' \n ')
}

/** El cruce declarado-vs-esperado. Puro y determinista. */
export function escaneoRegulatorio(intake: IntakeLead, sitio: DatosSitio | null, evaluacion: EvaluacionGrafo): EscaneoRegulatorio {
  const observado = textoObservado(intake, sitio)
  const def = SECTORES.find((s) => s.patron.test(observado))

  if (!def) {
    // Regla del skill: sector sin nodos → VACÍO DEL GRAFO, jamás inventar marcos.
    return {
      sector: null,
      cobertura: 'baja',
      opacidadAlta: false,
      matriz: [],
      vacioDelGrafo: `El grafo no tiene categorías para el sector de este lead ("${intake.giro}") — VACÍO DEL GRAFO: proponer ámbito/categorías al seed (modo PROPUESTA) antes de dictaminar.`,
    }
  }

  const categoriasDictaminadas = new Set(evaluacion.conceptos.map((c) => c.categoria).filter((c): c is string => c !== null))

  const matriz: ExpectativaRegulatoria[] = def.expectativas
    .filter((e) => e.senal.test(observado) || categoriasDictaminadas.has(e.categoria))
    .map((e) => {
      if (categoriasDictaminadas.has(e.categoria)) {
        const concepto = evaluacion.conceptos.find((c) => c.categoria === e.categoria)
        return {
          categoria: e.categoria,
          esperadaPor: e.esperadaPor,
          estado: 'evidencia' as const,
          severidad: 'baja' as const,
          detalle: 'El material observado lo declara y el dictamen lo cubre con fuente citada.',
          evidencia: concepto?.descripcion,
        }
      }
      // Señal indirecta sin dictamen: marco esperado que el análisis aún no cubre.
      return {
        categoria: e.categoria,
        esperadaPor: e.esperadaPor,
        estado: (e.senal.test(observado) ? 'hipotesis' : 'vacio') as 'hipotesis' | 'vacio',
        severidad: e.severidadVacio,
        detalle: e.senal.test(observado)
          ? 'Hay señal indirecta en el material del lead, pero el dictamen no incluye esta categoría: validar en la entrevista y regenerar el análisis.'
          : 'El sector lo espera y el sitio del lead no declara nada al respecto — el vacío ES el hallazgo.',
      }
    })

  // Vacíos puros (aplican por sector aunque no haya señal): agregarlos.
  for (const e of def.expectativas) {
    if (!matriz.some((m) => m.categoria === e.categoria) && !e.senal.test(observado)) {
      matriz.push({
        categoria: e.categoria,
        esperadaPor: e.esperadaPor,
        estado: 'vacio',
        severidad: e.severidadVacio,
        detalle: 'El sector lo espera y el sitio del lead no declara nada al respecto — el vacío ES el hallazgo.',
      })
    }
  }

  const evidencias = matriz.filter((m) => m.estado === 'evidencia').length
  const cobertura: EscaneoRegulatorio['cobertura'] =
    matriz.length > 0 && evidencias / matriz.length >= 0.8 ? 'alta' : evidencias / Math.max(1, matriz.length) >= 0.4 ? 'media' : 'baja'

  return {
    sector: def.sector,
    cobertura,
    opacidadAlta: matriz.length > 0 && evidencias === 0,
    matriz,
    vacioDelGrafo: null,
  }
}

// ─── Salida sembrable (modo PROPUESTA — jamás escritura directa al grafo) ───

export interface PropuestaSeed {
  estado: 'PROPOSED'
  tipo: 'validar_regla' | 'nueva_senal' | 'nuevo_ambito'
  sector: string | null
  categoria: string | null
  motivo: string
  leadId: string
  casoId: string
  evidencia: { fuente: string; nota: string }[]
  destino: 'grafo/seed/reglas.json (revisión humana + gate de procedencia gen_seed_sql)'
  generadoAt: string
}

export function propuestasSeed(caso: CasoPreDiscovery, escaneo: EscaneoRegulatorio): PropuestaSeed[] {
  const sitio = caso.bloques.sitio.datos as DatosSitio | null
  const fuentes = (sitio?.fuentes ?? []).filter((f) => f.estado === 'leida').map((f) => ({ fuente: f.url, nota: f.detalle }))
  const base = {
    estado: 'PROPOSED' as const,
    sector: escaneo.sector,
    leadId: caso.leadId,
    casoId: caso.id,
    evidencia: fuentes,
    destino: 'grafo/seed/reglas.json (revisión humana + gate de procedencia gen_seed_sql)' as const,
    generadoAt: new Date().toISOString(),
  }
  const propuestas: PropuestaSeed[] = []
  if (escaneo.vacioDelGrafo) {
    propuestas.push({ ...base, tipo: 'nuevo_ambito', categoria: null, motivo: escaneo.vacioDelGrafo })
  }
  for (const m of escaneo.matriz) {
    if (m.estado === 'hipotesis') {
      propuestas.push({
        ...base,
        tipo: 'nueva_senal',
        categoria: m.categoria,
        motivo: `Señal indirecta de "${m.esperadaPor}" sin categoría en el dictamen: evaluar si el seed necesita keywords/regla adicionales para detectarla.`,
      })
    }
    if (m.estado === 'vacio' && m.severidad === 'alta') {
      propuestas.push({
        ...base,
        tipo: 'validar_regla',
        categoria: m.categoria,
        motivo: `Vacío de severidad alta: el sector espera ${m.categoria} (${m.esperadaPor}) y el lead no declara nada — confirmar en entrevista y cotejar la regla del seed.`,
      })
    }
  }
  return propuestas
}
