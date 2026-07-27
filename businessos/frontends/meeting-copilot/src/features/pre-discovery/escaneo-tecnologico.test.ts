import { describe, expect, it } from 'vitest'
import { escaneoTecnologico } from './escaneo-tecnologico'
import type { DatosSitio, DatosTecnologia, IntakeLead } from './types'

const intakeForwarder: IntakeLead = {
  telefono: '',
  email: '',
  web: 'https://lead.mx',
  tamano: '11-50',
  giro: 'Agencia de carga / logística (freight forwarder)',
  pais: 'México',
  notas: '',
}

const sitioGalLike: DatosSitio = {
  servicios: [{ texto: 'Air freight a 230 países', naturaleza: 'hecho', evidencia: 'sitio' }],
  propuestaValor: { texto: 'Carga crítica', naturaleza: 'hecho' },
  claims: [
    { texto: 'Tracking personalizado de tus embarques', naturaleza: 'hecho', evidencia: 'sitio' },
    { texto: 'Elaborate Electronics AWB for you', naturaleza: 'hecho', evidencia: 'sitio' },
  ],
  segmentosObjetivo: [],
  madurezDigital: { nivel: 'media', senales: [] },
  vacios: [],
}

const tecnologiaVacia: DatosTecnologia = {
  stackVisible: [],
  madurezDigital: 'baja',
  herramientasProbables: [],
  oportunidadesAutomatizacion: [],
}

describe('escaneoTecnologico — cruce DECLARADO vs ESPERADO (Hermes-Tech-Stack-Scan)', () => {
  it('claims sin sistema observable → hipótesis (declarado, por validar), y el portal ausente → vacío: el pitch de GAL', () => {
    const e = escaneoTecnologico(intakeForwarder, sitioGalLike, tecnologiaVacia)
    expect(e.claseNegocio).toContain('Logística')
    const por = Object.fromEntries(e.matriz.map((m) => [m.capacidad, m.estado]))
    expect(por.TRACKING_EN_LINEA).toBe('hipotesis') // "tracking personalizado" es claim, no sistema
    expect(por.EDI_INTEGRACION_CARRIERS).toBe('hipotesis') // "Electronics AWB" es señal indirecta
    expect(por.PORTAL_COTIZADOR).toBe('vacio') // nadie lo menciona: oportunidad directa
    expect(e.cobertura).toBe('baja')
  })

  it('señal de SISTEMA observada → evidencia con cita del match', () => {
    const sitioConSistema: DatosSitio = {
      ...sitioGalLike,
      claims: [{ texto: 'Consulta tu embarque en nuestro portal de rastreo Track & Trace', naturaleza: 'hecho', evidencia: 'sitio' }],
    }
    const e = escaneoTecnologico(intakeForwarder, sitioConSistema, tecnologiaVacia)
    const tracking = e.matriz.find((m) => m.capacidad === 'TRACKING_EN_LINEA')
    expect(tracking?.estado).toBe('evidencia')
    expect(tracking?.evidencia).toBeTruthy()
  })

  it('el vacío lleva severidad y se lee como oportunidad de automatización', () => {
    const e = escaneoTecnologico(intakeForwarder, { ...sitioGalLike, claims: [], servicios: [] }, tecnologiaVacia)
    const edi = e.matriz.find((m) => m.capacidad === 'EDI_INTEGRACION_CARRIERS')
    expect(edi?.estado).toBe('vacio')
    expect(edi?.severidad).toBe('alta')
    expect(edi?.detalle).toContain('oportunidad de automatización')
  })

  it('honestidad del material: un stackVisible INFERIDO (hipótesis) no se auto-confirma como evidencia', () => {
    const tecnologiaInferida: DatosTecnologia = {
      ...tecnologiaVacia,
      stackVisible: [{ texto: 'Probablemente intercambio EDI Cargo-IMP con carriers', naturaleza: 'hipotesis' }],
    }
    const sinSenales: DatosSitio = { ...sitioGalLike, claims: [], servicios: [] }
    const e = escaneoTecnologico(intakeForwarder, sinSenales, tecnologiaInferida)
    expect(e.matriz.find((m) => m.capacidad === 'EDI_INTEGRACION_CARRIERS')?.estado).toBe('vacio')

    // …y el mismo texto como HECHO observado sí cuenta como sistema:
    const tecnologiaObservada: DatosTecnologia = {
      ...tecnologiaVacia,
      stackVisible: [{ texto: 'Intercambio EDI Cargo-IMP con carriers', naturaleza: 'hecho', evidencia: 'sitio' }],
    }
    const e2 = escaneoTecnologico(intakeForwarder, sinSenales, tecnologiaObservada)
    expect(e2.matriz.find((m) => m.capacidad === 'EDI_INTEGRACION_CARRIERS')?.estado).toBe('evidencia')
  })

  it('regex con frontera de palabra: "LinkedIn" en las notas NO es evidencia de sistema EDI (bug GAL)', () => {
    const intakeConLinkedIn = { ...intakeForwarder, notas: 'LinkedIn empresa: https://www.linkedin.com/company/x/' }
    const e = escaneoTecnologico(intakeConLinkedIn, sitioGalLike, tecnologiaVacia)
    expect(e.matriz.find((m) => m.capacidad === 'EDI_INTEGRACION_CARRIERS')?.estado).toBe('hipotesis')
  })

  it('clase de negocio fuera del mapa → VACÍO DEL MAPA, jamás se inventa el estándar de la industria', () => {
    const intakeDental = { ...intakeForwarder, giro: 'clínica dental' }
    const e = escaneoTecnologico(intakeDental, null, null)
    expect(e.claseNegocio).toBeNull()
    expect(e.matriz).toEqual([])
    expect(e.vacioDelMapa).toContain('VACÍO DEL MAPA')
  })

  it('todo observado como sistema → cobertura alta', () => {
    const sitioMaduro: DatosSitio = {
      ...sitioGalLike,
      claims: [
        { texto: 'Portal de rastreo Track & Trace', naturaleza: 'hecho', evidencia: 'sitio' },
        { texto: 'Integración EDI Cargo-XML con aerolíneas', naturaleza: 'hecho', evidencia: 'sitio' },
        { texto: 'Cotizador en línea para clientes', naturaleza: 'hecho', evidencia: 'sitio' },
      ],
    }
    const e = escaneoTecnologico(intakeForwarder, sitioMaduro, tecnologiaVacia)
    expect(e.matriz.every((m) => m.estado === 'evidencia')).toBe(true)
    expect(e.cobertura).toBe('alta')
  })
})
