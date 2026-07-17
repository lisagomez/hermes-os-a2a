import React from 'react';

/** Barra de stat (AUT/VEL/INT) con gradiente firma. */
export interface StatBarProps {
  label: string;
  value: number;
  max?: number;
}

export function StatBar({ label, value, max = 10 }: StatBarProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', width: 44 }}>{label}</span>
      <div style={{ flex: 1, height: 5, borderRadius: 99, background: 'rgba(255,255,255,.07)' }}>
        <div style={{ height: 5, borderRadius: 99, background: 'var(--grad-stat)', width: (value / max) * 100 + '%' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-soft)' }}>{value}</span>
    </div>
  );
}
