import React from 'react';

/** Badge mono con borde del color del tono; rarezas de A2A Cards y estados. */
export interface BadgeProps {
  tone?: 'legendary' | 'epic' | 'rare' | 'success' | 'warning';
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const COLORS: Record<string, string> = {
  legendary: 'var(--rarity-legendary)',
  epic: 'var(--rarity-epic)',
  rare: 'var(--rarity-rare)',
  success: 'var(--success-soft)',
  warning: 'var(--energy-bright)',
};

export function Badge({ tone = 'epic', children, style }: BadgeProps) {
  const c = COLORS[tone] || COLORS.epic;
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        color: c,
        border: '1px solid ' + c,
        borderRadius: 6,
        padding: '2px 7px',
        opacity: 0.9,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
