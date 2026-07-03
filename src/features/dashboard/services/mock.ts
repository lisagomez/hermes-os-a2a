import 'server-only'
import type { AiSpend, GrafoVista, Pantheon } from '../types'

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
