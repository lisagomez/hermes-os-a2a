'use client';
import { useLanding } from '../context';

export function Footer() {
  const { t } = useLanding();
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-1)',
        padding: '26px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: 'var(--page-max)',
        margin: '0 auto',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--orb-violet)' }} />
        <span style={{ fontWeight: 700, letterSpacing: '.12em', fontSize: 13 }}>A2A·FACTORY</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>{t.footer}</div>
    </footer>
  );
}
