'use client';

const ITEMS: { text: string; color?: string }[] = [
  { text: '$ a2a quote --skills crm,web3' },
  { text: '◆ crm', color: 'var(--violet)' },
  { text: '$ a2a provision --deck mi-mazo' },
  { text: '◆ ops', color: 'var(--pink-soft)' },
  { text: '$ a2a monitor --panel fin' },
  { text: '◆ data', color: 'var(--violet)' },
  { text: '$ a2a settle --usdc' },
  { text: '◆ web3', color: 'var(--pink-soft)' },
  { text: '◆ marketing', color: 'var(--violet)' },
  { text: '◆ support', color: 'var(--pink-soft)' },
  { text: '◆ legal', color: 'var(--violet)' },
  { text: '◆ finance', color: 'var(--pink-soft)' },
];

function Row() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 44,
        paddingRight: 44,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--text-dim)',
        whiteSpace: 'nowrap',
      }}
    >
      {ITEMS.map((it, i) => (
        <span key={i} style={it.color ? { color: it.color } : undefined}>
          {it.text}
        </span>
      ))}
    </div>
  );
}

export function Ticker() {
  return (
    <div
      style={{
        borderTop: '1px solid var(--border-1)',
        borderBottom: '1px solid var(--border-1)',
        background: '#0D0B13',
        overflow: 'hidden',
        padding: '12px 0',
      }}
    >
      <div style={{ display: 'flex', width: 'max-content', animation: 'a2a-ticker 32s linear infinite' }}>
        <Row />
        <Row />
      </div>
    </div>
  );
}
