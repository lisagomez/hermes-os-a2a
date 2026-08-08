// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ETAPAS_LEAD } from '@/features/domain/types'
import {
  agruparPorEtapa,
  componerEmbudo,
  ETAPAS_EMBUDO,
  ETAPAS_MOVIBLES,
  etapaMovibleSchema,
  type LeadResumen,
} from './types'

describe('etapas del workspace CRM (derivadas del espejo del dominio)', () => {
  it('el embudo son las 9 etapas vivas, en el orden canónico, sin `perdido`', () => {
    expect(ETAPAS_EMBUDO).toHaveLength(9)
    expect(ETAPAS_EMBUDO).not.toContain('perdido')
    expect(ETAPAS_EMBUDO).toEqual(ETAPAS_LEAD.filter((e) => e !== 'perdido'))
    expect(ETAPAS_EMBUDO[0]).toBe('nuevo')
    expect(ETAPAS_EMBUDO[8]).toBe('ganado')
  })

  it('las movibles son el dominio completo del check (embudo + perdido)', () => {
    expect(ETAPAS_MOVIBLES).toEqual(ETAPAS_LEAD)
    expect(ETAPAS_MOVIBLES).toContain('perdido')
    expect(etapaMovibleSchema.parse('perdido')).toBe('perdido')
    expect(() => etapaMovibleSchema.parse('inventada')).toThrow()
  })
})

describe('componerEmbudo', () => {
  it('incluye TODAS las etapas del embudo con cuenta 0 y separa perdidos', () => {
    const { embudo, perdidos } = componerEmbudo([
      { etapa: 'nuevo', cuenta: 3 },
      { etapa: 'perdido', cuenta: 2 },
    ])
    expect(embudo).toHaveLength(9)
    expect(embudo[0]).toEqual({ etapa: 'nuevo', cuenta: 3 })
    expect(embudo.find((e) => e.etapa === 'ganado')).toEqual({ etapa: 'ganado', cuenta: 0 })
    expect(embudo.find((e) => e.etapa === 'perdido')).toBeUndefined()
    expect(perdidos).toBe(2)
  })

  it('una etapa desconocida de la BD se anexa al final (no se pierde ni revienta)', () => {
    const { embudo } = componerEmbudo([{ etapa: 'etapa_nueva_de_bd', cuenta: 1 }])
    expect(embudo).toHaveLength(10)
    expect(embudo[9]).toEqual({ etapa: 'etapa_nueva_de_bd', cuenta: 1 })
  })

  it('sin filas de la vista, el embudo sale completo en ceros', () => {
    const { embudo, perdidos } = componerEmbudo([])
    expect(embudo).toHaveLength(9)
    expect(embudo.every((e) => e.cuenta === 0)).toBe(true)
    expect(perdidos).toBe(0)
  })
})

describe('agruparPorEtapa (columnas del tablero)', () => {
  const lead = (id: string, etapa: string): LeadResumen => ({
    lead_id: id,
    origen: 'web2',
    canal: '',
    empresa: id,
    contacto: null,
    etapa,
    calificacion: null,
    updated_at: '2026-08-08T10:00:00Z',
  })

  it('siempre hay una columna por etapa movible, aunque esté vacía', () => {
    const cols = agruparPorEtapa([lead('a', 'nuevo')])
    expect(cols.map((c) => c.etapa)).toEqual([...ETAPAS_MOVIBLES])
    expect(cols[0].leads).toHaveLength(1)
    expect(cols.find((c) => c.etapa === 'perdido')?.leads).toHaveLength(0)
  })

  it('una etapa desconocida de la BD gana columna extra al final — jamás se pierde', () => {
    const cols = agruparPorEtapa([lead('a', 'etapa_rara'), lead('b', 'etapa_rara')])
    const extra = cols[cols.length - 1]
    expect(extra.etapa).toBe('etapa_rara')
    expect(extra.leads).toHaveLength(2)
    expect(cols).toHaveLength(ETAPAS_MOVIBLES.length + 1)
  })
})
