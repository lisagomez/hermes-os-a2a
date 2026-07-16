import React from 'react';

/** Chip circular dorado de energía (coste relativo de un agente). */
export interface EnergyChipProps {
  value: number;
  size?: number;
}

export function EnergyChip({ value, size = 26 }: EnergyChipProps) {
  return (
    <div
      title="energy"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--orb-energy)',
        color: '#3A2A00',
        fontWeight: 700,
        fontSize: size * 0.5,
        fontFamily: 'var(--font-display)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--glow-energy)',
      }}
    >
      {value}
    </div>
  );
}
