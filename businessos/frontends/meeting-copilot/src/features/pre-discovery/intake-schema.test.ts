import { describe, expect, it } from 'vitest'
import { IntakeSchema } from './intake-schema'
import { MAX_CONCEPTOS_REGULATORIOS, conceptosRegulatorios, extraerUrls } from './pipeline'
import type { CasoPreDiscovery, IntakeLead } from './types'
import { bloquesVacios } from './types'

const COMPLETO: IntakeLead = {
  telefono: '+52 777 216 0950',
  email: 'contacto@despacho.example',
  linkedin: 'linkedin.com/in/contacto-ejemplo',
  web: 'https://despacho.example/',
  tamano: '11-50',
  modeloNegocio: 'Holding',
  giro: 'Legal',
  pais: 'México (MX)',
  direccion: 'Hipódromo Condesa, CDMX',
  notas: 'Quiere una plataforma para gestionar el despacho.',
}

describe('IntakeSchema — ningún campo capturado se pierde en el camino', () => {
  it('conserva TODAS las claves del intake (un campo despojado es un dato perdido)', () => {
    const salida = IntakeSchema.parse(COMPLETO)
    expect(Object.keys(salida).sort()).toEqual(Object.keys(COMPLETO).sort())
  })

  it('acepta el intake mínimo (los opcionales siguen siendo opcionales)', () => {
    const minimo: IntakeLead = {
      telefono: '',
      email: '',
      web: '',
      tamano: '1-10',
      giro: 'Legal',
      pais: 'MX',
      notas: '',
    }
    expect(IntakeSchema.safeParse(minimo).success).toBe(true)
  })

  it('rechaza un giro vacío (el analista no puede trabajar sin él)', () => {
    expect(IntakeSchema.safeParse({ ...COMPLETO, giro: '' }).success).toBe(false)
  })
})

function casoCon(intake: IntakeLead): CasoPreDiscovery {
  return {
    id: 'c1',
    leadId: 'l1',
    intake,
    estado: 'borrador',
    bloques: bloquesVacios(),
    activoId: null,
    creadoAt: '',
    actualizadoAt: '',
  }
}

describe('extraerUrls — se compila TODA fuente del intake', () => {
  it('incluye el LinkedIn del contacto, que tiene casilla propia en el formulario', () => {
    expect(extraerUrls(casoCon(COMPLETO))).toContain('linkedin.com/in/contacto-ejemplo')
  })

  it('sigue tomando la web y las URLs de las notas, sin duplicar', () => {
    const urls = extraerUrls(casoCon({ ...COMPLETO, notas: 'Ver https://despacho.example/ y https://otra.example/x' }))
    expect(urls).toContain('https://despacho.example/')
    expect(urls).toContain('https://otra.example/x')
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('sin LinkedIn no inventa fuentes', () => {
    const urls = extraerUrls(casoCon({ ...COMPLETO, linkedin: '   ' }))
    expect(urls.some((u) => u.includes('linkedin'))).toBe(false)
  })
})

describe('conceptosRegulatorios — al grafo se le mandan actividades, no marketing', () => {
  function casoConSitio(servicios: string[], claims: string[]): CasoPreDiscovery {
    const caso = casoCon(COMPLETO)
    caso.bloques.sitio.datos = {
      servicios: servicios.map((texto) => ({ texto, naturaleza: 'hecho' as const })),
      claims: claims.map((texto) => ({ texto, naturaleza: 'hecho' as const })),
    }
    return caso
  }

  it('con muchos servicios, ningún claim de marketing ocupa un espacio', () => {
    const c = conceptosRegulatorios(
      casoConSitio(
        ['Derecho inmobiliario', 'Juicios sucesorios', 'Registro de marcas', 'Litigio fiscal', 'Derecho corporativo', 'Litigio penal'],
        ['Más de 50 años de experiencia', 'Laborando desde hace dos generaciones']
      )
    )
    expect(c).toHaveLength(MAX_CONCEPTOS_REGULATORIOS)
    expect(c.some((x) => x.includes('50 años'))).toBe(false)
    expect(c).toContain('Derecho inmobiliario')
  })

  it('con pocos servicios, los claims sí rellenan (un claim puede ser señal regulatoria)', () => {
    const c = conceptosRegulatorios(casoConSitio(['Flete aéreo internacional'], ['Emitimos Electronics AWB']))
    expect(c).toContain('Emitimos Electronics AWB')
  })

  it('siempre encabeza el giro y país, y respeta el tope', () => {
    const c = conceptosRegulatorios(casoConSitio(Array.from({ length: 20 }, (_, i) => `Servicio ${i}`), []))
    expect(c[0]).toContain('Legal')
    expect(c[0]).toContain('México')
    expect(c.length).toBeLessThanOrEqual(MAX_CONCEPTOS_REGULATORIOS)
  })
})
