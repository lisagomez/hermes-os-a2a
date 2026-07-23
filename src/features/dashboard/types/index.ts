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

// Forma REAL de grafo/schemas.py (verificada contra el codigo, no supuesta)
export const estadoGrafoSchema = z.enum(['deducible', 'no_deducible', 'dudoso'])
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
  monto: z.number(),
  moneda: z.string(),
  estado: z.enum(['link_creado', 'abierto', 'confirmado', 'pagado', 'expirado', 'fallido']),
  created_at: z.string(),
})
export type Cobro = z.infer<typeof cobroSchema>

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

export const desarrolloVistaSchema = z.object({
  departamentos: z.array(z.string()),
  tareas: z.array(tareaSchema),
})
export type DesarrolloVista = z.infer<typeof desarrolloVistaSchema>
