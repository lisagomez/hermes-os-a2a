// Semáforo de salud (SPEC-buzon-a2a §11.11): una fila persistente en el
// encabezado del buzón con 5 indicadores. "Por aprobar" es SIEMPRE derivado de
// `salientes` (nunca una copia paralela) — solo entregabilidad/rebotes/DMARC/
// cuota son señales del proveedor de correo, que en el MVP viven como
// catálogo estático (mismo patrón que `entrantes`: nadie las edita desde la UI).

export interface SaludBuzon {
  buzonId: string
  entregabilidadPct: number
  rebotes: number
  dmarcOk: boolean
  cuotaPct: number
}

/** El fallo silencioso es el peor modo de falla de un sistema de correo
 *  (§11.11): rebotes > 0 dispara aviso proactivo, no espera a que alguien mire. */
export function rebotesEnAlerta(salud: SaludBuzon): boolean {
  return salud.rebotes > 0
}

/** Buzón sin fixture propio de salud (recién creado): valores neutros, nunca
 *  una alerta inventada. */
export function saludVacia(buzonId: string): SaludBuzon {
  return { buzonId, entregabilidadPct: 100, rebotes: 0, dmarcOk: false, cuotaPct: 0 }
}

export function saludDe(lista: SaludBuzon[], buzonId: string): SaludBuzon {
  return lista.find((s) => s.buzonId === buzonId) ?? saludVacia(buzonId)
}
