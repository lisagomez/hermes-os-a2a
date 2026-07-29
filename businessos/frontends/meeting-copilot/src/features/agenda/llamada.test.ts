// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { construirHandoffLlamada, normalizarE164 } from './llamada'

describe('normalizarE164 (convención wa_id: E.164 sin +)', () => {
  it('10 dígitos se asumen MX (lada 52)', () => {
    expect(normalizarE164('55 1111 2222')).toBe('525511112222')
  })

  it('números ya internacionales pasan limpios', () => {
    expect(normalizarE164('+52 55 1111 2222')).toBe('525511112222')
    expect(normalizarE164('573001112233')).toBe('573001112233')
  })

  it('basura o longitudes imposibles → vacío', () => {
    expect(normalizarE164('abc')).toBe('')
    expect(normalizarE164('123')).toBe('')
    expect(normalizarE164('1'.repeat(16))).toBe('')
  })
})

describe('construirHandoffLlamada', () => {
  it('arma tel: y wa.me del mismo número', () => {
    expect(construirHandoffLlamada('55 1111 2222')).toEqual({
      tel: 'tel:+525511112222',
      whatsapp: 'https://wa.me/525511112222',
    })
  })

  it('sin número usable devuelve null (la UI muestra el criterio, no un enlace roto)', () => {
    expect(construirHandoffLlamada('')).toBeNull()
  })
})
