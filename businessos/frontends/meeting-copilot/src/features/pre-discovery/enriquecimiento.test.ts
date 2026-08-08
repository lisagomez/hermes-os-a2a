import { describe, expect, it } from 'vitest'
import { normalizarEnriquecimiento } from './enriquecimiento'

const CRUDA = {
  lead_id: 'lead-1',
  resultados: {
    email: { valor: 'contacto@empresa.mx', veredicto: 'dudoso', fuente: 'patron_dominio', origen: 'inferido' },
    rfc: { valor: 'ABC680524P73', veredicto: 'confirmado', fuente: 'rfc_offline' },
  },
  bloqueos: {
    contacto_persona_fisica: {
      concepto: 'dato de persona fisica para prospeccion',
      estado: 'dudoso',
      razon: 'aviso previo y base de licitud',
      checklist: ['Aviso de privacidad dado a conocer al titular', 'Base de licitud documentada'],
      fuente: { cita: 'LFPDPPP Arts. 14, 16 y 17', url: 'https://x' },
    },
  },
  gate_69b: { pasa: false, estatus: null, razon: 'sin RFC utilizable: fail-closed' },
  costo_usd: 0,
  persistido: true,
  fuentes: [{ cita: 'LFPDPPP Arts. 5, 6 y 14', url: 'https://y' }],
  disclaimer: 'Dictamen informativo.',
}

describe('normalizarEnriquecimiento', () => {
  it('mapea hallazgos, bloqueos y el gate 69-B', () => {
    const d = normalizarEnriquecimiento('lead-1', CRUDA)
    expect(d.hallazgos.map((h) => h.campo).sort()).toEqual(['email', 'rfc'])
    expect(d.hallazgos.find((h) => h.campo === 'rfc')?.veredicto).toBe('confirmado')
    expect(d.bloqueos[0].checklist).toHaveLength(2)
    expect(d.bloqueos[0].fuente?.cita).toContain('LFPDPPP')
    expect(d.gate69b).toEqual({ pasa: false, estatus: null, razon: 'sin RFC utilizable: fail-closed' })
    expect(d.persistido).toBe(true)
  })

  it('DESCARTA un hallazgo sin fuente: sin procedencia no hay afirmación', () => {
    const d = normalizarEnriquecimiento('lead-1', {
      resultados: { email: { valor: 'x@y.mx', veredicto: 'confirmado' } },
    })
    expect(d.hallazgos).toHaveLength(0)
  })

  it('descarta un hallazgo sin valor (ruido con formato)', () => {
    const d = normalizarEnriquecimiento('lead-1', {
      resultados: { telefono: { valor: '', veredicto: 'dudoso', fuente: 'denue' } },
    })
    expect(d.hallazgos).toHaveLength(0)
  })

  it('es tolerante: campos nuevos del servicio no rompen el bloque', () => {
    const d = normalizarEnriquecimiento('lead-1', { ...CRUDA, campo_futuro: 42 } as never)
    expect(d.hallazgos.length).toBeGreaterThan(0)
  })

  it('sin nada, no inventa: cero hallazgos y cero bloqueos', () => {
    const d = normalizarEnriquecimiento('lead-9', {})
    expect(d).toMatchObject({ leadId: 'lead-9', hallazgos: [], bloqueos: [], gate69b: null, persistido: false })
  })

  it('un veredicto desconocido se conserva, no se normaliza a confirmado', () => {
    const d = normalizarEnriquecimiento('lead-1', {
      resultados: { email: { valor: 'a@b.mx', veredicto: 'sospechoso', fuente: 'denue' } },
    })
    expect(d.hallazgos[0].veredicto).toBe('sospechoso')
  })
})
