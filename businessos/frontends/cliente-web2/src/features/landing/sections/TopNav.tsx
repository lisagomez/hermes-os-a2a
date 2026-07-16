'use client';
import { PillToggle } from '@a2a/design-system';
import { useLanding } from '../context';
import type { Lang, Shopper } from '@/shared/i18n/strings';

export function TopNav() {
  const { lang, setLang, mode, setMode, t } = useLanding();
  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '14px 32px',
        background: 'rgba(11,10,16,.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-1)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'var(--orb-violet)',
            boxShadow: '0 0 18px rgba(124,92,255,.7)',
          }}
        />
        <span style={{ fontWeight: 700, letterSpacing: 'var(--tracking-brand)', fontSize: 15 }}>A2A·FACTORY</span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-3)',
            border: '1px dashed var(--border-3)',
            borderRadius: 6,
            padding: '2px 6px',
          }}
        >
          {t.brandTbd}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <PillToggle
          options={[
            { value: 'human', label: t.modeHuman },
            { value: 'a2a', label: t.modeA2A },
          ]}
          value={mode}
          onChange={(v) => setMode(v as Shopper)}
        />
        <PillToggle
          options={[
            { value: 'es', label: 'ES' },
            { value: 'en', label: 'EN' },
          ]}
          value={lang}
          onChange={(v) => setLang(v as Lang)}
        />
        <a
          href="#agenda"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--on-accent)',
            background: 'var(--grad-brand)',
            padding: '9px 18px',
            borderRadius: 'var(--radius-pill)',
            boxShadow: 'var(--glow-pink)',
          }}
        >
          {t.ctaCall}
        </a>
      </div>
    </nav>
  );
}
