import { describe, expect, it } from 'vitest'
import { FORMATO_HUELLA, huellaDe, normalizarParaHuella } from './huella'

const GAFETE = 'Marco Díaz\nTranslogika SA de CV\nmarco@translogika.mx\nhttps://translogika.mx'

describe('normalizarParaHuella', () => {
  it('el mismo gafete leído desde Windows y desde Android se normaliza igual', () => {
    expect(normalizarParaHuella(GAFETE.replace(/\n/g, '\r\n'))).toBe(normalizarParaHuella(GAFETE))
  })

  it('quita la marca de orden de bytes que meten algunos lectores', () => {
    expect(normalizarParaHuella('﻿' + GAFETE)).toBe(normalizarParaHuella(GAFETE))
  })

  it('ignora los espacios de cola que añade el copiar/pegar', () => {
    const conBasura = GAFETE.split('\n').map((l) => l + '   \t').join('\n')
    expect(normalizarParaHuella(conBasura)).toBe(normalizarParaHuella(GAFETE))
  })

  it('unifica los acentos compuestos, que se ven idénticos y son bytes distintos', () => {
    const descompuesto = 'Marco Díaz' // "i" + acento combinado
    const compuesto = 'Marco Díaz'
    expect(descompuesto).not.toBe(compuesto) // se ven igual, no lo son
    expect(normalizarParaHuella(descompuesto)).toBe(normalizarParaHuella(compuesto))
  })

  it('no toca los espacios internos: dos empresas distintas no se funden', () => {
    expect(normalizarParaHuella('Acme  SA')).not.toBe(normalizarParaHuella('Acme SA'))
  })
})

describe('huellaDe', () => {
  it('devuelve el formato que exige la columna de la base', async () => {
    expect(await huellaDe(GAFETE)).toMatch(FORMATO_HUELLA)
  })

  it('el mismo gafete escaneado dos veces produce la misma huella', async () => {
    expect(await huellaDe(GAFETE)).toBe(await huellaDe(GAFETE + '\n'))
  })

  it('dos personas distintas producen huellas distintas', async () => {
    const otra = GAFETE.replace('marco@', 'lucia@')
    expect(await huellaDe(GAFETE)).not.toBe(await huellaDe(otra))
  })

  it('el texto vacío no revienta: firma como cualquier otro', async () => {
    expect(await huellaDe('')).toMatch(FORMATO_HUELLA)
  })

  it('un QR del tamaño máximo (2953 bytes) se firma sin problema', async () => {
    expect(await huellaDe('x'.repeat(2953))).toMatch(FORMATO_HUELLA)
  })
})
