import React from 'react';

/** Ventana terminal con chrome mac; motif CLI-first de la marca. */
export interface TerminalLine {
  text: string;
  kind?: 'cmd' | 'sys' | 'usr' | 'agt' | 'ok' | 'kpi';
}
export interface TerminalWindowProps {
  title?: string;
  lines?: TerminalLine[];
  cursor?: boolean;
  minHeight?: number;
}

export function TerminalWindow({ title = 'a2a-cli', lines = [], cursor = true, minHeight = 120 }: TerminalWindowProps) {
  const colors: Record<string, string> = {
    cmd: 'var(--text-1)',
    sys: 'var(--lilac)',
    usr: 'var(--text-3)',
    agt: 'var(--pink-pale)',
    ok: 'var(--success-soft)',
    kpi: 'var(--energy-bright)',
  };
  return (
    <div
      style={{
        border: '1px solid var(--border-2)',
        borderRadius: 'var(--radius-l)',
        background: 'var(--surface-1)',
        boxShadow: 'var(--shadow-panel)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '11px 16px',
          borderBottom: '1px solid var(--border-1)',
          background: 'var(--surface-2)',
        }}
      >
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#FF5F57' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#FEBC2E' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#28C840' }} />
        <span style={{ marginLeft: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>{title}</span>
      </div>
      <div style={{ padding: '18px 20px', minHeight, fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.75 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ color: colors[l.kind || 'cmd'] || colors.cmd, whiteSpace: 'pre-wrap' }}>
            {l.text}
          </div>
        ))}
        {cursor && <span style={{ display: 'inline-block', width: 9, height: 17, background: 'var(--violet)', marginTop: 2 }} />}
      </div>
    </div>
  );
}
