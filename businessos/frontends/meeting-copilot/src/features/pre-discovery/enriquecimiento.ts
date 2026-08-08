// Traduce la salida del servicio de enriquecimiento al contrato de la UI.
// Función PURA y sin DOM para poder ponerla en rojo sin navegador (patrón del
// repo: una decisión dentro del JSX no se puede testear).
//
// Es TOLERANTE a propósito: el servicio puede sumar campos y el bloque no debe
// romperse por eso. Lo que NO hace es rellenar huecos — un campo que no viene
// no se inventa, y un hallazgo sin fuente se descarta (sin procedencia no hay
// afirmación, la misma regla del grafo).

import type { BloqueoEnriquecimiento, DatosEnriquecimiento, HallazgoEnriquecimiento } from './types'

/** Forma cruda del artifact `lead-enriquecido` (contrato del servicio A2A). */
export interface SalidaEnriquecimiento {
  lead_id?: string
  resultados?: Record<string, { valor?: unknown; veredicto?: unknown; fuente?: unknown; origen?: unknown }>
  bloqueos?: Record<string, { concepto?: unknown; estado?: unknown; razon?: unknown; checklist?: unknown; fuente?: { cita?: unknown; url?: unknown } }>
  gate_69b?: { pasa?: unknown; estatus?: unknown; razon?: unknown }
  costo_usd?: unknown
  persistido?: unknown
  fuentes?: { cita?: unknown; url?: unknown }[]
  disclaimer?: unknown
}

const texto = (v: unknown): string => (typeof v === 'string' ? v : '')

export function normalizarEnriquecimiento(leadId: string, cruda: SalidaEnriquecimiento): DatosEnriquecimiento {
  const hallazgos: HallazgoEnriquecimiento[] = Object.entries(cruda.resultados ?? {})
    .map(([campo, r]) => ({
      campo,
      valor: texto(r?.valor),
      veredicto: texto(r?.veredicto) || 'dudoso',
      fuente: texto(r?.fuente),
      origen: texto(r?.origen) || undefined,
    }))
    // Sin valor o sin fuente no es un hallazgo: es ruido con formato.
    .filter((h) => h.valor && h.fuente)

  const bloqueos: BloqueoEnriquecimiento[] = Object.values(cruda.bloqueos ?? {}).map((b) => ({
    concepto: texto(b?.concepto),
    estado: texto(b?.estado) || 'dudoso',
    razon: texto(b?.razon),
    checklist: Array.isArray(b?.checklist) ? b.checklist.filter((x): x is string => typeof x === 'string') : [],
    fuente: b?.fuente?.cita ? { cita: texto(b.fuente.cita), url: texto(b.fuente.url) || undefined } : undefined,
  }))

  const g = cruda.gate_69b
  return {
    leadId: texto(cruda.lead_id) || leadId,
    hallazgos,
    bloqueos,
    gate69b: g ? { pasa: g.pasa === true, estatus: texto(g.estatus) || null, razon: texto(g.razon) } : null,
    costoUsd: typeof cruda.costo_usd === 'number' ? cruda.costo_usd : 0,
    persistido: cruda.persistido === true,
    fuentes: (cruda.fuentes ?? [])
      .map((f) => ({ cita: texto(f?.cita), url: texto(f?.url) || undefined }))
      .filter((f) => f.cita),
    disclaimer: texto(cruda.disclaimer),
  }
}
