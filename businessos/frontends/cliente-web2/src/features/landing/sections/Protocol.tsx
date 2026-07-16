'use client';
import { useLanding } from '../context';

const AGENT_JSON = `{
  "name": "a2a-factory",
  "protocol": "a2a/1.0",
  "capabilities": [
    "quote", "provision", "monitor", "settle"
  ],
  "skills": ["crm","ops","data","web3",
             "marketing","support","legal","finance"],
  "pricing": { "unit": "energy", "settle": ["fiat","usdc"] },
  "endpoint": "https://api.a2a.factory/rpc"
}`;

export function Protocol() {
  const { t } = useLanding();
  return (
    <section style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: '46px 32px' }}>
      <div className="a2a-two-col a2a-reveal">
        <div style={{ border: '1px solid var(--border-2)', borderRadius: 'var(--radius-l)', background: 'var(--surface-1)', overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-1)',
              background: 'var(--surface-2)',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)' }}>GET /.well-known/agent-card.json</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--energy)',
                border: '1px solid rgba(232,163,32,.4)',
                borderRadius: 6,
                padding: '2px 7px',
              }}
            >
              {t.simBadge}
            </span>
          </div>
          <pre
            style={{
              margin: 0,
              padding: '18px 20px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              lineHeight: 1.7,
              color: 'var(--text-soft)',
              overflowX: 'auto',
            }}
          >
            {AGENT_JSON}
          </pre>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 'var(--tracking-kicker)', color: 'var(--violet)', marginBottom: 10 }}>
            ⇄ {t.a2aKicker}
          </div>
          <h2 style={{ margin: '0 0 12px', fontSize: 32, fontWeight: 700 }}>{t.a2aTitle}</h2>
          <p style={{ margin: '0 0 18px', color: 'var(--text-2)', fontSize: 15, lineHeight: 1.65 }}>{t.a2aSub}</p>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12.5,
              background: 'var(--surface-2)',
              border: '1px solid var(--border-2)',
              borderRadius: 12,
              padding: '14px 16px',
              color: 'var(--success-soft)',
              lineHeight: 1.8,
              overflowX: 'auto',
            }}
          >
            $ curl -s https://api.a2a.factory/rpc \<br />
            &nbsp;&nbsp;-d {`'{"method":"quote","skills":["crm","web3"]}'`}
          </div>
        </div>
      </div>
    </section>
  );
}
