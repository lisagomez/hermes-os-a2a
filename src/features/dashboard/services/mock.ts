import 'server-only'
import type { AiSpend, CrmVista, DesarrolloVista, GrafoVista, Pantheon } from '../types'
import { ETAPAS_EMBUDO } from '../types'

/**
 * Fixtures de desarrollo: réplicas de datos REALES del sistema
 * (primera ingesta de token_usage 2026-06-30, smokes del grafo Fase 2/3,
 * cobro sandbox Polar 2026-07-02). En esta máquina no hay Docker ni runtime
 * (ver .claude/memory/reference/maquinas-entornos.md): el dashboard se valida
 * con estos datos y en runtime se conmuta a la fuente real.
 */

export const mockAiSpend: AiSpend = {
  mes: '2026-07',
  porVertical: [
    { mes: '2026-07', vertical: 'TOTAL', tokens_in: 412_030, tokens_out: 31_855, costo_usd: 1.8421 },
    { mes: '2026-07', vertical: 'personal', tokens_in: 168_744, tokens_out: 12_105, costo_usd: 0.6117 },
    { mes: '2026-07', vertical: 'negocio', tokens_in: 152_311, tokens_out: 11_882, costo_usd: 0.7842 },
    { mes: '2026-07', vertical: 'clientes', tokens_in: 90_975, tokens_out: 7_868, costo_usd: 0.4462 },
  ],
  serieDiaria: [
    { fecha: '2026-06-28', costo_usd: 0.0217 },
    { fecha: '2026-06-29', costo_usd: 0.31 },
    { fecha: '2026-06-30', costo_usd: 0.42 },
    { fecha: '2026-07-01', costo_usd: 0.55 },
    { fecha: '2026-07-02', costo_usd: 0.54 },
  ],
  porModelo: [
    { modelo: 'google/gemini-2.5-flash-lite', tokens_in: 361_400, tokens_out: 24_030, costo_usd: 0.9104 },
    { modelo: 'anthropic/claude-sonnet-4.6', tokens_in: 21_830, tokens_out: 4_512, costo_usd: 0.7331 },
    { modelo: 'openai/gpt-oss-120b:floor', tokens_in: 28_800, tokens_out: 3_313, costo_usd: 0.1986 },
  ],
}

export const mockGrafoVista: GrafoVista = {
  salud: {
    generado: '2026-07-02',
    source_versions: ['LISR DOF 2024-12-30', 'CFF DOF 2025-04-07', 'ET CO Ley 2277/2022'],
    reglas_total: 24,
    reglas_vencidas: [],
    verificar_pendientes: [
      {
        regla: 'mx-fiscal-consumos-restaurante',
        cita: 'LISR 28-XX',
        categoria: 'viaticos',
        parametros: { tope_deducible: 0.085, verificar: true },
      },
    ],
    ambitos: [
      { jurisdiccion: 'MX', dimension: 'fiscal' },
      { jurisdiccion: 'MX', dimension: 'contable' },
      { jurisdiccion: 'MX', dimension: 'contractual' },
      { jurisdiccion: 'CO', dimension: 'fiscal' },
    ],
    advertencia: null,
  },
  evaluaciones: [
    {
      id: 'a3f1c2d4-0000-4000-8000-000000000001',
      creado_at: '2026-07-02T20:11:00Z',
      contexto: { jurisdiccion: 'MX', dimension: 'fiscal', regimen: 'PM_TITULO_II', fecha: '2026-07-02' },
      estado: 'dudoso',
      conceptos: [
        {
          descripcion: 'Consultoría de software julio',
          categoria: 'servicios_profesionales',
          estado: 'deducible',
          razon: 'Gasto estrictamente indispensable con CFDI',
          fuente: {
            clave: 'MX-LISR-27-V',
            cita: 'LISR Art. 27, fracción V',
            url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf',
            vigencia: { desde: '2025-01-01', hasta: null },
          },
          banderas: [],
          checklist: ['CFDI vigente', 'Pago con medio rastreable'],
        },
        {
          descripcion: 'MacBook Pro 16"',
          categoria: 'activo_fijo',
          estado: 'dudoso',
          razon: 'Equipo de cómputo se deprecia, no se deduce directo',
          fuente: {
            clave: 'MX-LISR-34-VII',
            cita: 'LISR Art. 34, fracción VII',
            url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf',
            vigencia: { desde: '2025-01-01', hasta: null },
          },
          banderas: ['Deducción vía depreciación 30% anual, no gasto directo'],
          checklist: ['Registrar en activo fijo', 'CFDI a nombre de la PM'],
        },
      ],
      banderas_rojas: ['Deducción vía depreciación 30% anual, no gasto directo'],
      checklist: ['CFDI vigente', 'Pago con medio rastreable', 'Registrar en activo fijo'],
      fuentes: [
        {
          clave: 'MX-LISR-27-V',
          cita: 'LISR Art. 27, fracción V',
          url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf',
          vigencia: { desde: '2025-01-01', hasta: null },
        },
        {
          clave: 'MX-LISR-34-VII',
          cita: 'LISR Art. 34, fracción VII',
          url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf',
          vigencia: { desde: '2025-01-01', hasta: null },
        },
      ],
      disclaimer:
        'Esto no es asesoría fiscal, contable ni legal. Verifica con un profesional certificado antes de decidir.',
    },
  ],
  facturas: [
    { deducibilidad_estado: 'pendiente', cuenta: 3 },
    { deducibilidad_estado: 'deducible', cuenta: 5 },
    { deducibilidad_estado: 'dudoso', cuenta: 2 },
    { deducibilidad_estado: 'no_deducible', cuenta: 1 },
  ],
  contratos: [
    {
      id: 1,
      cliente: 'ACME S.A.',
      titulo: 'Servicios de consultoría 2026',
      jurisdiccion: 'MX',
      estado: 'en_revision',
      updated_at: '2026-07-02T18:40:00Z',
    },
  ],
  cobros: [
    {
      id: 1,
      cliente: 'Cliente Prueba',
      concepto: 'Test sandbox Fase 3',
      monto: 10,
      moneda: 'USD',
      estado: 'pagado',
      created_at: '2026-07-02T21:40:00Z',
    },
  ],
}

export const mockPantheon: Pantheon = [
  {
    vertical: 'personal',
    bot: '@hermes_khmcih2cwjdulkbq_bot',
    modelo: 'google/gemini-2.5-flash-lite',
    fallbacks: ['mistralai/mistral-small-24b:nitro', 'anthropic/claude-sonnet-4.6'],
    skills: [{ nombre: 'obsidian-capture', descripcion: 'Captura notas a la bóveda' }],
    snapshot_at: '2026-07-02T20:00:00Z',
    gateway: 'vivo',
    latencia_ms: 41,
  },
  {
    vertical: 'negocio',
    bot: '@a2aTeamBot',
    modelo: 'google/gemini-2.5-flash-lite',
    fallbacks: ['mistralai/mistral-small-24b:nitro', 'anthropic/claude-sonnet-4.6'],
    skills: [{ nombre: 'budget-report', descripcion: 'Reporte de presupuesto del mes' }],
    snapshot_at: '2026-07-02T20:00:00Z',
    gateway: 'caido',
    latencia_ms: null,
  },
  {
    vertical: 'clientes',
    bot: '@a2aClientbot',
    modelo: 'google/gemini-2.5-flash-lite',
    fallbacks: ['mistralai/mistral-small-24b:nitro', 'anthropic/claude-sonnet-4.6'],
    skills: [],
    snapshot_at: null,
    gateway: 'sin-dato',
    latencia_ms: null,
  },
]

// Réplicas de tareas reales del trío (dogfoods Fase 6/7 documentados en
// CLAUDE.md): mission-control-2026-0001, dogfood-swarm-1 aprobado, etc.
// Ordenadas por created_at desc, igual que la query real (limit 20).
export const mockDesarrollo: DesarrolloVista = [
  {
    task_id: 'mission-control-2026-0001',
    objetivo: 'Crear página /desarrollo en Mission Control con la lista de tareas del trío',
    estado: 'en_ejecucion',
    intentos: 1,
    created_at: '2026-07-12T09:40:00Z',
  },
  {
    task_id: 'dogfood-swarm-1',
    objetivo: 'Dogfood del enjambre (Fase 7): plan GLM de 3 sub-tareas + integración',
    estado: 'aprobada',
    intentos: 2,
    created_at: '2026-07-11T18:20:00Z',
  },
  {
    task_id: 'dogfood-trio-1',
    objetivo: 'Primer dogfood real del trío con GLM-5.2 como motor del Ejecutor',
    estado: 'aprobada',
    intentos: 3,
    created_at: '2026-07-11T12:05:00Z',
  },
  {
    task_id: 'fase9-supervisor-chequeos-0007',
    objetivo: 'Añadir chequeos de adquisición al supervisor-a2a (Fase 9)',
    estado: 'en_revision',
    intentos: 1,
    created_at: '2026-07-10T16:30:00Z',
  },
  {
    task_id: 'cli-audit-snapshot-0011',
    objetivo: 'Migrar cli-audit.py a índice versionado para correr en el servidor 24/7',
    estado: 'escalada',
    intentos: 3,
    created_at: '2026-07-12T07:15:00Z',
  },
  {
    task_id: 'polar-webhook-retry-0004',
    objetivo: 'Reintentar webhook de Polar caído tras el 403 de Cloudflare (1010)',
    estado: 'rechazada',
    intentos: 2,
    created_at: '2026-07-02T22:10:00Z',
  },
  {
    task_id: 'telegram-privacy-fix-0006',
    objetivo: 'Apagar Group Privacy del bot de Telegram y re-añadirlo al grupo',
    estado: 'concretada',
    intentos: 1,
    created_at: '2026-07-12T10:00:00Z',
  },
  {
    task_id: 'hermes-cron-rutinas-0009',
    objetivo: 'Crear crons faltantes (digest 08:00 CST, cierre semanal) en las 3 verticales',
    estado: 'recibida',
    intentos: 0,
    created_at: '2026-07-12T11:00:00Z',
  },
  {
    task_id: 'arm-image-cax-0002',
    objetivo: 'Probar imagen Hermes sobre ARM (cax) en Hetzner',
    estado: 'cancelada',
    intentos: 0,
    created_at: '2026-07-05T13:45:00Z',
  },
]

// Réplica del estado real del CRM (2026-07-23): 3 leads en `nuevo` (2 a2a +
// 1 web2), el resto del embudo en cero y sin conversaciones CRM todavía
// (tenant real pendiente de alta).
export const mockCrm: CrmVista = {
  embudo: ETAPAS_EMBUDO.map((etapa) => ({
    etapa,
    cuenta: etapa === 'nuevo' ? 3 : 0,
  })),
  perdidos: 0,
  conversaciones: [],
  leads: [
    {
      lead_id: 'web2-266d25d2-cd0e-4487-b785-c31e4b96f76d',
      origen: 'web2',
      empresa: 'Mi IA',
      contacto: 'Elisa <lisagomez967@gmail.com>',
      etapa: 'nuevo',
      updated_at: '2026-07-19T04:04:15Z',
    },
    {
      lead_id: 'lead-d8dafc4f-04ab-4a9f-b03d-7ef23394768e',
      origen: 'a2a',
      empresa: 'Smoke Test S.A.',
      contacto: 'smoke@ejemplo.mx',
      etapa: 'nuevo',
      updated_at: '2026-07-18T23:39:11Z',
    },
    {
      lead_id: 'lead-5e70ed15-1d1d-4647-b211-d82d67aa5e3f',
      origen: 'a2a',
      empresa: 'Smoke Test S.A.',
      contacto: 'smoke@ejemplo.mx',
      etapa: 'nuevo',
      updated_at: '2026-07-18T23:33:13Z',
    },
  ],
}
