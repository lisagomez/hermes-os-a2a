'use client'

import Link from 'next/link'
import { CalendarClock, ArrowLeft, RefreshCw, Wallet } from 'lucide-react'
import { useFinances } from '../hooks/useFinances'
import { accountColor } from '../lib/financeColors'
import type { FinanceAccount, FinanceRecurring } from '../types/finances'

const fmt = (n: number, currency = 'MXN') =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function CobrosPage() {
  const { data, loading, error, refetch } = useFinances()

  if (loading && !data) {
    return (
      <div className="h-full overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="h-8 w-56 rounded-lg bg-card animate-pulse" />
        <div className="h-96 rounded-2xl bg-card animate-pulse" />
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <Wallet size={28} className="text-muted" />
        <p className="text-sm text-muted max-w-sm">No se pudieron cargar los cobros{error ? `: ${error}` : ''}</p>
        <button onClick={refetch} className="nav-item text-xs border border-border-subtle px-3">
          <RefreshCw size={13} /> Reintentar
        </button>
      </div>
    )
  }

  const { recurring, accounts, summary } = data
  const monthly = recurring.filter((r) => r.periodicity === 'mensual').sort((a, b) => a.charge_day - b.charge_day)
  const annual = recurring.filter((r) => r.periodicity === 'anual').sort((a, b) => (a.charge_month ?? 0) - (b.charge_month ?? 0))

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-5">
      {/* Header con botón de regreso */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <Link href="/finanzas" className="nav-item text-xs border border-border-subtle px-2 py-1.5 rounded-lg" title="Volver a Finanzas">
              <ArrowLeft size={14} />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2.5">
              <CalendarClock size={22} className="text-primary" /> Cobros fijos
            </h1>
          </div>
          <p className="text-xs text-muted mt-1">
            Suscripciones y cobros que se repiten cada mes (renta, nómina, software). Tu gasto base,
            lo captures o no. Para dar de alta/baja o cambiar montos, díselo a tu agente.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-muted font-semibold">Total mensual</p>
          <p className="text-xl font-bold tabular-nums">{fmt(summary.recurring_monthly_mxn)}</p>
          <p className="text-[10px] text-muted">/mes (anuales prorrateadas)</p>
        </div>
      </div>

      {!recurring.length ? (
        <div className="rounded-xl border border-dashed border-border-subtle p-4">
          <p className="text-sm font-medium text-foreground/80">Aún no hay cobros fijos cargados</p>
          <p className="text-xs text-muted mt-1">
            Dile a tu agente: “carga mis suscripciones” y dicta la lista (nombre, monto, día de cobro, cuenta).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="titanium-panel rounded-2xl p-4 space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-muted font-semibold">Mensuales</h2>
            <RecurringList items={monthly} accounts={accounts} />
          </section>
          <section className="titanium-panel rounded-2xl p-4 space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-muted font-semibold">Anuales</h2>
            {annual.length ? <RecurringList items={annual} accounts={accounts} /> : (
              <p className="text-xs text-muted">Sin cobros anuales.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function RecurringList({ items, accounts }: { items: FinanceRecurring[]; accounts: FinanceAccount[] }) {
  const nameById = new Map(accounts.map((a) => [a.id, a.name]))
  return (
    <div className="space-y-1">
      {items.map((r) => {
        const acct = r.account_id ? nameById.get(r.account_id) : null
        return (
          <div key={r.id} className="flex items-center gap-2.5 text-sm py-1.5 border-b border-border-subtle last:border-0">
            <span className="text-[11px] text-muted tabular-nums w-14 shrink-0 text-center">
              {r.periodicity === 'anual' && r.charge_month ? `${r.charge_day} ${MONTHS_ES[r.charge_month - 1]}` : `día ${r.charge_day}`}
            </span>
            {acct && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: accountColor(acct) }} />}
            <span className="flex-1 min-w-0 truncate text-foreground/85">
              {r.name}
              <span className="text-[10px] text-muted"> · {r.category}</span>
            </span>
            <span className="tabular-nums font-medium shrink-0">
              {fmt(r.amount, r.currency)} <span className="text-[10px] text-muted">{r.currency}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
