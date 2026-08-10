// Hermes-Tech-Stack-Scan: cruce DECLARADO vs ESPERADO tecnológico — hermano de
// escaneo-regulatorio.ts (mismo contrato de matriz). Dada la clase de negocio
// del lead, ¿qué capacidades técnicas ESPERA el mapa y cuáles se observan?
// Matiz propio de tecnología: un CLAIM ("tracking personalizado") no es un
// SISTEMA observado — señal de sistema → evidencia; claim/señal indirecta →
// hipótesis (declarado por el lead, por validar); silencio → vacío, y los
// vacíos con severidad SON las oportunidades de automatización (el pitch).
// Clase de negocio fuera del mapa → VACÍO DEL MAPA: jamás se inventa el
// estándar de una industria que no se conoce.

import type { DatosSitio, DatosTecnologia, IntakeLead } from './types'

export interface ExpectativaTecnologica {
  capacidad: string // capacidad técnica esperada para la clase de negocio
  esperadaPor: string // qué necesidad del negocio la dispara
  estado: 'evidencia' | 'vacio' | 'hipotesis'
  severidad: 'alta' | 'media' | 'baja'
  detalle: string
  evidencia?: string
}

export interface EscaneoTecnologico {
  claseNegocio: string | null
  cobertura: 'alta' | 'media' | 'baja'
  matriz: ExpectativaTecnologica[]
  /** Clase sin expectativas en el mapa curado → hueco DEL MAPA, no del lead. */
  vacioDelMapa: string | null
}

// Mapa CURADO de expectativas por clase de negocio (espejo tecnológico del
// mapa SECTORES del escaneo regulatorio — mismas clases, otra dimensión).
// Ampliarlo = propuesta revisada (modo PROPOSED), no improvisación en caliente.
interface DefClase {
  clase: string
  patron: RegExp
  expectativas: {
    capacidad: string
    esperadaPor: string
    sistema: RegExp // señal de SISTEMA observable → evidencia
    senal: RegExp // claim/señal indirecta → hipótesis
    severidadVacio: 'alta' | 'media' | 'baja'
  }[]
}

const CLASES: DefClase[] = [
  {
    clase: 'Logística / carga (freight forwarding)',
    patron: /(carga|freight|forwarder|log[ií]stic|flete|transporte|embarque)/i,
    expectativas: [
      {
        capacidad: 'TRACKING_EN_LINEA',
        esperadaPor: 'visibilidad de embarques para el cliente sin llamar',
        sistema: /(track ?& ?trace|portal de rastreo|tracking en l[ií]nea|n[uú]mero de gu[ií]a en el sitio)/i,
        senal: /(tracking|rastreo|seguimiento|torre de control|visibilidad)/i,
        severidadVacio: 'alta',
      },
      {
        capacidad: 'EDI_INTEGRACION_CARRIERS',
        esperadaPor: 'intercambio electrónico con aerolíneas/carriers (AWB, estatus)',
        // \b obligatorio: /edi/ pelado matchea el "edi" de "LinkEDIn" (bug cazado
        // en verificación visual del caso GAL — falsa evidencia de sistema EDI).
        sistema: /(\bedi\b|cargo-?imp|cargo-?xml|\bfwb\b|\bfhl\b|api de carrier)/i,
        senal: /(awb electr[oó]nica|electronics? awb|e-?awb|integraci[oó]n con aerol)/i,
        severidadVacio: 'alta',
      },
      {
        capacidad: 'PORTAL_COTIZADOR',
        esperadaPor: 'cotización/autoservicio del cliente (hoy probablemente correo + Excel)',
        sistema: /(cotizador en l[ií]nea|portal de clientes|self.?service|login de clientes)/i,
        senal: /(cotiza|quote|tarifas en l[ií]nea)/i,
        severidadVacio: 'media',
      },
    ],
  },
  {
    clase: 'Intermediación de seguros',
    patron: /(seguros|insurance|correduría|broker de seguros|agente de seguros)/i,
    expectativas: [
      {
        capacidad: 'PORTAL_POLIZAS',
        esperadaPor: 'consulta de pólizas y siniestros sin llamada',
        sistema: /(portal de p[oó]lizas|autoservicio|self.?service|app de asegurados)/i,
        senal: /(consulta tu p[oó]liza|siniestros en l[ií]nea)/i,
        severidadVacio: 'alta',
      },
      {
        capacidad: 'COTIZADOR_EN_LINEA',
        esperadaPor: 'cotización multi-aseguradora inmediata',
        sistema: /(cotizador|cotiza en l[ií]nea|comparador)/i,
        senal: /(cotiza|compara aseguradoras)/i,
        severidadVacio: 'media',
      },
    ],
  },
  {
    clase: 'Drones / RPAS',
    patron: /(dron|drones|rpas|uav)/i,
    expectativas: [
      {
        capacidad: 'GESTION_FLOTA_TELEMETRIA',
        esperadaPor: 'bitácora de vuelo, telemetría y mantenimiento de la flota',
        sistema: /(telemetr[ií]a|bit[aá]cora de vuelo|gesti[oó]n de flota|flight ?log)/i,
        senal: /(monitoreo|flota)/i,
        severidadVacio: 'alta',
      },
    ],
  },
  {
    // Espejo tecnológico del sector legal (mismas clases que el escaneo
    // regulatorio): los vacíos de esta matriz SON el pitch de una plataforma
    // legal especializada — portal de asuntos, firma electrónica, generación
    // documental y agenda en línea.
    // Mismo patrón que el sector legal del escaneo regulatorio (una sola
    // definición de "es un despacho" entre ambas dimensiones).
    clase: 'Servicios legales (despachos y firmas de abogados)',
    patron: /(bufete|despacho (de abogados|jur[ií]dico)|law ?firm|abogad|attorney|lawyer|firma legal|servicios (legales|jur[ií]dicos)|asesor[ií]a (jur[ií]dica|legal)|litig|\blegal\b)/i,
    expectativas: [
      {
        capacidad: 'PORTAL_CLIENTES_EXPEDIENTES',
        esperadaPor: 'seguimiento de asuntos/expedientes por el cliente sin llamar al despacho',
        sistema: /(portal de clientes|client portal|acceso a (su )?expediente|estatus de (su )?asunto en l[ií]nea|case management)/i,
        senal: /(expediente|seguimiento de asuntos|estatus de su caso)/i,
        severidadVacio: 'alta',
      },
      {
        capacidad: 'FIRMA_ELECTRONICA_DOCUMENTOS',
        esperadaPor: 'firma de contratos y convenios a distancia (e.firma / NOM-151)',
        sistema: /(firma electr[oó]nica|e\.?firma|docusign|nom.?151|firma digital)/i,
        senal: /(firmar? (de )?(contratos|convenios|documentos))/i,
        severidadVacio: 'alta',
      },
      {
        capacidad: 'AUTOMATIZACION_DOCUMENTAL',
        esperadaPor: 'generación de contratos/escritos repetitivos con plantillas (document assembly)',
        sistema: /(document assembly|automatizaci[oó]n documental|generador de (contratos|documentos)|plantillas (inteligentes|autom))/i,
        senal: /(elaboraci[oó]n de contratos|redacci[oó]n de contratos|machotes)/i,
        severidadVacio: 'media',
      },
      {
        capacidad: 'AGENDA_CITAS_LINEA',
        esperadaPor: 'agendar una consulta sin llamar (autoservicio del prospecto)',
        sistema: /(agenda en l[ií]nea|calendly|reserva tu cita|agendar? (tu )?cita en l[ií]nea)/i,
        senal: /(agendar|cita|consulta inicial)/i,
        severidadVacio: 'media',
      },
    ],
  },
]

function textoObservado(intake: IntakeLead, sitio: DatosSitio | null, tecnologia: DatosTecnologia | null): string {
  const partes = [
    intake.giro,
    intake.notas,
    ...(sitio?.servicios ?? []).map((s) => `${s.texto} ${s.evidencia ?? ''}`),
    ...(sitio?.claims ?? []).map((c) => `${c.texto} ${c.evidencia ?? ''}`),
    // Solo las señales de stack OBSERVADAS (hecho) cuentan como material; las
    // herramientas "probables" son inferencia y no deben auto-confirmarse.
    ...(tecnologia?.stackVisible ?? []).filter((i) => i.naturaleza === 'hecho').map((i) => `${i.texto} ${i.evidencia ?? ''}`),
  ]
  return partes.join(' \n ')
}

/** El cruce declarado-vs-esperado tecnológico. Puro y determinista. */
export function escaneoTecnologico(
  intake: IntakeLead,
  sitio: DatosSitio | null,
  tecnologia: DatosTecnologia | null
): EscaneoTecnologico {
  const observado = textoObservado(intake, sitio, tecnologia)
  const def = CLASES.find((c) => c.patron.test(observado))

  if (!def) {
    return {
      claseNegocio: null,
      cobertura: 'baja',
      matriz: [],
      vacioDelMapa: `El mapa de expectativas no cubre la clase de negocio de este lead ("${intake.giro}") — VACÍO DEL MAPA: construirlo con fuentes (referentes del sector) y proponerlo antes de opinar. El análisis queda solo-observado.`,
    }
  }

  const matriz: ExpectativaTecnologica[] = def.expectativas.map((e) => {
    const sistemaMatch = observado.match(e.sistema)
    if (sistemaMatch) {
      return {
        capacidad: e.capacidad,
        esperadaPor: e.esperadaPor,
        estado: 'evidencia' as const,
        severidad: 'baja' as const,
        detalle: 'Señal de sistema observada en el material del lead.',
        evidencia: sistemaMatch[0],
      }
    }
    const senalMatch = observado.match(e.senal)
    if (senalMatch) {
      return {
        capacidad: e.capacidad,
        esperadaPor: e.esperadaPor,
        estado: 'hipotesis' as const,
        severidad: e.severidadVacio,
        detalle: `Claim/señal indirecta ("${senalMatch[0]}") sin sistema observable: declarado por el lead, por validar en la entrevista (¿sobre qué corre?).`,
      }
    }
    return {
      capacidad: e.capacidad,
      esperadaPor: e.esperadaPor,
      estado: 'vacio' as const,
      severidad: e.severidadVacio,
      detalle: 'La clase de negocio lo espera y no hay señal alguna — oportunidad de automatización directa (anclar el pitch a este hueco).',
    }
  })

  const evidencias = matriz.filter((m) => m.estado === 'evidencia').length
  const cobertura: EscaneoTecnologico['cobertura'] =
    matriz.length > 0 && evidencias / matriz.length >= 0.8 ? 'alta' : evidencias / Math.max(1, matriz.length) >= 0.4 ? 'media' : 'baja'

  return { claseNegocio: def.clase, cobertura, matriz, vacioDelMapa: null }
}
