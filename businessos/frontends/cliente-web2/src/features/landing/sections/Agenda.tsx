'use client';
import { useState, type FormEvent } from 'react';
import { useLanding } from '../context';
import { agentById, deckEconomics } from '../agents';

const DAYS: Record<'es' | 'en', string[]> = {
  es: ['JUE 16', 'VIE 17', 'LUN 20', 'MAR 21', 'MIÉ 22'],
  en: ['THU 16', 'FRI 17', 'MON 20', 'TUE 21', 'WED 22'],
};
const HOURS = ['09:00', '11:00', '13:00', '16:00'];

type Status = 'idle' | 'sending' | 'ok' | 'error';

export function Agenda() {
  const { lang, t, deck, slot, setSlot, confirmed, setConfirmed } = useLanding();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const econ = deckEconomics(deck, lang);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('sending');
    try {
      const mazo = deck.map((id) => agentById(id)?.name).filter(Boolean);
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: name,
          email,
          empresa: company || undefined,
          mensaje: `Interés desde landing web2. Mazo: ${mazo.join(', ') || '(vacío)'}. Estimado: ${econ.priceLabel}. Horario preferido: ${slot || '(sin elegir)'}.`,
          idioma: lang,
          mazo,
          horario: slot || undefined,
        }),
      });
      if (!res.ok) throw new Error('bad status');
      setStatus('ok');
      setConfirmed(true);
    } catch {
      setStatus('error');
    }
  }

  return (
    <section id="agenda" style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: '50px 32px 70px' }}>
      <div
        className="a2a-agenda-grid a2a-reveal"
        style={{
          border: '1px solid var(--border-2)',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(160deg, rgba(255,77,141,.08), #0F0D16 55%)',
          padding: 34,
        }}
      >
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 'var(--tracking-kicker)', color: 'var(--pink-soft)', marginBottom: 10 }}>
            ☎ {t.calKicker}
          </div>
          <h2 style={{ margin: '0 0 10px', fontSize: 30, fontWeight: 700 }}>{t.calTitle}</h2>
          <p style={{ margin: '0 0 16px', color: 'var(--text-2)', fontSize: 15, lineHeight: 'var(--leading-body)' }}>{t.calSub}</p>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--energy)',
              border: '1px dashed rgba(232,163,32,.4)',
              borderRadius: 10,
              padding: '10px 14px',
              lineHeight: 1.6,
            }}
          >
            {t.calSim}
          </div>
        </div>

        <div style={{ border: '1px solid var(--border-2)', borderRadius: 'var(--radius-l)', background: 'var(--surface-1)', padding: 22 }}>
          {confirmed ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '30px 10px', textAlign: 'center' }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 30%, #4BE38A, #1B9B54)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  color: '#06210F',
                }}
              >
                ✓
              </div>
              <div style={{ fontSize: 19, fontWeight: 700 }}>{t.calDone}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-2)' }}>{slot ? `${slot} (GMT-6)` : t.leadOk}</div>
              <button
                onClick={() => {
                  setConfirmed(false);
                  setSlot(null);
                  setStatus('idle');
                }}
                style={{ cursor: 'pointer', background: 'none', border: '1px solid var(--border-3)', color: 'var(--text-2)', borderRadius: 10, padding: '8px 16px', fontSize: 13 }}
              >
                {t.calAgain}
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', color: 'var(--text-3)' }}>
                {t.calPick} · 30 MIN · GOOGLE MEET
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
                {DAYS[lang].map((d) => (
                  <div key={d} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div
                      style={{
                        textAlign: 'center',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'var(--text-2)',
                        paddingBottom: 4,
                        borderBottom: '1px solid var(--border-1)',
                      }}
                    >
                      {d}
                    </div>
                    {HOURS.map((h) => {
                      const key = `${d} · ${h}`;
                      const sel = slot === key;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setSlot(key)}
                          style={{
                            cursor: 'pointer',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11.5,
                            padding: '8px 0',
                            borderRadius: 8,
                            border: sel ? '1px solid var(--pink)' : '1px solid var(--border-2)',
                            background: sel ? 'rgba(255,77,141,.18)' : 'rgba(255,255,255,.03)',
                            color: sel ? 'var(--pink-pale)' : 'var(--text-2)',
                            fontWeight: sel ? 700 : 400,
                          }}
                        >
                          {h}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t.leadName} style={inputStyle} />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.leadEmail} style={inputStyle} />
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t.leadCompany} style={inputStyle} />
              </div>

              {status === 'error' && <div style={{ color: 'var(--pink-soft)', fontSize: 13 }}>{t.leadErr}</div>}

              <button
                type="submit"
                disabled={status === 'sending'}
                style={{
                  cursor: status === 'sending' ? 'wait' : 'pointer',
                  border: 'none',
                  fontFamily: 'var(--font-display)',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--on-accent)',
                  background: 'var(--grad-brand)',
                  padding: '13px 0',
                  borderRadius: 12,
                  opacity: status === 'sending' ? 0.7 : 1,
                }}
              >
                {status === 'sending' ? t.leadSending : slot ? `${t.calConfirm} — ${slot}` : t.calConfirm}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-3)',
  border: '1px solid var(--border-2)',
  borderRadius: 10,
  padding: '11px 14px',
  color: 'var(--text-1)',
  fontFamily: 'var(--font-display)',
  fontSize: 14,
  outline: 'none',
};
