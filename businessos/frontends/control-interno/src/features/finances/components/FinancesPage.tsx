'use client'

import Link from 'next/link'
import {
  Wallet, TrendingDown, TrendingUp, Landmark, HandCoins, ArrowLeftRight, RefreshCw,
  CalendarClock, AlertTriangle,
} from 'lucide-react'
import { useFinances } from '../hooks/useFinances'
import { accountColor, categoryColor, incomeColor } from '../lib/financeColors'
import { InfoTip } from './InfoTip'
import { IncomeExpenseCurve } from './FinanceCharts'
import type {
  FinanceAccount, FinanceMovement, FinanceRange, FinanceSnapshot, FinanceSummary, SnapshotBalance,
} from '../types/finances'

const fmt = (n: number, currency = 'MXN') =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

const RANGES: { id: FinanceRange; label: string; word: string }[] = [
  { id: '30d', label: '30D', word: '30 días' },
  { id: '3m', label: '3M', word: '3 meses' },
  { id: '6m', label: '6M', word: '6 meses' },
  { id: '12m', label: '12M', word: '12 meses' },
]

const EDU = {
  netWorth: 'Lo que tienes disponible YA (bancos, efectivo, crypto). NO incluye lo que te deben. Activos líquidos = dinero que puedes usar hoy.',
  gastos: 'Cuánto GASTASTE en el rango seleccionado. Es la película del gasto, no un saldo. Solo cuenta gastos reales, no transferencias ni préstamos.',
  ingresos: 'El dinero que ENTRÓ en el rango (ventas, salario, lo que sea). Cash flow = ingresos menos gastos: si es positivo, creciste.',
  runway: 'Cuántos meses aguantas con tu líquido. Burn mensual = tus cobros fijos (recurrentes) + el promedio de tus gastos únicos del rango. Runway = líquido ÷ burn mensual.',
  porCobrar: 'Dinero que te deben (préstamos que hiciste). Es un activo, pero NO es líquido: no lo puedes gastar hasta que te paguen.',
}

const SECTION_TITLE = 'text-xs uppercase tracking-widest text-muted font-semibold flex items-center gap-2'

const MOVEMENT_META: Record<string, { label: string; icon: typeof Wallet; tone: string }> = {
  gasto: { label: 'Gasto', icon: TrendingDown, tone: 'text-error' },
  ingreso: { label: 'Ingreso', icon: TrendingUp, tone: 'text-success' },
  transferencia: { label: 'Transferencia', icon: ArrowLeftRight, tone: 'text-muted' },
  prestamo: { label: 'Préstamo', icon: HandCoins, tone: 'text-warning' },
  pago_deuda: { label: 'Pago deuda', icon: HandCoins, tone: 'text-success' },
  ajuste: { label: 'Ajuste', icon: RefreshCw, tone: 'text-muted' },
}

export function FinancesPage() {
  const { data, range, setRange, loading, error, refetch } = useFinances()

  if (loading && !data) {
    return (
      <div className="h-full overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="h-8 w-48 rounded-lg bg-card animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-card animate-pulse" />)}
        </div>
        <div className="h-72 rounded-2xl bg-card animate-pulse" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <Wallet size={28} className="text-muted" />
        <p className="text-sm text-muted max-w-sm">No se pudieron cargar las finanzas{error ? `: ${error}` : ''}</p>
        <button onClick={refetch} className="nav-item text-xs border border-border-subtle px-3">
          <RefreshCw size={13} /> Reintentar
        </button>
      </div>
    )
  }

  const { summary, snapshots, movements, accounts } = data
  const latest = snapshots[0] ?? null

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <Wallet size={24} className="text-primary" /> Finanzas
          </h1>
          <p className="text-[11px] text-muted mt-1.5">
            {latest && `Último cierre: ${fmtDate(latest.snapshot_date)} · `}FX {summary.fx.usd_mxn} MXN/USD
            {summary.fx_stale && <span className="text-warning"> · de respaldo (no vivo)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RangeToggle value={range} onChange={setRange} />
          <Link
            href="/finanzas/cobros"
            className="nav-item text-xs border border-border-subtle px-3 py-1.5 rounded-lg"
            title="Cobros fijos y suscripciones"
          >
            <CalendarClock size={13} /> Cobros fijos
          </Link>
          <button onClick={refetch} className="nav-item text-xs border border-border-subtle px-3 py-1.5 rounded-lg" title="Refrescar">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Net worth líquido" edu={EDU.netWorth}
          value={latest?.liquid_mxn != null ? fmt(latest.liquid_mxn) : '—'}
          sub={latest?.liquid_usd != null ? `${fmt(latest.liquid_usd, 'USD')} USD` : 'sin cierre'}
          delta={latest?.delta_liquid_mxn}
        />
        <KpiCard
          label="Ingresos" edu={EDU.ingresos} valueTone="text-success"
          value={fmt(summary.income_range_mxn)}
          sub={summary.cashflow_range_mxn >= 0 ? `cash flow +${fmt(summary.cashflow_range_mxn)}` : `cash flow ${fmt(summary.cashflow_range_mxn)}`}
        />
        <KpiCard
          label="Gastos" edu={EDU.gastos} valueTone="text-error"
          value={fmt(summary.burn_range_mxn)}
          sub={`${movements.filter((m) => m.type === 'gasto').length} gastos registrados`}
        />
        <KpiCard
          label="Runway" edu={EDU.runway}
          value={summary.runway_months != null ? `${summary.runway_months} meses` : '—'}
          sub={summary.monthly_burn_mxn > 0 ? `burn prom. ${fmt(summary.monthly_burn_mxn)}/mes` : 'sin gasto en el rango'}
          warn={summary.runway_low_confidence && summary.runway_months != null ? 'estimado con pocos datos' : undefined}
        />
      </div>

      {/* La ÚNICA gráfica */}
      <IncomeExpenseCurve series={summary.series} days={summary.days} />

      {/* Cuentas */}
      <section className="titanium-panel rounded-2xl p-4 space-y-3">
        <h2 className={SECTION_TITLE}>
          <Landmark size={13} /> Cuentas · foto del {latest ? fmtDate(latest.snapshot_date) : '—'}
        </h2>
        {latest ? <AccountBalances balances={latest.balances} accounts={accounts} />
          : <EmptyHint title="Sin cierres todavía" body="Un cierre es la foto de los saldos de todas tus cuentas. Dile a tu agente: “hagamos el cierre del mes” y dicta los saldos." />}
      </section>

      {/* Categorías: gastos + ingresos EN LA MISMA FILA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="titanium-panel rounded-2xl p-4 space-y-3">
          <h2 className={SECTION_TITLE}><TrendingDown size={13} className="text-error" /> Gastos por categoría</h2>
          <CategoryBars summary={summary} />
        </section>
        <section className="titanium-panel rounded-2xl p-4 space-y-3">
          <h2 className={SECTION_TITLE}><TrendingUp size={13} className="text-success" /> Ingresos por fuente</h2>
          <IncomeBars summary={summary} />
        </section>
      </div>

      {/* Movimientos */}
      <section className="titanium-panel rounded-2xl p-4 space-y-3">
        <h2 className={SECTION_TITLE}>Movimientos · últimos {RANGES.find((r) => r.id === range)?.word}</h2>
        <MovementsList movements={movements} />
      </section>

      {/* Cierres */}
      {snapshots.length > 0 && (
        <section className="titanium-panel rounded-2xl p-4 space-y-3">
          <h2 className={SECTION_TITLE}>Cierres (conciliación mensual)</h2>
          <div className="space-y-2">{snapshots.slice(0, 6).map((s) => <SnapshotRow key={s.id} snapshot={s} />)}</div>
        </section>
      )}
    </div>
  )
}

function RangeToggle({ value, onChange }: { value: FinanceRange; onChange: (r: FinanceRange) => void }) {
  return (
    <div className="flex gap-0.5 rounded-lg bg-card p-0.5">
      {RANGES.map((r) => (
        <button
          key={r.id}
          onClick={() => onChange(r.id)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
            value === r.id ? 'bg-primary/20 text-primary' : 'text-muted hover:text-foreground'
          }`}
          title={r.word}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}

function KpiCard({ label, value, sub, delta, edu, warn, valueTone }: {
  label: string; value: string; sub?: string; delta?: number | null; edu?: string; warn?: string; valueTone?: string
}) {
  return (
    <div className="titanium-panel rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted font-semibold flex items-center gap-1">
        {label}{edu && <InfoTip text={edu} label={`Qué es ${label}`} />}
      </p>
      <p className={`text-lg md:text-xl font-bold mt-1 tabular-nums ${valueTone ?? ''}`}>{value}</p>
      <p className="text-[11px] text-muted mt-0.5 tabular-nums">
        {delta != null && (
          <span className={delta >= 0 ? 'text-success' : 'text-error'}>
            {delta >= 0 ? '+' : ''}{fmt(delta)} vs anterior ·{' '}
          </span>
        )}
        {sub}
      </p>
      {warn && (
        <p className="text-[10px] text-warning mt-1 flex items-center gap-1">
          <AlertTriangle size={10} /> {warn}
        </p>
      )}
    </div>
  )
}

function AccountBalances({ balances, accounts }: { balances: SnapshotBalance[]; accounts: FinanceAccount[] }) {
  const kindByName = new Map(accounts.map((a) => [a.name, a.kind]))
  const liquid = balances.filter((b) => kindByName.get(b.account) !== 'por_cobrar')
  const receivables = balances.filter((b) => kindByName.get(b.account) === 'por_cobrar')

  const Row = ({ b }: { b: SnapshotBalance }) => (
    <div className="flex items-center gap-2 text-sm py-1 border-b border-border-subtle last:border-0">
      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: accountColor(b.account) }} />
      <span className="text-foreground/80 flex-1 min-w-0 truncate">{b.account}</span>
      <span className="tabular-nums font-medium shrink-0">
        {fmt(b.balance, b.currency)} <span className="text-[10px] text-muted">{b.currency}</span>
      </span>
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
      <div>{liquid.map((b) => <Row key={b.account} b={b} />)}</div>
      <div>
        {receivables.length > 0 && (
          <>
            <p className="text-[10px] uppercase tracking-widest text-muted font-semibold pt-1 flex items-center gap-1">
              Por cobrar (no líquido) <InfoTip text={EDU.porCobrar} label="Qué es por cobrar" />
            </p>
            {receivables.map((b) => <Row key={b.account} b={b} />)}
          </>
        )}
      </div>
    </div>
  )
}

function CategoryBars({ summary }: { summary: FinanceSummary }) {
  const cats = summary.burn_by_category
  if (!cats.length) {
    return <EmptyHint title="Sin gastos en este rango" body="Umbral de captura: $500 MXN · $30 USD · $25 EUR. Lo de menos se promedia en el burn, no se registra uno a uno." />
  }
  const max = cats[0].total_mxn
  return (
    <div className="space-y-2">
      {cats.map((c) => (
        <div key={c.category}>
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="text-foreground/80">{c.category}</span>
            <span className="tabular-nums text-muted">{fmt(c.total_mxn)} · {c.count}</span>
          </div>
          <div className="h-1.5 rounded-full bg-card overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.max(4, (c.total_mxn / max) * 100)}%`, backgroundColor: categoryColor(c.category) }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function IncomeBars({ summary }: { summary: FinanceSummary }) {
  const src = summary.income_by_source
  if (!src.length) {
    return <EmptyHint title="Sin ingresos en este rango" body="Cuando registres ingresos, aquí verás de dónde viene cada peso." />
  }
  const max = src[0].total_mxn
  return (
    <div className="space-y-2">
      {src.map((s) => (
        <div key={s.category}>
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="text-foreground/80">{s.category}</span>
            <span className="tabular-nums text-muted">{fmt(s.total_mxn)} · {s.count}</span>
          </div>
          <div className="h-1.5 rounded-full bg-card overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.max(4, (s.total_mxn / max) * 100)}%`, backgroundColor: incomeColor(s.category) }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function MovementsList({ movements }: { movements: FinanceMovement[] }) {
  if (!movements.length) {
    return <EmptyHint title="Sin movimientos en este rango" body="Cada gasto/ingreso que le dictes a tu agente aparece aquí. Prueba: “gasté 350 en despensa con la tarjeta”." />
  }
  return (
    <div className="space-y-1">
      {movements.slice(0, 40).map((m) => {
        const meta = MOVEMENT_META[m.type] ?? MOVEMENT_META.ajuste
        const Icon = meta.icon
        return (
          <div key={m.id} className="flex items-center gap-3 py-1.5 border-b border-border-subtle last:border-0 text-sm">
            <Icon size={14} className={`shrink-0 ${meta.tone}`} />
            <span className="text-[11px] text-muted tabular-nums w-12 shrink-0">{fmtDate(m.date)}</span>
            <div className="flex-1 min-w-0">
              <span className="block truncate text-foreground/85">
                {m.type === 'gasto' && (m.category ?? 'otros')}
                {m.type === 'ingreso' && `Ingreso · ${m.category ?? 'otros'}`}
                {['transferencia', 'prestamo', 'pago_deuda'].includes(m.type) && `${meta.label}: ${m.account_name} → ${m.counter_account_name}`}
                {m.type === 'ajuste' && 'Ajuste'}
                {m.note && <span className="text-muted"> · {m.note}</span>}
              </span>
              {m.account_name && (
                <span className="inline-flex md:hidden items-center gap-1 mt-0.5 text-[10px] text-muted">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accountColor(m.account_name) }} />
                  {m.account_name}
                </span>
              )}
            </div>
            <span className="hidden md:inline text-[11px] text-muted shrink-0">{m.account_name}</span>
            <span className={`tabular-nums font-medium shrink-0 ${m.type === 'gasto' ? 'text-error' : m.type === 'ingreso' ? 'text-success' : ''}`}>
              {m.type === 'gasto' ? '−' : m.type === 'ingreso' ? '+' : ''}
              {fmt(m.amount, m.currency)} <span className="text-[10px] text-muted">{m.currency}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

function SnapshotRow({ snapshot }: { snapshot: FinanceSnapshot }) {
  return (
    <div className="flex items-center gap-3 text-sm py-1.5 border-b border-border-subtle last:border-0">
      <span className="text-[11px] text-muted tabular-nums w-14 shrink-0">{fmtDate(snapshot.snapshot_date)}</span>
      <span className="flex-1 min-w-0 truncate text-foreground/85">
        líquido {snapshot.liquid_mxn != null ? fmt(snapshot.liquid_mxn) : '—'} · net worth{' '}
        {snapshot.net_worth_mxn != null ? fmt(snapshot.net_worth_mxn) : '—'}
        {snapshot.notes && <span className="text-muted"> · {snapshot.notes}</span>}
      </span>
      {snapshot.delta_liquid_mxn != null && (
        <span className={`tabular-nums text-xs shrink-0 ${snapshot.delta_liquid_mxn >= 0 ? 'text-success' : 'text-error'}`}>
          {snapshot.delta_liquid_mxn >= 0 ? '+' : ''}{fmt(snapshot.delta_liquid_mxn)}
        </span>
      )}
    </div>
  )
}

function EmptyHint({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-subtle p-3">
      <p className="text-xs font-medium text-foreground/80">{title}</p>
      <p className="text-[11px] text-muted mt-1 leading-snug">{body}</p>
    </div>
  )
}
