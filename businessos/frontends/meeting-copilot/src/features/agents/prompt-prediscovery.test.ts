import { describe, expect, it } from 'vitest'
import { construirUsuarioBloque, validarBloqueIA } from './prompt-prediscovery'
import type { IntakeLead } from '@/features/pre-discovery/types'

const INTAKE: IntakeLead = {
  telefono: '+52 81 5555 0142',
  email: 'alex@galmexico.example',
  web: 'https://galmexico.example',
  tamano: '11-50',
  giro: 'Agencia de carga (freight forwarder)',
  pais: 'México',
  notas: 'Interesa digitalizar cotización',
}

describe('construirUsuarioBloque', () => {
  it('incluye intake y texto del sitio cuando existe', () => {
    const p = construirUsuarioBloque('sitio', { intake: INTAKE, textoSitio: 'Ofrecemos flete marítimo FCL y LCL.' })
    expect(p).toContain('freight forwarder')
    expect(p).toContain('flete marítimo FCL')
  })

  it('sin sitio, instruye a no marcar hechos fuera del intake', () => {
    const p = construirUsuarioBloque('foda', { intake: INTAKE })
    expect(p).toContain('SIN TEXTO DEL SITIO')
  })
})

describe('validarBloqueIA — la IA propone, el contrato verifica', () => {
  it('acepta un bloque válido', () => {
    const r = validarBloqueIA('foda', {
      fortalezas: [{ texto: 'Opera flete marítimo FCL', naturaleza: 'hecho', evidencia: 'Ofrecemos flete marítimo FCL' }],
      oportunidades: [{ texto: 'Nearshoring', naturaleza: 'hipotesis' }],
      debilidades: [],
      amenazas: [],
    })
    expect(r).not.toBeNull()
    expect(r?.degradados).toBe(0)
  })

  it('degrada a hipótesis un "hecho" sin evidencia (y lo cuenta)', () => {
    const r = validarBloqueIA('foda', {
      fortalezas: [{ texto: 'Tienen tracking en línea', naturaleza: 'hecho' }],
      oportunidades: [],
      debilidades: [],
      amenazas: [],
    })
    expect(r?.degradados).toBe(1)
    const datos = r?.datos as { fortalezas: { naturaleza: string }[] }
    expect(datos.fortalezas[0].naturaleza).toBe('hipotesis')
  })

  it('degrada también en estructuras anidadas (madurezDigital.senales)', () => {
    const r = validarBloqueIA('sitio', {
      servicios: [],
      propuestaValor: { texto: 'Atención cercana', naturaleza: 'hipotesis' },
      claims: [],
      segmentosObjetivo: [],
      madurezDigital: { nivel: 'baja', senales: [{ texto: 'Sin portal de clientes', naturaleza: 'hecho' }] },
      vacios: [],
    })
    expect(r?.degradados).toBe(1)
  })

  it('forma inválida → null (jamás se adivina)', () => {
    expect(validarBloqueIA('brief', { resumen: 'x' })).toBeNull()
    expect(validarBloqueIA('competencia', 'texto plano')).toBeNull()
    expect(
      validarBloqueIA('foda', { fortalezas: [{ texto: 'x', naturaleza: 'inventada' }], oportunidades: [], debilidades: [], amenazas: [] })
    ).toBeNull()
  })
})
