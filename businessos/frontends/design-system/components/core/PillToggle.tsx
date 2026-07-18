'use client';
import React from 'react';

/** Toggle segmentado tipo pill (Humano/A2A, ES/EN). */
export interface PillToggleProps {
  options: { value: string; label: string }[];
  value: string;
  onChange?: (value: string) => void;
}

export function PillToggle({ options, value, onChange }: PillToggleProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        gap: 2,
        background: 'var(--surface-4)',
        border: '1px solid var(--border-1)',
        borderRadius: 'var(--radius-pill)',
        padding: 3,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange && onChange(o.value)}
            style={{
              cursor: 'pointer',
              border: 'none',
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 13px',
              borderRadius: 'var(--radius-pill)',
              background: active ? 'var(--grad-brand)' : 'transparent',
              color: active ? 'var(--on-accent)' : 'var(--text-3)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
