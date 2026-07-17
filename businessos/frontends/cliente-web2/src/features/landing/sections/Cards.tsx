'use client';
import { AgentCard } from '@a2a/design-system';
import { useLanding } from '../context';
import { AGENTS, RARITY_LABEL, flavorFor } from '../agents';

export function Cards() {
  const { lang, mode, t, inDeck, toggleDeck, openDemo } = useLanding();
  return (
    <section id="cards" style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: '56px 32px 30px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 8, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 'var(--tracking-kicker)', color: 'var(--pink-soft)', marginBottom: 10 }}>
            ★ A2A CARDS
          </div>
          <h2 style={{ margin: 0, fontSize: 34, fontWeight: 700 }}>{t.cardsTitle}</h2>
          <p style={{ margin: '10px 0 0', color: 'var(--text-2)', fontSize: 15, maxWidth: 560, lineHeight: 'var(--leading-body)' }}>{t.cardsSub}</p>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)', textAlign: 'right', flexShrink: 0, whiteSpace: 'pre-line' }}>
          {t.cardsHint}
        </div>
      </div>
      <div className="a2a-grid-4 a2a-reveal" style={{ marginTop: 26, justifyItems: 'center' }}>
        {AGENTS.map((a) => (
          <AgentCard
            key={a.id}
            name={a.name}
            glyph={a.glyph}
            role={a.role[lang]}
            rarity={a.tone}
            rarityLabel={RARITY_LABEL[a.tone][lang]}
            energy={a.energy}
            flavor={flavorFor(a, mode, lang)}
            stats={a.stats}
            orb={a.orb}
            inDeck={inDeck(a.id)}
            onDemo={() => openDemo(a.id)}
            onToggle={() => toggleDeck(a.id)}
            demoLabel={t.btnDemo}
            deckLabel={lang === 'en' ? '+ Deck' : '+ Mazo'}
          />
        ))}
      </div>
    </section>
  );
}
