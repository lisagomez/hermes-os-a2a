type FinanceCurrency = 'MXN' | 'USD' | 'EUR'
type FinanceAccountKind = 'banco' | 'credito' | 'wallet' | 'efectivo' | 'revenue' | 'por_cobrar'
type FinanceMovementType = 'gasto' | 'ingreso' | 'transferencia' | 'prestamo' | 'pago_deuda' | 'ajuste'

// Categorías canónicas de gasto. Edítalas a tu gusto: el API valida contra esta
// lista, así que agente y UI siempre hablan el mismo vocabulario.
export const EXPENSE_CATEGORIES = [
  'vivienda',
  'comida',
  'despensa',
  'transporte',
  'viajes',
  'salud',
  'suscripciones',
  'equipo-tech',
  'educacion',
  'familia',
  'negocio-ops',
  'otros',
] as const

// Fuentes canónicas de ingreso. Mismo trato: edítalas a tu realidad.
export const INCOME_SOURCES = ['ventas', 'salario', 'freelance', 'inversiones', 'otros'] as const

export interface FinanceAccount {
  id: string
  name: string
  owner: string // texto libre: quién es el dueño de la cuenta (tú, tu pareja, compartida...)
  kind: FinanceAccountKind
  currency: FinanceCurrency
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface FinanceMovement {
  id: string
  date: string
  type: FinanceMovementType
  account_id: string
  counter_account_id: string | null
  currency: FinanceCurrency
  amount: number
  counter_currency: FinanceCurrency | null
  counter_amount: number | null
  category: string | null
  note: string | null
  registered_by: string
  is_correction: boolean
  corrects_movement_id: string | null
  created_at: string
  // joined server-side
  account_name?: string
  counter_account_name?: string
}

export interface SnapshotBalance {
  account: string
  currency: FinanceCurrency
  balance: number
}

export interface FinanceFx {
  usd_mxn: number
  eur_mxn: number
  eur_usd: number
}

export interface FinanceSnapshot {
  id: string
  snapshot_date: string
  balances: SnapshotBalance[]
  fx: FinanceFx
  liquid_mxn: number | null
  liquid_usd: number | null
  net_worth_mxn: number | null
  net_worth_usd: number | null
  delta_liquid_mxn: number | null
  delta_net_worth_mxn: number | null
  notes: string | null
  created_at: string
}

export interface FinanceRecurring {
  id: string
  name: string
  category: string
  periodicity: 'mensual' | 'anual'
  charge_day: number
  charge_month: number | null
  currency: FinanceCurrency
  amount: number
  account_id: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
  account_name?: string
}

export interface CategoryTotal {
  category: string
  total_mxn: number
  count: number
}

export type FinanceRange = '30d' | '3m' | '6m' | '12m'

// Punto de la curva: ingresos y gastos ACUMULADOS al día `date` dentro del rango.
export interface SeriesPoint {
  date: string // YYYY-MM-DD
  income_mxn: number // acumulado
  expense_mxn: number // acumulado
}

export interface FinanceSummary {
  range: FinanceRange
  days: number
  fx: FinanceFx
  fx_at: string | null // ISO timestamp del FX usado (null = fallback)
  fx_stale: boolean // true si se cayó al FX de respaldo (no vivo)
  burn_range_mxn: number
  income_range_mxn: number
  cashflow_range_mxn: number
  burn_by_category: CategoryTotal[]
  income_by_source: CategoryTotal[]
  series: SeriesPoint[] // curva diaria acumulada del rango
  monthly_burn_mxn: number // tasa de burn mensual proyectada del rango
  runway_months: number | null
  runway_low_confidence: boolean // true si el runway se calculó con pocos datos
  recurring_monthly_mxn: number
}

export interface FinancesPayload {
  accounts: FinanceAccount[]
  movements: FinanceMovement[]
  snapshots: FinanceSnapshot[]
  recurring: FinanceRecurring[]
  summary: FinanceSummary
}
