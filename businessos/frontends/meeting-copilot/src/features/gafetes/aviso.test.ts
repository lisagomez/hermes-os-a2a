import { describe, expect, it } from 'vitest'
import { AVISO_AUSENTE, leerEstadoAviso, versionParaRegistro } from './aviso'

const URL_OK = 'https://a2a.mx/aviso-privacidad'

describe('leerEstadoAviso', () => {
  it('con URL y versión, el aviso queda configurado', () => {
    expect(leerEstadoAviso(URL_OK, '2026-08-07')).toEqual({
      configurado: true,
      url: URL_OK,
      version: '2026-08-07',
    })
  })

  it.each([
    ['sin nada', undefined, undefined],
    ['sin URL', undefined, '2026-08-07'],
    ['sin versión', URL_OK, undefined],
    ['con valores vacíos', '', ''],
    ['con solo espacios', '   ', '  '],
  ])('%s no se da por configurado', (_caso, url, version) => {
    expect(leerEstadoAviso(url, version).configurado).toBe(false)
  })

  // Un aviso que no se puede abrir no es un aviso accesible: la ley pide que el
  // titular pueda consultarlo, no que exista un texto en algún cajón.
  it('una URL que no es dirección web se rechaza', () => {
    const estado = leerEstadoAviso('aviso-privacidad.pdf', '2026-08-07')
    expect(estado.configurado).toBe(false)
    expect(estado.configurado === false && estado.motivo).toContain('accesible')
  })

  it('el motivo dice qué falta y por qué importa, no un código', () => {
    const estado = leerEstadoAviso(undefined, undefined)
    expect(estado.configurado === false && estado.motivo).toContain('LFPDPPP')
    expect(estado.configurado === false && estado.motivo).toContain('NEXT_PUBLIC_AVISO_PRIVACIDAD_URL')
  })
})

describe('versionParaRegistro', () => {
  it('estampa la versión vigente cuando hay aviso', () => {
    expect(versionParaRegistro(leerEstadoAviso(URL_OK, '2026-08-07'))).toBe('2026-08-07')
  })

  // Inventar una versión sería peor que no tenerla: dejaría filas que parecen
  // cumplidas. La marca de ausencia es fea a propósito para poder buscarla.
  it('sin aviso NO se inventa una versión: se marca la ausencia', () => {
    expect(versionParaRegistro(leerEstadoAviso(undefined, undefined))).toBe(AVISO_AUSENTE)
  })
})
