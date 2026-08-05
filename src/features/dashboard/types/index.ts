import { z } from 'zod'

/**
 * Schemas Zod de TODOS los payloads externos del dashboard.
 * Regla: nada entra a la UI sin pasar por aquí (no `any`, no confiar en la red).
 * Las formas replican los esquemas reales:
 *  - v_presupuesto_mensual / token_usage  (businessos/supabase-init.sql)
 *  - facturas (supabase-init.sql), cobros/contratos (supabase-fase3.sql)
 *  - grafo: Salud, SaludConocimiento, EvaluacionResponse (businessos/grafo/schemas.py)
 *  - pantheon (businessos/supabase-fase4.sql)
 */

// ---------- AI Spend ----------

export const presupuestoMesSchema = z.object({
  mes: z.string(), // 'YYYY-MM'
  // string, no enum: los escritores de token_usage crecen ('trio' desde 2026-07;
  // un enum aquí tira /ai-spend entera al aparecer el siguiente). La UI ya tiene
  // fallback de color para verticales desconocidos.
  vertical: z.string(),
  tokens_in: z.number(),
  tokens_out: z.number(),
  costo_usd: z.number(),
})
export type PresupuestoMes = z.infer<typeof presupuestoMesSchema>

export const gastoDiarioSchema = z.object({
  fecha: z.string(), // 'YYYY-MM-DD'
  costo_usd: z.number(),
})
export type GastoDiario = z.infer<typeof gastoDiarioSchema>

export const gastoPorModeloSchema = z.object({
  modelo: z.string(),
  tokens_in: z.number(),
  tokens_out: z.number(),
  costo_usd: z.number(),
})
export type GastoPorModelo = z.infer<typeof gastoPorModeloSchema>

export const aiSpendSchema = z.object({
  mes: z.string(),
  porVertical: z.array(presupuestoMesSchema),
  serieDiaria: z.array(gastoDiarioSchema),
  porModelo: z.array(gastoPorModeloSchema),
})
export type AiSpend = z.infer<typeof aiSpendSchema>

// Presupuesto: fuente única del número es negocio/MEMORY.md (fijado 2026-06-30).
export const PRESUPUESTO_MENSUAL_USD = 30
export const UMBRAL_ALERTA = 0.8

// ---------- Grafo ----------

// Forma REAL de grafo/schemas.py: Literal['deducible','no_deducible','permitido',
// 'no_permitido','dudoso'] — el vocabulario es POR DIMENSIÓN (fiscal vs
// regulatorio) y creció una vez ya. z.string(), no enum: un enum de 3 valores
// aquí vaciaba TODAS las evaluaciones del panel en cuanto llegara una de la
// dimensión regulatorio (lección 2026-07-23: el schema no es el eslabón frágil).
// El badge conoce los 5 estados y degrada a neutro ante uno desconocido.
export const estadoGrafoSchema = z.string()
export type EstadoGrafo = z.infer<typeof estadoGrafoSchema>

export const fuenteSchema = z.object({
  clave: z.string(), // ej. MX-LISR-27-V
  cita: z.string(), // ej. 'LISR Art. 27, fraccion V'
  url: z.string(),
  vigencia: z.object({ desde: z.string(), hasta: z.string().nullable() }).partial().nullish(),
})
export type Fuente = z.infer<typeof fuenteSchema>

export const conceptoEvaluadoSchema = z.object({
  descripcion: z.string(),
  categoria: z.string().nullable(),
  estado: estadoGrafoSchema,
  razon: z.string(),
  fuente: fuenteSchema.nullable(),
  banderas: z.array(z.string()),
  checklist: z.array(z.string()),
})

const contextoResueltoSchema = z.object({
  jurisdiccion: z.string(),
  dimension: z.string(),
  regimen: z.string(),
  fecha: z.string(),
})

// GET /evaluaciones del grafo devuelve el wrapper persistido {id, created_at,
// contexto, salida}; la UI lo aplana a Evaluacion.
export const evaluacionListadaSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  contexto: contextoResueltoSchema,
  salida: z.object({
    estado: estadoGrafoSchema,
    conceptos: z.array(conceptoEvaluadoSchema),
    banderas_rojas: z.array(z.string()),
    checklist: z.array(z.string()),
    fuentes: z.array(fuenteSchema),
    disclaimer: z.string(),
  }),
})
export type EvaluacionListada = z.infer<typeof evaluacionListadaSchema>

export const evaluacionSchema = z.object({
  id: z.string(),
  creado_at: z.string(),
  contexto: contextoResueltoSchema,
  estado: estadoGrafoSchema,
  conceptos: z.array(conceptoEvaluadoSchema),
  banderas_rojas: z.array(z.string()),
  checklist: z.array(z.string()),
  fuentes: z.array(fuenteSchema),
  disclaimer: z.string(), // regla de oro: SIEMPRE presente y SIEMPRE visible
})
export type Evaluacion = z.infer<typeof evaluacionSchema>

export function aplanarEvaluacion(e: EvaluacionListada): Evaluacion {
  return evaluacionSchema.parse({ id: e.id, creado_at: e.created_at, contexto: e.contexto, ...e.salida })
}

export const saludConocimientoSchema = z.object({
  generado: z.string(),
  source_versions: z.array(z.string()),
  reglas_total: z.number(),
  reglas_vencidas: z.array(z.object({ clave: z.string(), vigente_hasta: z.string() })),
  verificar_pendientes: z.array(
    z.object({
      regla: z.string(),
      cita: z.string(),
      categoria: z.string().nullish(),
      parametros: z.record(z.string(), z.unknown()),
    })
  ),
  ambitos: z.array(z.object({ jurisdiccion: z.string(), dimension: z.string() })),
  advertencia: z.string().nullish(),
})
export type SaludConocimiento = z.infer<typeof saludConocimientoSchema>

export const facturaResumenSchema = z.object({
  deducibilidad_estado: z.enum(['pendiente', 'deducible', 'no_deducible', 'dudoso']),
  cuenta: z.number(),
})
export type FacturaResumen = z.infer<typeof facturaResumenSchema>

export const contratoSchema = z.object({
  id: z.number(),
  cliente: z.string(),
  titulo: z.string(),
  jurisdiccion: z.string(),
  estado: z.enum(['borrador', 'validado', 'en_revision', 'aprobado', 'firmado', 'terminado']),
  updated_at: z.string(),
})
export type Contrato = z.infer<typeof contratoSchema>

export const cobroSchema = z.object({
  id: z.number(),
  cliente: z.string(),
  concepto: z.string(),
  // null = checkout "pay what you want" (landing) aun sin monto confirmado;
  // el webhook lo completa cuando el cliente paga.
  monto: z.number().nullable(),
  moneda: z.string(),
  estado: z.enum(['link_creado', 'abierto', 'confirmado', 'pagado', 'expirado', 'fallido']),
  created_at: z.string(),
})
export type Cobro = z.infer<typeof cobroSchema>

// ---------- Grafo · Explorador (App C paso 3; fuente: flujos-a2a :5100) ----------
// Espejo TOLERANTE de businessos/flujos-a2a/schemas.py (proxy de solo-lectura).
// Doctrina: el consumidor jamás más estricto que la fuente. Las reglas viajan
// del grafo intactas; aquí se valida POR REGLA (safeParse granular): una regla
// irreconocible se descarta y se CUENTA (visible en la UI), nunca tira el árbol.

export const catalogoItemSchema = z.object({ codigo: z.string(), nombre: z.string() })
export type CatalogoItem = z.infer<typeof catalogoItemSchema>

export const catalogosExploradorSchema = z.object({
  jurisdicciones: z.array(catalogoItemSchema),
  dimensiones: z.array(catalogoItemSchema),
})
export type CatalogosExplorador = z.infer<typeof catalogosExploradorSchema>

// veredicto_base: string libre y nullable (null = la regla solo aporta
// requisitos/banderas — así existe en el seed real y el contrato lo tolera).
export const impactoExploradorSchema = z.object({
  categoria: z.string().nullish(),
  regimen: z.string().catch('PM_TITULO_II'),
  veredicto_base: z.string().nullish(),
  tope_monto: z.number().nullish(),
  tope_pct: z.number().nullish(),
  requisitos: z.array(z.string()).catch([]),
  banderas: z.array(z.string()).catch([]),
  parametros: z.record(z.string(), z.unknown()).catch({}),
})
export type ImpactoExplorador = z.infer<typeof impactoExploradorSchema>

export const reglaExploradorSchema = z.object({
  clave: z.string(),
  jurisdiccion: z.string(),
  dimension: z.string(),
  titulo: z.string(),
  texto_resumen: z.string().catch(''),
  fuente_cita: z.string(), // regla de oro: nunca sin fuente (sin cita, la regla se descarta y se cuenta)
  fuente_url: z.string().catch(''),
  source_version: z.string().nullish(),
  vigente_desde: z.string().catch(''),
  vigente_hasta: z.string().nullish(),
  vigente: z.boolean(),
  impactos: z.array(impactoExploradorSchema).catch([]),
})
export type ReglaExplorador = z.infer<typeof reglaExploradorSchema>

const arbolCrudoSchema = z.object({
  fecha: z.string().nullish(),
  total_reglas: z.number(),
  jurisdicciones: z.array(
    z.object({
      codigo: z.string(),
      nombre: z.string(),
      dimensiones: z.array(
        z.object({ codigo: z.string(), nombre: z.string(), reglas: z.array(z.unknown()) })
      ),
    })
  ),
})

export interface ArbolDimensionExplorador {
  codigo: string
  nombre: string
  reglas: ReglaExplorador[]
}
export interface ArbolJurisdiccionExplorador {
  codigo: string
  nombre: string
  dimensiones: ArbolDimensionExplorador[]
}
export interface ArbolExplorador {
  fecha: string | null
  total_reglas: number
  jurisdicciones: ArbolJurisdiccionExplorador[]
  // Reglas que este espejo no reconoció: se descartan UNA a una y se declaran
  // en la UI ("no sé leer N reglas" ≠ "no hay reglas" ≠ "el servicio no responde").
  descartadas: number
}

export function validarArbol(crudo: unknown): ArbolExplorador | null {
  const outer = arbolCrudoSchema.safeParse(crudo)
  if (!outer.success) return null
  let descartadas = 0
  const jurisdicciones = outer.data.jurisdicciones.map((j) => ({
    codigo: j.codigo,
    nombre: j.nombre,
    dimensiones: j.dimensiones.map((d) => {
      const reglas: ReglaExplorador[] = []
      for (const r of d.reglas) {
        const p = reglaExploradorSchema.safeParse(r)
        if (p.success) reglas.push(p.data)
        else descartadas += 1
      }
      return { codigo: d.codigo, nombre: d.nombre, reglas }
    }),
  }))
  return {
    fecha: outer.data.fecha ?? null,
    total_reglas: outer.data.total_reglas,
    jurisdicciones,
    descartadas,
  }
}

export const constructorExploradorSchema = z.object({
  jurisdiccion: z.string(),
  dimension: z.string(),
  fecha: z.string().nullish(),
  regimenes: z.array(z.string()),
  regimen_default: z.string(),
  categorias: z.array(
    z.object({ clave: z.string(), nombre: z.string().catch(''), descripcion: z.string().nullish() })
  ),
  plantilla_payload: z.record(z.string(), z.unknown()),
})
export type ConstructorExplorador = z.infer<typeof constructorExploradorSchema>

export interface ExploradorParams {
  jurisdiccion?: string
  dimension?: string
  fecha?: string // ya validada (YYYY-MM-DD) por la página antes de llegar aquí
}

// /health de flujos-a2a: responde aunque el grafo caiga, y reporta su estado.
// Es lo que permite NO culpar a la pieza equivocada en el empty state.
export const saludFlujosSchema = z.object({
  status: z.string(),
  grafo: z.string(), // 'ok' o el motivo de no-conexión con el grafo
  reglas: z.number().nullish(),
})
export type SaludFlujos = z.infer<typeof saludFlujosSchema>

export interface ExploradorVista {
  // false = flujos-a2a no respondió NINGÚN endpoint de datos (con saludFlujos
  // distinguimos: null además = ni el health → perfil a2a apagado o superficie
  // sin acceso a hermes-net como Vercel; con salud = el caído es el GRAFO).
  disponible: boolean
  saludFlujos: SaludFlujos | null
  arbol: ArbolExplorador | null // null con disponible=true = forma irreconocible (drift)
  catalogos: CatalogosExplorador | null
  constructorAmbito: ConstructorExplorador | null
  constructorFallo: boolean // se pidió un ámbito y flujos-a2a no lo resolvió
  evaluaciones: Evaluacion[] | null // null = passthrough caído (≠ lista vacía)
  // Evaluaciones descartadas por forma irreconocible (mismo criterio granular
  // y visible que ArbolExplorador.descartadas — nada se pierde en silencio).
  evaluacionesDescartadas: number
}

export const grafoVistaSchema = z.object({
  salud: saludConocimientoSchema.nullable(), // null = grafo inalcanzable (se muestra, no revienta)
  evaluaciones: z.array(evaluacionSchema),
  facturas: z.array(facturaResumenSchema),
  contratos: z.array(contratoSchema),
  cobros: z.array(cobroSchema),
})
export type GrafoVista = z.infer<typeof grafoVistaSchema>

// ---------- Pantheon ----------

export const gatewayEstadoSchema = z.enum(['vivo', 'caido', 'sin-dato'])

export const verticalPantheonSchema = z.object({
  vertical: z.enum(['personal', 'negocio', 'clientes']),
  bot: z.string().nullable(),
  modelo: z.string().nullable(),
  fallbacks: z.array(z.string()),
  skills: z.array(z.object({ nombre: z.string(), descripcion: z.string().nullish() })),
  snapshot_at: z.string().nullable(),
  gateway: gatewayEstadoSchema,
  latencia_ms: z.number().nullable(),
})
export type VerticalPantheon = z.infer<typeof verticalPantheonSchema>

export const pantheonSchema = z.array(verticalPantheonSchema)
export type Pantheon = z.infer<typeof pantheonSchema>

// ---------- Desarrollo (trío) ----------
// Fuente del dominio: businessos/supabase-fase6.sql (check constraint de
// `tareas`). La vista /desarrollo lista el estado del trío (Ejecutor + Supervisor):
// son las mismas filas que escriben los servicios A2A con service_role.

export const estadoTareaSchema = z.enum([
  'recibida',
  'en_ejecucion',
  'en_revision',
  'aprobada',
  'rechazada',
  'escalada',
  'concretada',
  'cancelada',
])
export type EstadoTarea = z.infer<typeof estadoTareaSchema>

export const tareaSchema = z.object({
  task_id: z.string(),
  objetivo: z.string(),
  estado: estadoTareaSchema,
  intentos: z.number().int().nonnegative(),
  created_at: z.string(), // timestamptz ISO
})
export type Tarea = z.infer<typeof tareaSchema>

// Departamentos dados de alta en el Supervisor: espejo de
// businessos/supervisor-a2a/reglas/*.toml (un TOML por departamento). El combo
// de /desarrollo los UNE con los presentes en `tareas` (v_departamentos), así
// un departamento nuevo aparece en cuanto despacha su primera tarea aunque
// esta lista vaya atrás — y uno recién dado de alta se puede filtrar aunque
// todavía no tenga tareas.
export const DEPARTAMENTOS_REGISTRADOS = [
  'adquisicion',
  'contratos_inteligentes',
  'software',
] as const

export const desarrolloVistaSchema = z.array(tareaSchema)
export type DesarrolloVista = z.infer<typeof desarrolloVistaSchema>

// ---------- CRM (departamento adquisición) ----------
// Embudo de cliente: el ORDEN de las etapas es conocimiento del dashboard
// (espejo del check constraint `leads_etapa_check`, supabase-fase9/11).
// `perdido` no es una etapa del embudo: es la salida, se pinta aparte. Una
// etapa nueva en la BD que este espejo no conozca se muestra al final del
// embudo (no se pierde ni revienta — lección del enum de vertical).

export const ETAPAS_EMBUDO = [
  'nuevo',
  'calificado',
  'contactado',
  'descubrimiento',
  'propuesta',
  'negociacion',
  'contrato',
  'onboarding',
  'ganado',
] as const

export const etapaEmbudoSchema = z.object({
  etapa: z.string(),
  cuenta: z.number().int().nonnegative(),
})
export type EtapaEmbudo = z.infer<typeof etapaEmbudoSchema>

export const conversacionResumenSchema = z.object({
  estado: z.string(), // abierta | escalada | cerrada (check en BD)
  nivel: z.string(), // A0..A3 (check en BD)
  canal: z.string(), // telegram | whatsapp (de crm_contactos; dominio abierto)
  cuenta: z.number().int().nonnegative(),
})
export type ConversacionResumen = z.infer<typeof conversacionResumenSchema>

// Etapas a las que un humano puede MOVER un lead desde el dashboard:
// las del embudo + la salida `perdido` (dominio completo del check de la BD).
export const ETAPAS_MOVIBLES = [...ETAPAS_EMBUDO, 'perdido'] as const

export const leadResumenSchema = z.object({
  lead_id: z.string(),
  origen: z.string(), // a2a | manual | slack | web2 | crm | copilot (check en BD)
  canal: z.string(), // telegram | whatsapp | '' (dominio abierto, sin enum)
  empresa: z.string().nullable(),
  contacto: z.string().nullable(),
  etapa: z.string(),
  updated_at: z.string(),
})
export type LeadResumen = z.infer<typeof leadResumenSchema>

export const crmVistaSchema = z.object({
  // Etapas del embudo EN ORDEN, con cuenta 0 incluida; `perdido` aparte.
  embudo: z.array(etapaEmbudoSchema),
  perdidos: z.number().int().nonnegative(),
  conversaciones: z.array(conversacionResumenSchema),
  leads: z.array(leadResumenSchema),
})
export type CrmVista = z.infer<typeof crmVistaSchema>

// ---------- Contratos SC (departamento contratos_inteligentes, Fase 12 F5) ----------
// Paquete de revisión humana: banderas G1 ARRIBA (anti-sello-de-goma G4),
// diff acotado, hash G5 y resultado de la red efímera. `estado` es z.string()
// tolerante (lección 2026-07-23: el schema no debe ser el eslabón frágil de un
// dominio que puede crecer); el orden/os glifos los pone la UI.

export const banderaG1Schema = z.object({
  codigo: z.string(),
  severidad: z.string(), // alta | media (banderas.py)
  detalle: z.string(),
  donde: z.string(),
})
export type BanderaG1 = z.infer<typeof banderaG1Schema>

export const diffLineaSchema = z.object({ antes: z.string(), despues: z.string() })

export const manifestScSchema = z.object({
  diff: z.array(diffLineaSchema).catch([]),
  criterios_aceptacion: z.array(z.string()).catch([]),
  politica_endorsement: z.string().catch(''),
})
export type ManifestSc = z.infer<typeof manifestScSchema>

export const redEfimeraSchema = z
  .object({
    verde: z.boolean().optional(),
    fase: z.string().optional(),
    motivo: z.string().optional(),
    resumen: z
      .object({
        transiciones: z.number().optional(),
        negativos: z.number().optional(),
        invocaciones: z.number().optional(),
      })
      .optional(),
  })
  .nullable()
  .catch(null)

export const contratoScSchema = z.object({
  id: z.string(),
  task_id: z.string(),
  solicitante: z.string(),
  plantilla: z.string(),
  canal_destino: z.string().nullable(),
  estado: z.string(), // fabricando|en_revision|aprobado|desplegado|rechazado|escalado
  secuencia: z.number().int(),
  hash_paquete: z.string().nullable(),
  banderas: z.array(banderaG1Schema).catch([]),
  manifest: manifestScSchema.catch({ diff: [], criterios_aceptacion: [], politica_endorsement: '' }),
  red_efimera: redEfimeraSchema,
  en_revision_desde: z.string().nullable(),
  aprobado_por: z.string().nullable(),
  aprobado_en: z.string().nullable(),
  motivo_rechazo: z.string().nullable(),
  desplegado_en: z.string().nullable(),
  created_at: z.string(),
})
export type ContratoSc = z.infer<typeof contratoScSchema>

export const contratosVistaSchema = z.array(contratoScSchema)
export type ContratosVista = z.infer<typeof contratosVistaSchema>

// Decisiones humanas posibles sobre una fila en_revision (server action).
export const DECISIONES_CONTRATO = ['aprobado', 'rechazado'] as const
