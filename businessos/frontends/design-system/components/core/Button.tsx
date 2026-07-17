'use client';
import React from 'react';

/** Botón principal de la marca: gradiente firma + glow. */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 'primary' = gradiente firma + glow; 'secondary' = borde translúcido; 'ghost' = solo texto */
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', children, style, ...rest }: ButtonProps) {
  const pad = size === 'sm' ? '8px 16px' : size === 'lg' ? '14px 26px' : '11px 20px';
  const fs = size === 'sm' ? 13 : size === 'lg' ? 15 : 14;
  const base: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: fs,
    padding: pad,
    borderRadius: 'var(--radius-m)',
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'var(--ease-ui)',
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { color: 'var(--on-accent)', background: 'var(--grad-brand)', boxShadow: 'var(--glow-violet)' },
    secondary: { color: 'var(--text-1)', background: 'rgba(255,255,255,.03)', borderColor: 'var(--border-3)' },
    ghost: { color: 'var(--text-2)', background: 'transparent' },
  };
  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {children}
    </button>
  );
}
