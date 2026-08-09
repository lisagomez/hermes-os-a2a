import { describe, expect, it } from 'vitest'
import {
  corregirDatos,
  incorporarCaptura,
  otroConMismoEmail,
  pendientesDeSincronizar,
} from './dedupe'
import { DATOS_GAFETE_VACIOS, type AsistenteEvento } from './types'

function asistente(parcial: Partial<AsistenteEvento> = {}): AsistenteEvento {
  return {
    id: 'a1',
    reunionId: 'r-expo',
    huella: 'a'.repeat(64),
    textoCrudo: 'Marco Díaz\nTranslogika',
    formato: 'crudo',
    datos: { ...DATOS_GAFETE_VACIOS, nombre: 'Marco Díaz', empresa: 'Translogika' },
    fuenteDato: 'gafete_escaneado',
    corregido: false,
    escaneos: 1,
    avisoVersion: '2026-08-07',
    capturadoAt: '2026-08-07T18:00:00.000Z',
    sincronizado: false,
    ...parcial,
  }
}

describe('incorporarCaptura', () => {
  it('un gafete nuevo se añade a la lista', () => {
    const r = incorporarCaptura([], asistente())
    expect(r.tipo).toBe('nuevo')
    expect(r.lista).toHaveLength(1)
  })

  it('el MISMO gafete escaneado dos veces es UNA fila con el contador en 2', () => {
    const previo = asistente()
    const r = incorporarCaptura([previo], asistente({ id: 'a2' }))
    expect(r.tipo).toBe('repetido')
    expect(r.lista).toHaveLength(1)
    expect(r.lista[0].escaneos).toBe(2)
    expect(r.lista[0].id).toBe('a1') // conserva la fila original, no la duplica
  })

  // Lo importante de todo el módulo: si alguien arregló a mano un nombre que
  // venía mal en el gafete, volver a pasarlo por la cámara NO puede devolverlo
  // al valor equivocado. Perder trabajo humano en silencio es lo peor que
  // puede hacer esta pantalla.
  it('un re-escaneo NO pisa una corrección hecha a mano', () => {
    const corregido = asistente({
      corregido: true,
      datos: { ...DATOS_GAFETE_VACIOS, nombre: 'Marco Díaz Fernández', empresa: 'Translogika' },
    })
    const reEscaneo = asistente({
      id: 'a2',
      datos: { ...DATOS_GAFETE_VACIOS, nombre: 'M. DIAZ', empresa: 'TRANSLOGIKA' },
    })
    const r = incorporarCaptura([corregido], reEscaneo)
    expect(r.lista[0].datos.nombre).toBe('Marco Díaz Fernández')
    expect(r.lista[0].escaneos).toBe(2)
  })

  it('sin corrección previa, el re-escaneo sí refresca los datos', () => {
    const r = incorporarCaptura(
      [asistente()],
      asistente({ id: 'a2', datos: { ...DATOS_GAFETE_VACIOS, nombre: 'Marco Díaz', empresa: 'Translogika SA' } })
    )
    expect(r.lista[0].datos.empresa).toBe('Translogika SA')
  })

  it('huellas distintas conviven: son personas distintas', () => {
    const r = incorporarCaptura([asistente()], asistente({ id: 'a2', huella: 'b'.repeat(64) }))
    expect(r.tipo).toBe('nuevo')
    expect(r.lista).toHaveLength(2)
  })
})

describe('corregirDatos', () => {
  it('marca la fila como corregida y conserva el texto crudo intacto', () => {
    const [fila] = corregirDatos([asistente()], 'a1', {
      ...DATOS_GAFETE_VACIOS,
      nombre: 'Marco Díaz',
      email: 'marco@translogika.mx',
    })
    expect(fila.corregido).toBe(true)
    expect(fila.datos.email).toBe('marco@translogika.mx')
    expect(fila.textoCrudo).toBe('Marco Díaz\nTranslogika') // la evidencia no se toca
  })

  it('no altera a los demás asistentes', () => {
    const lista = corregirDatos([asistente(), asistente({ id: 'a2', huella: 'b'.repeat(64) })], 'a1', DATOS_GAFETE_VACIOS)
    expect(lista[1].corregido).toBe(false)
  })
})

describe('otroConMismoEmail', () => {
  it('detecta al mismo contacto capturado por dos vías, ignorando mayúsculas', () => {
    const lista = [asistente({ datos: { ...DATOS_GAFETE_VACIOS, email: 'Marco@Translogika.MX' } })]
    expect(otroConMismoEmail(lista, 'marco@translogika.mx', 'otro')?.id).toBe('a1')
  })

  it('no se avisa a sí mismo', () => {
    const lista = [asistente({ datos: { ...DATOS_GAFETE_VACIOS, email: 'marco@translogika.mx' } })]
    expect(otroConMismoEmail(lista, 'marco@translogika.mx', 'a1')).toBeNull()
  })

  it('sin correo no hay aviso: el vacío no colisiona con el vacío', () => {
    expect(otroConMismoEmail([asistente()], '', 'otro')).toBeNull()
    expect(otroConMismoEmail([asistente()], '   ', 'otro')).toBeNull()
  })
})

describe('pendientesDeSincronizar', () => {
  it('cuenta solo lo que aún vive en este navegador', () => {
    const lista = [asistente(), asistente({ id: 'a2', huella: 'b'.repeat(64), sincronizado: true })]
    expect(pendientesDeSincronizar(lista)).toBe(1)
  })
})
