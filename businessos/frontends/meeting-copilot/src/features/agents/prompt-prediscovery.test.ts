import { describe, expect, it } from 'vitest'
import { ESQUEMAS_BLOQUE, construirUsuarioBloque, describirEsquema, validarBloqueIA } from './prompt-prediscovery'
import type { BloqueLLM } from './prompt-prediscovery'
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

  it('lleva al modelo los campos opcionales del intake cuando existen', () => {
    const p = construirUsuarioBloque('foda', {
      intake: { ...INTAKE, modeloNegocio: 'Holding', direccion: 'Condesa, CDMX', linkedin: 'linkedin.com/in/x' },
    })
    expect(p).toContain('Holding')
    expect(p).toContain('Condesa, CDMX')
    expect(p).toContain('linkedin.com/in/x')
  })
})

// El motivo de que existan: en producción los 7 bloques fallaban 3/3 con
// "no cumplió el contrato" porque el prompt pedía "la forma exacta" sin decir
// nunca cuál era; el modelo envolvía la salida en {"foda": …} y renombraba
// `texto` a `descripcion`. La forma se DERIVA del esquema para que no pueda
// desincronizarse: si el contrato cambia, el prompt cambia con él.
describe('describirEsquema — la forma pedida se deriva del contrato', () => {
  it('describe claves, enums, límites y opcionalidad', () => {
    const forma = describirEsquema(ESQUEMAS_BLOQUE.foda)
    expect(forma).toContain('"fortalezas"')
    expect(forma).toContain('"texto": string (3-400 caracteres)')
    expect(forma).toContain('"hecho"|"hipotesis"|"recomendacion"')
    expect(forma).toContain('"evidencia"?')
    expect(forma).toContain('máx 6 elementos')
  })

  it('TODO bloque describe TODAS las claves de su esquema (guardián de deriva)', () => {
    for (const [bloque, esquema] of Object.entries(ESQUEMAS_BLOQUE)) {
      const prompt = construirUsuarioBloque(bloque as BloqueLLM, { intake: INTAKE })
      for (const clave of Object.keys(esquema.shape)) {
        expect(prompt, `bloque ${bloque}: falta la clave ${clave} en la forma pedida`).toContain(`"${clave}"`)
      }
      expect(prompt).toContain('sin envolverlo en')
    }
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

describe('presupuesto de texto del sitio por bloque', () => {
  const textoLargo = 'ç'.repeat(20_000)

  it('el bloque sitio recibe hasta 14k del material compilado (no lo trunca a 6k)', () => {
    const p = construirUsuarioBloque('sitio', { intake: INTAKE, textoSitio: textoLargo })
    expect((p.match(/ç/g) ?? []).length).toBe(14_000)
  })

  it('un bloque derivado (foda) conserva el presupuesto acotado de 6k', () => {
    const p = construirUsuarioBloque('foda', { intake: INTAKE, textoSitio: textoLargo })
    expect((p.match(/ç/g) ?? []).length).toBe(6000)
  })
})
