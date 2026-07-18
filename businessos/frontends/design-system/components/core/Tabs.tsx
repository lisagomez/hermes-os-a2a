'use client';
import React from 'react';

/** Tabs mono para paneles (Operativo/Financiero/Proyección). */
export interface TabsProps {
  tabs: { value: string; label: string }[];
  value: string;
  onChange?: (value: string) => void;
}

export function Tabs({ tabs, value, onChange }: TabsProps) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            onClick={() => onChange && onChange(t.value)}
            style={{
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '.06em',
              padding: '7px 14px',
              borderRadius: 'var(--radius-s)',
              transition: 'var(--ease-ui)',
              border: active ? '1px solid rgba(159,123,255,.5)' : '1px solid var(--border-1)',
              background: active ? 'rgba(124,92,255,.15)' : 'transparent',
              color: active ? 'var(--lilac)' : 'var(--text-3)',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
