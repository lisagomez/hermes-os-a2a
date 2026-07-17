'use client';
import React from 'react';
import { Badge } from '../core/Badge';
import { EnergyChip } from '../core/EnergyChip';
import { StatBar } from '../core/StatBar';

/** A2A Card coleccionable de un agente. */
export interface AgentCardProps {
  name: string;
  /** 2 chars mono en el orbe, p.ej. "V1" */
  glyph: string;
  role: string;
  rarity?: 'legendary' | 'epic' | 'rare';
  rarityLabel?: string;
  energy?: number;
  flavor?: string;
  stats?: { aut: number; vel: number; int: number };
  orb?: 'violet' | 'pink';
  inDeck?: boolean;
  onDemo?: () => void;
  onToggle?: () => void;
  demoLabel?: string;
  deckLabel?: string;
}

export function AgentCard({
  name,
  glyph,
  role,
  rarity = 'epic',
  rarityLabel = 'ÉPICA',
  energy = 3,
  flavor,
  stats = { aut: 7, vel: 8, int: 8 },
  orb = 'violet',
  inDeck = false,
  onDemo,
  onToggle,
  demoLabel = 'Demo',
  deckLabel = '+ Mazo',
}: AgentCardProps) {
  const orbBg = orb === 'pink' ? 'var(--orb-pink)' : 'var(--orb-violet)';
  const glow = orb === 'pink' ? 'rgba(255,77,141,.28)' : 'rgba(124,92,255,.3)';
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-l)',
        border: '1px solid ' + (inDeck ? 'rgba(232,163,32,.6)' : 'var(--border-2)'),
        background: 'linear-gradient(170deg, rgba(124,92,255,.08), #0F0D16 60%)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        width: 270,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 8px' }}>
        <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '.03em', fontFamily: 'var(--font-display)', color: 'var(--text-1)' }}>
          {name}
        </div>
        <EnergyChip value={energy} />
      </div>
      <div
        style={{
          margin: '0 14px',
          height: 96,
          borderRadius: 10,
          background: 'repeating-linear-gradient(45deg,#141122,#141122 8px,#181430 8px,#181430 16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-1)',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: orbBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 17,
            color: '#fff',
            boxShadow: '0 0 22px ' + glow,
          }}
        >
          {glyph}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 0' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)' }}>{role}</div>
        <Badge tone={rarity}>{rarityLabel}</Badge>
      </div>
      <div
        style={{
          padding: '8px 14px 0',
          fontSize: 12.5,
          lineHeight: 1.5,
          color: 'var(--text-soft)',
          fontStyle: 'italic',
          minHeight: 56,
          fontFamily: 'var(--font-display)',
        }}
      >
        &ldquo;{flavor}&rdquo;
      </div>
      <div style={{ padding: '10px 14px 4px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <StatBar label="AUT" value={stats.aut} />
        <StatBar label="VEL" value={stats.vel} />
        <StatBar label="INT" value={stats.int} />
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '12px 14px 14px', marginTop: 'auto' }}>
        <button
          onClick={onDemo}
          style={{
            flex: 1,
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
            fontSize: 12.5,
            fontWeight: 700,
            color: 'var(--on-accent)',
            background: 'var(--grad-brand)',
            border: 'none',
            borderRadius: 10,
            padding: '9px 0',
          }}
        >
          ▶ {demoLabel}
        </button>
        <button
          onClick={onToggle}
          style={{
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
            fontSize: 12.5,
            fontWeight: 700,
            padding: '9px 12px',
            borderRadius: 10,
            background: inDeck ? 'rgba(232,163,32,.15)' : 'rgba(255,255,255,.05)',
            color: inDeck ? 'var(--energy-bright)' : 'var(--text-1)',
            border: inDeck ? '1px solid rgba(232,163,32,.5)' : '1px solid var(--border-3)',
          }}
        >
          {inDeck ? '✓ En mazo' : deckLabel}
        </button>
      </div>
    </div>
  );
}
