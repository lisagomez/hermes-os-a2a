'use client';
import { AgentCard, Badge, Button } from '@a2a/design-system';

const AGENT_CARD_JSON = `GET /.well-known/agent-card.json
{
  "name": "a2a-factory",
  "protocolVersion": "1.0",
  "preferredTransport": "JSONRPC",
  "skills": [
    { "id": "recibir-interes", "name": "Lead white-label" }
  ],
  "capabilities": { "streaming": false }
}`;

const SEND_MESSAGE = `POST /  (JSON-RPC 2.0)
{
  "jsonrpc": "2.0",
  "method": "message/send",
  "params": {
    "message": {
      "role": "user",
      "parts": [{ "data": { "empresa": "Acme", "mensaje": "quiero un CRM" } }]
    }
  },
  "id": "1"
}`;

export default function Page() {
  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Nav */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 32px',
          background: 'rgba(11,10,16,.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--orb-violet)', boxShadow: '0 0 18px rgba(124,92,255,.7)' }} />
          <span style={{ fontWeight: 700, letterSpacing: 'var(--tracking-brand)', fontSize: 15 }}>A2A·FACTORY</span>
          <Badge tone="rare">web3</Badge>
        </div>
        <Badge tone="warning">SCAFFOLD · EN CONSTRUCCIÓN</Badge>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: '64px 32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,.9fr)', gap: 48, alignItems: 'center' }} className="a2a-web3-hero">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                display: 'inline-flex',
                alignSelf: 'flex-start',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--violet)',
                border: '1px solid rgba(159,123,255,.35)',
                borderRadius: 'var(--radius-pill)',
                padding: '6px 14px',
                background: 'rgba(124,92,255,.06)',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--violet)' }} className="a2a-cursor" />
              A2A CARD · WEB3 · SETTLEMENT USDC/FIAT
            </div>
            <h1 style={{ margin: 0, fontSize: 'var(--text-hero)', lineHeight: 'var(--leading-tight)', fontWeight: 700, letterSpacing: '-.01em' }}>
              Contrata a la fábrica{' '}
              <span style={{ background: 'var(--grad-text)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                por protocolo A2A.
              </span>
            </h1>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 'var(--leading-body)', color: 'var(--text-2)', maxWidth: 520 }}>
              Descubrimiento por manifest, cotización por RPC y settlement en fiat o USDC. Tu agente
              habla con nuestros agentes — la identidad y las fronteras las lleva la <strong>Tarjeta A2A</strong>.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Button variant="primary" size="lg">Ver la Tarjeta A2A</Button>
              <Button variant="secondary" size="lg">Leer el manifest</Button>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--energy)',
                border: '1px dashed rgba(232,163,32,.4)',
                borderRadius: 10,
                padding: '10px 14px',
                lineHeight: 1.6,
                maxWidth: 520,
              }}
            >
              {'// scaffold: hereda la paleta/interacción de design/demo-a2acard.html.'}
              <br />
              {'// la app en vivo se conecta a ventas-a2a por el edge (ver INTEGRATION.md).'}
            </div>
          </div>

          <div style={{ justifySelf: 'center' }}>
            <AgentCard
              name="VENTAS-A2A"
              glyph="VA"
              role="Puerta A2A / leads"
              rarity="legendary"
              rarityLabel="LEGENDARIA"
              energy={3}
              orb="violet"
              flavor="Recibe interés por protocolo y abre un lead white-label. Sin humanos en el loop."
              stats={{ aut: 9, vel: 8, int: 8 }}
              demoLabel="Manifest"
              deckLabel="message/send"
            />
          </div>
        </div>
      </section>

      {/* Contrato A2A */}
      <section style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: '24px 32px 72px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 20 }} className="a2a-web3-cols">
          <CodePanel title="1 · Descubrir" code={AGENT_CARD_JSON} />
          <CodePanel title="2 · Contratar" code={SEND_MESSAGE} />
        </div>
        <div
          style={{
            marginTop: 20,
            border: '1px dashed rgba(232,163,32,.4)',
            borderRadius: 'var(--radius-l)',
            padding: '18px 20px',
            fontFamily: 'var(--font-mono)',
            fontSize: 12.5,
            color: 'var(--energy-bright)',
            lineHeight: 1.7,
            background: 'rgba(232,163,32,.04)',
          }}
        >
          ⬢ Capa USDC / Circle (escrow programable, settlement on-chain) = <strong>capa futura</strong> del
          roadmap. Hoy la puerta A2A pública es <code>ventas-a2a</code> vía el edge Caddy; el pago
          fiat va por Polar. No se finge on-chain lo que aún no existe.
        </div>
      </section>
    </div>
  );
}

function CodePanel({ title, code }: { title: string; code: string }) {
  return (
    <div style={{ border: '1px solid var(--border-2)', borderRadius: 'var(--radius-l)', background: 'var(--surface-1)', overflow: 'hidden' }}>
      <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border-1)', background: 'var(--surface-2)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)' }}>
        {title}
      </div>
      <pre style={{ margin: 0, padding: '16px 18px', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7, color: 'var(--text-soft)', overflowX: 'auto' }}>{code}</pre>
    </div>
  );
}
