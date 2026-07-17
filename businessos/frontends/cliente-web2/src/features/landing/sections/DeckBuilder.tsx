'use client';
import { useLanding } from '../context';
import { agentById, deckEconomics } from '../agents';

export function DeckBuilder() {
  const { lang, t, deck, removeFromDeck } = useLanding();
  const econ = deckEconomics(deck, lang);
  const hasDeck = deck.length > 0;

  return (
    <section id="deck" style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: '40px 32px' }}>
      <div
        className="a2a-deck-grid a2a-reveal"
        style={{
          border: '1px solid var(--border-2)',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(160deg, rgba(124,92,255,.1), #0F0D16 55%)',
          padding: 30,
        }}
      >
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 'var(--tracking-kicker)', color: 'var(--violet)', marginBottom: 10 }}>
            ⬢ {t.deckKicker}
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700 }}>{t.deckTitle}</h2>
          <p style={{ margin: '0 0 18px', color: 'var(--text-2)', fontSize: 14.5, lineHeight: 'var(--leading-body)' }}>{t.deckSub}</p>

          {hasDeck ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {deck.map((id) => {
                const a = agentById(id);
                if (!a) return null;
                const orbBg = a.orb === 'pink' ? 'var(--orb-pink)' : 'var(--orb-violet)';
                return (
                  <div
                    key={id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      border: '1px solid var(--border-3)',
                      background: 'var(--surface-3)',
                      borderRadius: 12,
                      padding: '8px 12px',
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: orbBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#fff',
                      }}
                    >
                      {a.glyph}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--energy)' }}>⚡{a.energy}</span>
                    <button
                      onClick={() => removeFromDeck(id)}
                      aria-label={`Quitar ${a.name}`}
                      style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 14, padding: '0 2px' }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                border: '1px dashed var(--border-3)',
                borderRadius: 14,
                padding: 22,
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: 'var(--text-3)',
              }}
            >
              {t.deckEmpty}
            </div>
          )}
        </div>

        <div
          style={{
            border: '1px solid var(--border-2)',
            borderRadius: 'var(--radius-l)',
            background: 'var(--surface-1)',
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.16em', color: 'var(--text-3)' }}>{t.quoteTitle}</div>
          <Row label={t.quoteAgents} value={String(econ.count)} />
          <Row label={t.quoteEnergy} value={`⚡ ${econ.energy}`} valueColor="var(--energy)" />
          <Row label={t.quoteSetup} value={econ.weeksLabel} />
          <div style={{ height: 1, background: 'var(--border-2)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ color: 'var(--text-2)', fontSize: 14 }}>{t.quoteMonthly}</span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                background: 'var(--grad-text)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {econ.priceLabel}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>{t.quoteNote}</div>
          <a
            href="#agenda"
            style={{
              textAlign: 'center',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--on-accent)',
              background: 'var(--grad-brand)',
              padding: '12px 0',
              borderRadius: 12,
              marginTop: 4,
            }}
          >
            {t.quoteCta}
          </a>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
      <span style={{ color: 'var(--text-2)' }}>{label}</span>
      <span style={{ fontWeight: 700, color: valueColor }}>{value}</span>
    </div>
  );
}
