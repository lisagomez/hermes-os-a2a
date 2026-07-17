'use client';
import { useLanding } from '../context';

export function Steps() {
  const { t } = useLanding();
  const steps = [
    { n: '01', k: t.step1k, title: t.step1t, desc: t.step1d, accent: 'var(--violet)', tint: 'rgba(124,92,255,.07)' },
    { n: '02', k: t.step2k, title: t.step2t, desc: t.step2d, accent: 'var(--pink-soft)', tint: 'rgba(255,77,141,.06)' },
    { n: '03', k: t.step3k, title: t.step3t, desc: t.step3d, accent: 'var(--violet)', tint: 'rgba(124,92,255,.07)' },
  ];
  return (
    <section style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: '40px 32px' }}>
      <div className="a2a-grid-3 a2a-reveal">
        {steps.map((s) => (
          <div
            key={s.n}
            className="a2a-lift"
            style={{
              border: '1px solid var(--border-1)',
              borderRadius: 18,
              padding: 26,
              background: `linear-gradient(180deg, ${s.tint}, rgba(255,255,255,.015))`,
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: s.accent, marginBottom: 12 }}>
              {s.n} / {s.k}
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
            <div style={{ fontSize: 14, lineHeight: 'var(--leading-body)', color: 'var(--text-2)' }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
