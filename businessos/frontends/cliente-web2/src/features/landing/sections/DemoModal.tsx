'use client';
import { useEffect } from 'react';
import { useLanding } from '../context';
import { agentById, type DemoKind } from '../agents';

const KIND_COLOR: Record<DemoKind, string> = {
  cmd: 'var(--text-1)',
  sys: 'var(--lilac)',
  usr: 'var(--text-3)',
  agt: 'var(--pink-pale)',
  ok: 'var(--success-soft)',
  kpi: 'var(--energy-bright)',
};

export function DemoModal() {
  const { lang, t, openId, demoStep, closeDemo, replayDemo, modalAddDeck } = useLanding();

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDemo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openId, closeDemo]);

  const agent = openId ? agentById(openId) : undefined;
  if (!agent) return null;

  const lines = agent.demo.slice(0, demoStep);
  const running = demoStep < agent.demo.length;
  const orbBg = agent.orb === 'pink' ? 'var(--orb-pink)' : 'var(--orb-violet)';

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={closeDemo}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(5,4,9,.8)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 640,
          maxWidth: '100%',
          border: '1px solid var(--border-3)',
          borderRadius: 18,
          background: 'var(--surface-1)',
          boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-1)',
            background: 'var(--surface-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: orbBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                color: '#fff',
              }}
            >
              {agent.glyph}
            </span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{agent.name}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)' }}>
              · {agent.role[lang]} · {t.demoLabel}
            </span>
          </div>
          <button onClick={closeDemo} aria-label="Cerrar" style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 18 }}>
            ✕
          </button>
        </div>

        <div
          style={{
            padding: '18px 20px',
            minHeight: 280,
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            lineHeight: 1.8,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {lines.map((l, i) => (
            <div key={i} style={{ color: KIND_COLOR[l.k], whiteSpace: 'pre-wrap' }}>
              {l[lang]}
            </div>
          ))}
          {running && (
            <span style={{ display: 'inline-block', width: 9, height: 16, background: 'var(--pink-soft)' }} className="a2a-cursor" />
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '14px 18px', borderTop: '1px solid var(--border-1)' }}>
          <button
            onClick={replayDemo}
            style={{
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-1)',
              background: 'rgba(255,255,255,.05)',
              border: '1px solid var(--border-3)',
              borderRadius: 10,
              padding: '9px 16px',
            }}
          >
            ↻ {t.demoReplay}
          </button>
          <button
            onClick={modalAddDeck}
            style={{
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--on-accent)',
              background: 'var(--grad-brand)',
              border: 'none',
              borderRadius: 10,
              padding: '9px 16px',
              flex: 1,
            }}
          >
            {t.demoAdd}
          </button>
        </div>
      </div>
    </div>
  );
}
