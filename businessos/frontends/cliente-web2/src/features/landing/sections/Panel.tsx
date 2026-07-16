'use client';
import { Tabs, KpiCard } from '@a2a/design-system';
import { useLanding, type PanelTab } from '../context';

function Bullet({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <span style={{ color }}>◆</span>
      {children}
    </div>
  );
}

function BudgetBar({ label, pct, amount }: { label: string; pct: number; amount: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', width: 140 }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,.07)' }}>
        <div style={{ width: `${pct}%`, height: 6, borderRadius: 99, background: 'var(--grad-stat)' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-soft)' }}>{amount}</span>
    </div>
  );
}

export function Panel() {
  const { t, panelTab, setPanelTab } = useLanding();
  return (
    <section style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: '46px 32px' }}>
      <div className="a2a-panel-grid a2a-reveal">
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 'var(--tracking-kicker)', color: 'var(--pink-soft)', marginBottom: 10 }}>
            ▦ {t.panelKicker}
          </div>
          <h2 style={{ margin: '0 0 12px', fontSize: 32, fontWeight: 700 }}>{t.panelTitle}</h2>
          <p style={{ margin: '0 0 18px', color: 'var(--text-2)', fontSize: 15, lineHeight: 1.65 }}>{t.panelSub}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: 'var(--text-soft)' }}>
            <Bullet color="var(--violet)">{t.panelB1}</Bullet>
            <Bullet color="var(--pink-soft)">{t.panelB2}</Bullet>
            <Bullet color="var(--violet)">{t.panelB3}</Bullet>
          </div>
        </div>

        <div style={{ border: '1px solid var(--border-2)', borderRadius: 18, background: 'var(--surface-1)', boxShadow: 'var(--shadow-panel)', overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '13px 18px',
              borderBottom: '1px solid var(--border-1)',
              background: 'var(--surface-2)',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)' }}>{t.dashTitle}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--success)' }}>● LIVE</span>
          </div>
          <div style={{ padding: '12px 18px 0' }}>
            <Tabs
              tabs={[
                { value: 'ops', label: t.tabOps },
                { value: 'fin', label: t.tabFin },
                { value: 'proj', label: t.tabProj },
              ]}
              value={panelTab}
              onChange={(v) => setPanelTab(v as PanelTab)}
            />
          </div>

          {panelTab === 'ops' && (
            <>
              <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                <KpiCard label={t.kpi1} value="68%" tint="violet" progress={68} />
                <KpiCard label={t.kpi2} value="1,284" tint="pink" trend={`12% ${t.kpiWeek}`} />
                <KpiCard label={t.kpi3} value="$4.2k" tint="violet" trend={t.kpiSaved} />
              </div>
              <div style={{ padding: '0 18px 18px' }}>
                <div
                  style={{
                    border: '1px solid var(--border-1)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    lineHeight: 1.9,
                    color: 'var(--text-2)',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--rarity-rare)' }}>◆ vendo-1</span> — {t.act1}
                  </div>
                  <div>
                    <span style={{ color: 'var(--lilac)' }}>◆ tesoro</span> — {t.act2}
                  </div>
                  <div>
                    <span style={{ color: 'var(--success-soft)' }}>◆ flujo-7</span> — {t.act3}
                  </div>
                </div>
              </div>
            </>
          )}

          {panelTab === 'fin' && (
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ border: '1px solid var(--border-1)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <BudgetBar label={t.fin1} pct={68} amount="$6.8k / $10k" />
                <BudgetBar label={t.fin2} pct={41} amount="$1.2k / $3k" />
                <BudgetBar label={t.fin3} pct={55} amount="$2.2k / $4k" />
              </div>
              <div
                style={{
                  border: '1px solid rgba(232,163,32,.35)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--energy-bright)',
                  background: 'rgba(232,163,32,.05)',
                }}
              >
                ⚠ {t.finAlert}
              </div>
            </div>
          )}

          {panelTab === 'proj' && (
            <div style={{ padding: 18 }}>
              <div style={{ border: '1px solid var(--border-1)', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>{t.projTitle}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--violet)' }}>Q3–Q4 2026</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
                  {[
                    { h: '34%', bg: 'rgba(159,123,255,.35)' },
                    { h: '42%', bg: 'rgba(159,123,255,.45)' },
                    { h: '50%', bg: 'rgba(159,123,255,.55)' },
                    { h: '63%', bg: 'rgba(255,77,141,.55)' },
                    { h: '76%', bg: 'rgba(255,77,141,.7)' },
                    { h: '92%', bg: 'linear-gradient(180deg,#FF4D8D,#9F7BFF)' },
                  ].map((b, i) => (
                    <div key={i} style={{ flex: 1, height: b.h, borderRadius: '6px 6px 0 0', background: b.bg }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)' }}>
                  {['JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'].map((m) => (
                    <span key={m} style={{ flex: 1, textAlign: 'center' }}>
                      {m}
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--success-soft)' }}>✓ {t.projNote}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
