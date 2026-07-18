'use client';
import { useEffect, useRef, useState } from 'react';
import { TerminalWindow, type TerminalLine } from '@a2a/design-system';
import type { Lang } from '@/shared/i18n/strings';
import { useLanding } from '../context';

type Step = { text: string; kind: TerminalLine['kind']; typed?: boolean };

const SCRIPTS: Record<Lang, Step[]> = {
  es: [
    { text: '$ a2a init --caso "ecommerce" --alcance full', kind: 'cmd', typed: true },
    { text: '✓ analizando caso de uso…', kind: 'ok' },
    { text: '✓ 3 agentes recomendados: vendo-1, oraculo, tesoro', kind: 'ok' },
    { text: '$ a2a deploy --panel ops+fin', kind: 'cmd', typed: true },
    { text: '⚙ adaptando agentes a tu flujo…', kind: 'sys' },
    { text: '✓ panel listo → https://panel.tu-empresa.a2a', kind: 'ok' },
    { text: '$ a2a status', kind: 'cmd', typed: true },
    { text: '● 3/3 agentes activos · presupuesto 68% · proyección ▲', kind: 'agt' },
  ],
  en: [
    { text: '$ a2a init --case "ecommerce" --scope full', kind: 'cmd', typed: true },
    { text: '✓ analyzing use case…', kind: 'ok' },
    { text: '✓ 3 recommended agents: vendo-1, oraculo, tesoro', kind: 'ok' },
    { text: '$ a2a deploy --panel ops+fin', kind: 'cmd', typed: true },
    { text: '⚙ tailoring agents to your flow…', kind: 'sys' },
    { text: '✓ panel ready → https://panel.your-company.a2a', kind: 'ok' },
    { text: '$ a2a status', kind: 'cmd', typed: true },
    { text: '● 3/3 agents active · budget 68% · projection ▲', kind: 'agt' },
  ],
};

function LiveTerminal({ title, script }: { title: string; script: Step[] }) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    let i = 0;
    const run = () => {
      if (!alive) return;
      if (i >= script.length) {
        timer.current = setTimeout(() => {
          if (!alive) return;
          setLines([]);
          i = 0;
          run();
        }, 4000);
        return;
      }
      const step = script[i];
      if (step.typed) {
        let p = 0;
        const typeChar = () => {
          if (!alive) return;
          p += 1;
          const done = p >= step.text.length;
          const idx = i;
          setLines((prev) => [...prev.slice(0, idx), { text: step.text.slice(0, p), kind: step.kind }]);
          if (done) {
            i += 1;
            timer.current = setTimeout(run, 500);
          } else {
            timer.current = setTimeout(typeChar, 34);
          }
        };
        typeChar();
      } else {
        const idx = i;
        setLines((prev) => [...prev.slice(0, idx), { text: step.text, kind: step.kind }]);
        i += 1;
        timer.current = setTimeout(run, 620);
      }
    };
    run();
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [script]);

  return <TerminalWindow title={title} lines={lines} cursor minHeight={230} />;
}

function NetworkMini() {
  const pink = '#FF4D8D';
  const nodes = [
    { cx: 40, cy: 20, d: '0s' },
    { cx: 30, cy: 60, d: '.4s' },
    { cx: 46, cy: 104, d: '.8s' },
    { cx: 480, cy: 20, d: '.2s' },
    { cx: 490, cy: 60, d: '.6s' },
    { cx: 474, cy: 104, d: '1s' },
  ];
  const paths = [
    'M40 20 C140 30, 180 55, 236 60',
    'M30 60 C130 60, 170 60, 236 60',
    'M46 104 C150 92, 190 68, 236 62',
    'M284 60 C340 55, 380 30, 480 20',
    'M284 60 C350 60, 390 60, 490 60',
    'M284 62 C330 68, 370 92, 474 104',
  ];
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 0' }}>
      <svg viewBox="0 0 520 120" style={{ width: '100%', height: 110, overflow: 'visible' }}>
        {paths.map((d, i) => (
          <path key={i} d={d} stroke={pink} strokeOpacity={i % 3 === 1 ? 0.6 : 0.45} strokeWidth={1.5} fill="none" />
        ))}
        {nodes.map((n, i) => (
          <circle key={i} cx={n.cx} cy={n.cy} r={5} fill={pink} style={{ animation: `a2a-blink 2.4s ${n.d} infinite` }} />
        ))}
      </svg>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%,-50%)',
          width: 88,
          height: 88,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #8B63FF, #4B23D6 75%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          fontWeight: 600,
          boxShadow: '0 0 60px 10px rgba(124,92,255,.45), inset 0 0 40px rgba(124,92,255,.5)',
          border: '1px solid rgba(255,255,255,.25)',
        }}
      >
        agent
      </div>
    </div>
  );
}

export function Hero() {
  const { t, lang } = useLanding();
  return (
    <section style={{ position: 'relative', padding: '72px 32px 40px', maxWidth: 'var(--page-max)', margin: '0 auto' }}>
      <div className="a2a-hero-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div
            style={{
              display: 'inline-flex',
              alignSelf: 'flex-start',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--pink-soft)',
              border: '1px solid rgba(255,77,141,.35)',
              borderRadius: 'var(--radius-pill)',
              padding: '6px 14px',
              background: 'rgba(255,77,141,.06)',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--pink)' }} className="a2a-cursor" />
            {t.heroBadge}
          </div>
          <h1 style={{ margin: 0, fontSize: 'var(--text-hero)', lineHeight: 'var(--leading-tight)', fontWeight: 700, letterSpacing: '-.01em' }}>
            {t.heroTitle1}{' '}
            <span style={{ background: 'var(--grad-text)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              {t.heroTitle2}
            </span>
          </h1>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 'var(--leading-body)', color: 'var(--text-2)', maxWidth: 520 }}>{t.heroSub}</p>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <a
              href="#agenda"
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--on-accent)',
                background: 'var(--grad-brand)',
                padding: '14px 26px',
                borderRadius: 14,
                boxShadow: 'var(--glow-violet)',
              }}
            >
              {t.ctaCall}
            </a>
            <a
              href="#cards"
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--text-1)',
                border: '1px solid var(--border-3)',
                padding: '13px 24px',
                borderRadius: 14,
                background: 'rgba(255,255,255,.03)',
              }}
            >
              {t.ctaCards}
            </a>
          </div>
          <div style={{ display: 'flex', gap: 26, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)', flexWrap: 'wrap' }}>
            <span>▸ {t.chip1}</span>
            <span>▸ {t.chip2}</span>
            <span>▸ {t.chip3}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <LiveTerminal title={`a2a-cli — ${t.termTitle}`} script={SCRIPTS[lang]} />
          <NetworkMini />
        </div>
      </div>
    </section>
  );
}
