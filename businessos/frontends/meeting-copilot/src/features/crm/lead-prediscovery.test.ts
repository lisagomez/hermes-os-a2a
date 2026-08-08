// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { filaLeadPrediscovery, leadIdPrediscovery } from './lead-prediscovery'

describe('lead de Pre-Discovery hacia el CRM canónico (fix fuga 2026-08-08)', () => {
  it('la clave natural es estable y normaliza mayúsculas/espacios', () => {
    const a = leadIdPrediscovery('Acme SA', 'Ana Torres')
    expect(a).toMatch(/^copilot-pd-[0-9a-f]{16}$/)
    expect(leadIdPrediscovery('  acme sa ', 'ANA TORRES')).toBe(a)
    expect(leadIdPrediscovery('Otra SA', 'Ana Torres')).not.toBe(a)
  })

  it('la fila lleva origen copilot, canal pre-discovery y NUNCA etapa (el upsert no regresa leads)', () => {
    const fila = filaLeadPrediscovery({
      empresa: 'Acme SA',
      contacto: 'Ana Torres',
      giro: 'Legal',
      web: 'https://acme.mx',
      casoId: 'caso-1',
    })
    expect(fila.origen).toBe('copilot')
    expect(fila.canal).toBe('pre-discovery')
    expect(fila).not.toHaveProperty('etapa')
    expect(fila.datos).toMatchObject({ source: 'copilot-prediscovery', giro: 'Legal', casoId: 'caso-1' })
  })

  it('el email del intake viaja dentro del contacto', () => {
    const fila = filaLeadPrediscovery({ empresa: 'Acme', contacto: 'Ana', email: 'ana@acme.mx' })
    expect(fila.contacto).toBe('Ana <ana@acme.mx>')
  })
})
