// Activo Digital LOCAL: espejo fiel de la lógica del módulo ACT del ERP
// (erp.act_activo / act_version / act_costo, businessos/erp/migrations/005).
// Invariantes heredados: clasificación declarada EN ORIGEN; versiones y costos
// APPEND-ONLY; costo_acumulado = SUMA del ledger (jamás a mano); las decisiones
// de defensibilidad/capitalización son HUMANAS y ocurren en el ERP, no aquí.
// El ciclo real DETECTAR→CATALOGAR→REGISTRAR corre en el ERP vía el host-job de
// cosecha (businessos/cosechar-prediscovery.py); aquí el estatus es 'propuesto'.

export type ClaseActivo = 'pre_discovery' | 'entrevista'

export interface VersionActivo {
  version: string // v1, v2…
  hash: string // sha256 del JSON del contenido
  origen: string // 'caso:<id> bloque(s) regenerados' | 'reunion:<id> transcripcion' …
  at: string
}

export type ComponenteCosto = 'tokens' | 'fetch' | 'infraestructura'

export interface CostoEntrada {
  id: string
  activoId: string
  componente: ComponenteCosto
  tokensIn: number | null // autoritativos cuando componente='tokens'
  tokensOut: number | null
  modelo: string | null
  montoUsd: number
  /** OBLIGATORIA (doctrina act_costo): de dónde sale el monto.
   *  'openrouter_usage·tarifa <modelo>' | 'estimado_mock' | 'no_medido' */
  fuente: string
  at: string
}

export interface ActivoDigitalLocal {
  id: string
  folio: string // 'ACT-LOC-NNNN' — el folio ERP real (ACT-NNNN) lo asigna la cosecha
  clase: ClaseActivo
  tipo: 'datos' | 'documento' // subconjunto de los tipos de act_activo
  nombre: string
  ubicacion: string // ruta lógica verificable: 'meeting-copilot://caso/<id>' | '…//reunion/<id>'
  ejeDei: 'investigacion' | 'desarrollo' // declarado EN ORIGEN (config del módulo)
  defensibilidad: 'defendible' | 'reemplazable'
  estadoDefensibilidad: 'propuesta' // ratificar = humano, en el ERP (D-10)
  estatus: 'propuesto' // el catálogo real vive en erp.act_activo
  versiones: VersionActivo[] // APPEND-ONLY
  refs: { leadId: string | null; casoId: string | null; reunionId: string | null }
  creadoAt: string
}

/** Contrato del EXPORT para el host-job de cosecha (versionado). */
export interface ExportActivo {
  esquema: 'meeting-copilot/activo-export@1'
  exportadoAt: string
  activo: ActivoDigitalLocal
  costoAcumuladoUsd: number
  ledger: CostoEntrada[]
  contenido: unknown // el JSON del caso o de la reunión (lo que respalda el hash vigente)
}
