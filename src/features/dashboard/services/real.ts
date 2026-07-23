import 'server-only'
import { z } from 'zod'
import {
  aiSpendSchema,
  aplanarEvaluacion,
  cobroSchema,
  contratoSchema,
  evaluacionListadaSchema,
  facturaResumenSchema,
  gastoDiarioSchema,
  gastoPorModeloSchema,
  presupuestoMesSchema,
  saludConocimientoSchema,
  tareaSchema,
  conversacionResumenSchema,
  etapaEmbudoSchema,
  DEPARTAMENTOS_REGISTRADOS,
  ETAPAS_EMBUDO,
  type CrmVista,
  type EtapaEmbudo,
  verticalPantheonSchema,
  type AiSpend,
  type DesarrolloVista,
  type GrafoVista,
  type Pantheon,
} from '../types'

/**
 * Fuente REAL: Supabase (PostgREST con service_role, solo lectura) + grafo por
 * HTTP + health de gateways. Corre EXCLUSIVAMENTE en el servidor: el browser
 * recibe datos ya resueltos, jamás credenciales (RLS sin políticas es
 * intencional; no crear políticas "para que funcione el cliente").
 */

const GRAFO_URL = process.env.GRAFO_URL ?? 'http://grafo:3000'
const GATEWAYS: Record<string, string> = {
  personal: process.env.GATEWAY_PERSONAL_URL ?? 'http://hermes-personal:8642',
  negocio: process.env.GATEWAY_NEGOCIO_URL ?? 'http://hermes-negocio:8642',
  clientes: process.env.GATEWAY_CLIENTES_URL ?? 'http://hermes-clientes:8642',
}
const VERTICALES = ['personal', 'negocio', 'clientes'] as const

function sbHeaders(): HeadersInit {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente (fuente real)')
  return { apikey: key, Authorization: `Bearer ${key}` }
}

async function sb<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const url = process.env.SUPABASE_URL
  if (!url) throw new Error('SUPABASE_URL ausente (fuente real)')
  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${path}`, {
    headers: sbHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Supabase ${path}: HTTP ${res.status}`)
  return schema.parse(await res.json())
}

async function grafo<T>(path: string, schema: z.ZodType<T>): Promise<T | null> {
  // El grafo caído se reporta como null (la vista lo muestra), nunca revienta el panel.
  try {
    const res = await fetch(`${GRAFO_URL}${path}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    })
    if (!res.ok) return null
    return schema.parse(await res.json())
  } catch {
    return null
  }
}

export async function realAiSpend(): Promise<AiSpend> {
  const mes = new Date().toISOString().slice(0, 7)
  const [porVertical, diario, porModelo] = await Promise.all([
    sb(`v_presupuesto_mensual?mes=eq.${mes}`, z.array(presupuestoMesSchema)),
    // Serie diaria y desglose por modelo: agregamos en el server sobre token_usage
    // del mes (volumen bajo: una fila por llamada relevante).
    sb(
      `token_usage?fecha=gte.${mes}-01&select=fecha,modelo,tokens_in,tokens_out,costo_usd`,
      z.array(
        z.object({
          fecha: z.string(),
          modelo: z.string(),
          tokens_in: z.number(),
          tokens_out: z.number(),
          costo_usd: z.number(),
        })
      )
    ),
    Promise.resolve(null),
  ]).then(([pv, filas]) => {
    const porDia = new Map<string, number>()
    const porMod = new Map<string, { tokens_in: number; tokens_out: number; costo_usd: number }>()
    for (const f of filas) {
      porDia.set(f.fecha, (porDia.get(f.fecha) ?? 0) + f.costo_usd)
      const m = porMod.get(f.modelo) ?? { tokens_in: 0, tokens_out: 0, costo_usd: 0 }
      m.tokens_in += f.tokens_in
      m.tokens_out += f.tokens_out
      m.costo_usd += f.costo_usd
      porMod.set(f.modelo, m)
    }
    return [
      pv,
      [...porDia.entries()]
        .sort()
        .map(([fecha, costo_usd]) => gastoDiarioSchema.parse({ fecha, costo_usd })),
      [...porMod.entries()].map(([modelo, agg]) =>
        gastoPorModeloSchema.parse({ modelo, ...agg })
      ),
    ] as const
  })
  return aiSpendSchema.parse({ mes, porVertical, serieDiaria: diario, porModelo })
}

export async function realGrafoVista(): Promise<GrafoVista> {
  const [salud, evaluaciones, facturas, contratos, cobros] = await Promise.all([
    grafo('/salud-conocimiento', saludConocimientoSchema),
    grafo('/evaluaciones?limit=20', z.array(evaluacionListadaSchema)).then(
      (e) => (e ?? []).map(aplanarEvaluacion)
    ),
    sb(
      // El agregado vive en la vista (supabase-fix-vista-facturas.sql): PostgREST
      // de Supabase rechaza agregados inline con PGRST123 (deshabilitados por
      // defecto en la plataforma). Mismo patrón que v_presupuesto_mensual.
      'v_facturas_resumen?select=deducibilidad_estado,cuenta&order=deducibilidad_estado',
      z.array(facturaResumenSchema)
    ),
    sb(
      'contratos?select=id,cliente,titulo,jurisdiccion,estado,updated_at&order=updated_at.desc&limit=20',
      z.array(contratoSchema)
    ),
    sb(
      'cobros?select=id,cliente,concepto,monto,moneda,estado,created_at&order=id.desc&limit=20',
      z.array(cobroSchema)
    ),
  ])
  return { salud, evaluaciones, facturas, contratos, cobros }
}

export async function realPantheon(): Promise<Pantheon> {
  const snapshotSchema = z.array(
    z.object({
      vertical: z.enum(VERTICALES),
      bot: z.string().nullable(),
      modelo: z.string().nullable(),
      fallbacks: z.array(z.string()),
      skills: z.array(z.object({ nombre: z.string(), descripcion: z.string().nullish() })),
      snapshot_at: z.string().nullable(),
    })
  )
  const [snapshot, healths] = await Promise.all([
    sb('pantheon?select=*', snapshotSchema).catch(() => []),
    Promise.all(
      VERTICALES.map(async (v) => {
        const inicio = Date.now()
        try {
          const res = await fetch(GATEWAYS[v], {
            cache: 'no-store',
            signal: AbortSignal.timeout(3_000),
          })
          // Cualquier respuesta HTTP = proceso vivo; timeout/red = caído.
          return { v, gateway: res.ok || res.status < 500 ? ('vivo' as const) : ('caido' as const), latencia_ms: Date.now() - inicio }
        } catch {
          return { v, gateway: 'caido' as const, latencia_ms: null }
        }
      })
    ),
  ])
  return VERTICALES.map((v) => {
    const snap = snapshot.find((s) => s.vertical === v)
    const health = healths.find((h) => h.v === v)
    return verticalPantheonSchema.parse({
      vertical: v,
      bot: snap?.bot ?? null,
      modelo: snap?.modelo ?? null,
      fallbacks: snap?.fallbacks ?? [],
      skills: snap?.skills ?? [],
      snapshot_at: snap?.snapshot_at ?? null,
      gateway: health?.gateway ?? 'sin-dato',
      latencia_ms: health?.latencia_ms ?? null,
    })
  })
}

export async function realDesarrollo(departamento?: string): Promise<DesarrolloVista> {
  // Últimas 20 tareas del trío (Ejecutor + Supervisor), opcionalmente filtradas
  // por departamento. La tabla `tareas` la escriben los servicios A2A con
  // service_role (Fase 6/7); aquí solo se lee. Sin catch: si Supabase cae, la
  // página falla honestamente (igual que contratos/cobros en realGrafoVista).
  // El "0 filas" se resuelve como empty state en la UI, no como error. Un
  // departamento inexistente en el query param da lista vacía, no error.
  const filtro = departamento
    ? `&departamento=eq.${encodeURIComponent(departamento)}`
    : ''
  return sb(
    `tareas?select=task_id,objetivo,estado,intentos,created_at&order=created_at.desc&limit=20${filtro}`,
    z.array(tareaSchema)
  )
}

export async function realCrm(): Promise<CrmVista> {
  // Embudo de cliente (leads por etapa) + resumen de conversaciones CRM.
  // Los agregados viven en vistas (supabase-vistas-crm-embudo.sql): PostgREST
  // no expone GROUP BY inline. El orden del embudo lo pone ETAPAS_EMBUDO;
  // una etapa desconocida que venga de la BD se anexa al final (no se pierde).
  const [porEtapa, conversaciones] = await Promise.all([
    sb('v_embudo_leads?select=etapa,cuenta', z.array(etapaEmbudoSchema)),
    sb(
      'v_crm_conversaciones_resumen?select=estado,nivel,cuenta&order=estado,nivel',
      z.array(conversacionResumenSchema)
    ),
  ])
  const cuentas = new Map(porEtapa.map((e) => [e.etapa, e.cuenta]))
  const conocidas = new Set<string>([...ETAPAS_EMBUDO, 'perdido'])
  const embudo: EtapaEmbudo[] = [
    ...ETAPAS_EMBUDO.map((etapa) => ({ etapa, cuenta: cuentas.get(etapa) ?? 0 })),
    ...porEtapa.filter((e) => !conocidas.has(e.etapa)),
  ]
  return { embudo, perdidos: cuentas.get('perdido') ?? 0, conversaciones }
}

export async function realDepartamentos(): Promise<string[]> {
  // Opciones del combo del navbar. DISTINCT vive en la vista
  // (supabase-vista-departamentos.sql): PostgREST no lo expone inline. Se une
  // con los registrados en el Supervisor (DEPARTAMENTOS_REGISTRADOS) para
  // listar también los dados de alta sin tareas todavía.
  const conTareas = await sb(
    'v_departamentos?select=departamento',
    z.array(z.object({ departamento: z.string() }))
  )
  return [
    ...new Set([
      ...DEPARTAMENTOS_REGISTRADOS,
      ...conTareas.map((d) => d.departamento),
    ]),
  ].sort()
}
