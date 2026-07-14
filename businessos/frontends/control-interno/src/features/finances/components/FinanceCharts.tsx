'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { Activity } from 'lucide-react'
import type { SeriesPoint } from '../types/finances'

// Tooltip unificado al design system.
const CHART_TOOLTIP: React.CSSProperties = {
  backgroundColor: 'var(--surface-elevated)',
  border: '1px solid var(--glass-border)',
  borderRadius: 10,
  color: 'var(--foreground)',
  boxShadow: 'var(--shadow-lg)',
  fontSize: 12,
}
const CHART_TOOLTIP_LABEL: React.CSSProperties = { color: 'var(--muted)' }
const AXIS_TICK = { fill: 'rgba(255,255,255,0.4)', fontSize: 10 }
const GRID_STROKE = 'rgba(255,255,255,0.04)'

const INCOME = '#10B981' // verde
const EXPENSE = '#EF4444' // rojo

const kfmt = (v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)
const fullMxn = (v: number) => `$${Math.round(v).toLocaleString('es-MX')}`
const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

/**
 * La ÚNICA gráfica del dashboard: curva de INGRESOS (verde) vs GASTOS (rojo) ACUMULADOS
 * a lo largo del rango seleccionado. La distancia entre las dos curvas = tu neto del período.
 */
export function IncomeExpenseCurve({ series, days }: { series: SeriesPoint[]; days: number }) {
  const data = useMemo(
    () => series.map((p) => ({ date: shortDate(p.date), Ingresos: p.income_mxn, Gastos: p.expense_mxn })),
    [series],
  )
  // Con muchos puntos (rangos largos) espaciamos los ticks del eje X.
  const tickInterval = days <= 31 ? 4 : days <= 92 ? 12 : Math.floor(days / 8)
  const hasData = series.some((p) => p.income_mxn > 0 || p.expense_mxn > 0)

  return (
    <section className="titanium-panel rounded-2xl p-4 space-y-3">
      <h2 className="text-xs uppercase tracking-widest text-muted font-semibold flex items-center gap-2">
        <Activity size={13} /> Ingresos vs gastos
      </h2>
      {!hasData ? (
        <p className="text-xs text-muted py-12 text-center">
          Sin movimientos en este rango todavía. Conforme captures con tu agente, aquí verás tus
          <span className="text-success"> ingresos</span> y tus
          <span className="text-error"> gastos</span> acumularse día a día.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 6, right: 10, left: 6, bottom: 0 }}>
            <defs>
              <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={INCOME} stopOpacity={0.3} />
                <stop offset="95%" stopColor={INCOME} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={EXPENSE} stopOpacity={0.28} />
                <stop offset="95%" stopColor={EXPENSE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID_STROKE} />
            <XAxis dataKey="date" tick={AXIS_TICK} interval={tickInterval} minTickGap={16} />
            <YAxis tick={AXIS_TICK} tickFormatter={kfmt} width={46} />
            <Tooltip
              contentStyle={CHART_TOOLTIP}
              labelStyle={CHART_TOOLTIP_LABEL}
              formatter={(value, name) => [fullMxn(Number(value)), name]}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="Ingresos" stroke={INCOME} fill="url(#incGrad)" strokeWidth={2.5} />
            <Area type="monotone" dataKey="Gastos" stroke={EXPENSE} fill="url(#expGrad)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}
