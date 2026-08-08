// @vitest-environment node
// La tabla es puro JSX determinista: se verifica con renderToStaticMarkup,
// sin navegador (el stub de la acción nunca se invoca al renderizar).
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LeadsTable } from './LeadsTable'
import { ETAPAS_MOVIBLES, type LeadResumen } from './types'

const LEAD: LeadResumen = {
  lead_id: 'lead-001',
  origen: 'web2',
  canal: '',
  empresa: 'Acme SA',
  contacto: 'Ana Torres',
  etapa: 'nuevo',
  calificacion: null,
  updated_at: '2026-08-08T10:00:00Z',
}

const stub = async () => {}

describe('LeadsTable', () => {
  it('cada fila ofrece EXACTAMENTE las etapas movibles y lleva su lead_id', () => {
    const html = renderToStaticMarkup(<LeadsTable leads={[LEAD]} accionMover={stub} />)
    const options = [...html.matchAll(/<option[^>]*value="([^"]+)"/g)].map((m) => m[1])
    expect(options).toEqual([...ETAPAS_MOVIBLES])
    expect(html).toContain('name="lead_id"')
    expect(html).toContain('value="lead-001"')
    expect(html).toContain('Acme SA')
  })

  it('sin leads muestra el estado vacío honesto, no una tabla hueca', () => {
    const html = renderToStaticMarkup(<LeadsTable leads={[]} accionMover={stub} />)
    expect(html).toContain('Sin leads todavía')
    expect(html).not.toContain('<table')
  })
})
