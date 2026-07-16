import React from 'react';

/** KPI del panel operativo/financiero. */
export interface KpiCardProps {
  label: string;
  value: string;
  /** texto tras ▲, p.ej. "12% vs semana previa" */
  trend?: string;
  tint?: 'violet' | 'pink';
  /** 0-100: pinta barra de progreso */
  progress?: number;
}

export function KpiCard({ label, value, trend, tint = 'violet', progress }: KpiCardProps) {
  const bg = tint === 'pink' ? 'rgba(255,77,141,.04)' : 'rgba(124,92,255,.05)';
  return (
    <div style={{ border: '1px solid var(--border-1)', borderRadius: 'var(--radius-m)', padding: 14, background: bg }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-1)' }}>{value}</div>
      {progress != null && (
        <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,.08)', marginTop: 8 }}>
          <div style={{ width: progress + '%', height: 5, borderRadius: 99, background: 'var(--grad-stat)' }} />
        </div>
      )}
      {trend && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--success)', marginTop: 8 }}>▲ {trend}</div>}
    </div>
  );
}
