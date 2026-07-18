'use client';
import { useState } from 'react';
import { useLanding } from '../context';
import { AGENTS, agentById, KIND_COLOR, type Agent, type DemoLine } from '../agents';
import type { Strings } from '@/shared/i18n/strings';
import { useOfficeSim } from './office/useOfficeSim';
import { DESKS, DESK_DECOR, ORB_PX, SEATS, ZONE_RECTS } from './office/layout';
import type { AgentState } from './office/types';

const CODE_BARS =
  'linear-gradient(var(--lilac),var(--lilac)),' +
  'linear-gradient(var(--pink-pale),var(--pink-pale)),' +
  'linear-gradient(var(--success-soft),var(--success-soft))';

function statusMeta(state: AgentState, t: Strings): { glyph: string; color: string; label: string } {
  switch (state) {
    case 'walking':
      return { glyph: '▸', color: 'var(--pink-pale)', label: t.stWalking };
    case 'idle':
      return { glyph: '●', color: 'var(--text-dim)', label: t.stIdle };
    case 'celebrating':
      return { glyph: '✓', color: 'var(--energy-bright)', label: t.stClosing };
    default:
      return { glyph: '⚙', color: 'var(--lilac)', label: t.stWorking };
  }
}

/** Últimas `count` líneas emitidas (cíclico), terminando en la actual. */
function recentLines(agent: Agent, curIdx: number, count = 9) {
  const n = agent.demo.length;
  const out: DemoLine[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const idx = (((curIdx - i) % n) + n) % n;
    out.push(agent.demo[idx]);
  }
  return out;
}

function orbBgFor(orb: 'violet' | 'pink') {
  return orb === 'pink' ? 'var(--orb-pink)' : 'var(--orb-violet)';
}
function orbGlowFor(orb: 'violet' | 'pink') {
  return orb === 'pink' ? 'var(--glow-pink)' : 'var(--glow-violet)';
}

export function OfficeSim() {
  const { lang, t, openId, openDemo } = useLanding();
  const [selected, setSelected] = useState(AGENTS[0].id);
  const { state, sceneRef } = useOfficeSim(openId != null);

  const selectedAgent = agentById(selected) ?? AGENTS[0];
  const selRender = state[selected];
  const selStatus = statusMeta(selRender?.state ?? 'working', t);

  return (
    <section id="oficina" style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: '56px 32px 40px' }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 'var(--tracking-kicker)', color: 'var(--success-pale)', marginBottom: 10 }}>
          {t.officeKicker}
        </div>
        <h2 style={{ margin: 0, fontSize: 34, fontWeight: 700 }}>
          <span style={{ background: 'var(--grad-text)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{t.officeTitle}</span>
        </h2>
        <p style={{ margin: '10px 0 0', color: 'var(--text-2)', fontSize: 15, maxWidth: 620, lineHeight: 'var(--leading-body)' }}>{t.officeSub}</p>
      </div>

      <div className="office-grid a2a-reveal">
        {/* ===== ESCENA (decorativa) ===== */}
        <div
          ref={sceneRef}
          aria-hidden="true"
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '13 / 7',
            border: '1px solid var(--border-2)',
            borderRadius: 'var(--radius-l)',
            background: 'var(--surface-1)',
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,.04) 0 1px, transparent 1px 7.6%),' +
              'repeating-linear-gradient(90deg, rgba(255,255,255,.04) 0 1px, transparent 1px 4.1%),' +
              'radial-gradient(120% 90% at 30% 15%, rgba(159,123,255,.06), transparent 60%)',
            overflow: 'hidden',
          }}
        >
          {/* Zonas comunes */}
          {(['meeting', 'cafe'] as const).map((z) => {
            const r = ZONE_RECTS[z];
            const isMeeting = z === 'meeting';
            return (
              <div
                key={z}
                style={{
                  position: 'absolute',
                  left: `${r.x}%`,
                  top: `${r.y}%`,
                  width: `${r.w}%`,
                  height: `${r.h}%`,
                  borderRadius: 10,
                  border: '1px dashed var(--border-2)',
                  background: isMeeting ? 'rgba(159,123,255,.06)' : 'rgba(255,77,141,.05)',
                  padding: 6,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8.5,
                  letterSpacing: '.08em',
                  color: 'var(--text-dim)',
                  boxSizing: 'border-box',
                }}
              >
                {isMeeting ? t.officeMeeting : t.officeCafe}
              </div>
            );
          })}

          {/* Escritorios */}
          {AGENTS.map((a) => {
            const d = DESKS[a.id];
            const working = state[a.id]?.state === 'working';
            return (
              <div
                key={a.id}
                style={{
                  position: 'absolute',
                  left: `${d.x}%`,
                  top: `${d.y}%`,
                  width: `${d.w}%`,
                  height: `${d.h}%`,
                  borderRadius: 6,
                  border: '1px solid var(--border-1)',
                  background: 'linear-gradient(180deg, var(--surface-3), var(--surface-2))',
                  boxSizing: 'border-box',
                }}
              >
                {/* Monitor con barras tipo código */}
                <div
                  style={{
                    position: 'absolute',
                    left: '18%',
                    top: '14%',
                    width: '64%',
                    height: '46%',
                    borderRadius: 3,
                    background: 'var(--surface-4)',
                    border: '1px solid var(--border-2)',
                    backgroundImage: CODE_BARS,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '52% 2px, 36% 2px, 44% 2px',
                    backgroundPosition: '14% 30%, 14% 55%, 14% 80%',
                  }}
                />
                {/* Indicador "tecleando" (solo trabajando) */}
                {working && (
                  <div
                    className="office-typing"
                    style={{
                      position: 'absolute',
                      left: '20%',
                      top: '66%',
                      width: '34%',
                      height: '9%',
                      backgroundImage:
                        'linear-gradient(var(--lilac),var(--lilac)),linear-gradient(var(--pink-pale),var(--pink-pale)),linear-gradient(var(--lilac),var(--lilac))',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '22% 100%, 22% 100%, 22% 100%',
                      backgroundPosition: '0% 50%, 50% 50%, 100% 50%',
                    }}
                  />
                )}
                {/* Decoración (planta/impresora/servidor estilizados) */}
                <span
                  style={{
                    position: 'absolute',
                    right: '8%',
                    bottom: '6%',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: 'var(--text-dim)',
                    lineHeight: 1,
                  }}
                >
                  {DESK_DECOR[a.id]}
                </span>
              </div>
            );
          })}

          {/* Orbes de agentes */}
          {AGENTS.map((a) => {
            const s = state[a.id] ?? { x: SEATS[a.id].x, y: SEATS[a.id].y, state: 'working' as AgentState, lineIdx: 0 };
            const isSel = a.id === selected;
            return (
              <div
                key={a.id}
                onClick={() => setSelected(a.id)}
                style={{
                  position: 'absolute',
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  width: ORB_PX,
                  height: ORB_PX,
                  marginLeft: -ORB_PX / 2,
                  marginTop: -ORB_PX / 2,
                  borderRadius: '50%',
                  background: orbBgFor(a.orb),
                  boxShadow: orbGlowFor(a.orb),
                  outline: isSel ? '2px solid var(--violet)' : '2px solid transparent',
                  outlineOffset: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'left .85s linear, top .85s linear, outline-color .2s ease',
                  zIndex: 3,
                }}
              >
                {a.glyph}
              </div>
            );
          })}

          {/* Burbujas de actividad */}
          {AGENTS.map((a) => {
            const s = state[a.id];
            if (!s || s.state === 'idle') return null;
            const line = a.demo[s.lineIdx];
            const closing = s.state === 'celebrating' || line.k === 'ok' || line.k === 'kpi';
            return (
              <div
                key={`${a.id}-${s.lineIdx}`}
                className="office-bubble"
                style={{
                  position: 'absolute',
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  transform: 'translate(-50%, calc(-100% - 20px))',
                  maxWidth: '26ch',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  lineHeight: 1.3,
                  padding: '4px 7px',
                  borderRadius: 8,
                  background: 'var(--surface-3)',
                  border: '1px solid ' + (closing ? 'var(--success)' : 'var(--border-2)'),
                  color: closing ? 'var(--success-soft)' : 'var(--text-2)',
                  boxShadow: '0 6px 18px rgba(0,0,0,.5)',
                  transition: 'left .85s linear, top .85s linear',
                  zIndex: 4,
                  pointerEvents: 'none',
                }}
              >
                {closing ? '✓ ' : ''}
                {line[lang]}
              </div>
            );
          })}
        </div>

        {/* ===== CENTRO DE MANDO ===== */}
        <div
          style={{
            border: '1px solid var(--border-2)',
            borderRadius: 'var(--radius-l)',
            background: 'var(--surface-2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderBottom: '1px solid var(--border-1)',
              background: 'var(--surface-1)',
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: orbBgFor(selectedAgent.orb),
                boxShadow: orbGlowFor(selectedAgent.orb),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {selectedAgent.glyph}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{selectedAgent.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedAgent.role[lang]}
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: selStatus.color,
                border: '1px solid var(--border-2)',
                borderRadius: 999,
                padding: '3px 8px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {selStatus.glyph} {selStatus.label}
            </span>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 220,
              padding: '12px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              lineHeight: 1.75,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              justifyContent: 'flex-end',
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: '.16em', color: 'var(--text-dim)', marginBottom: 6 }}>{t.officeCenter}</div>
            {recentLines(selectedAgent, selRender?.lineIdx ?? 0).map((l, i) => (
              <div
                key={i}
                style={{
                  color: KIND_COLOR[l.k],
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  opacity: i < 2 ? 0.5 : 1,
                }}
              >
                {l[lang]}
              </div>
            ))}
            <span style={{ display: 'inline-block', width: 8, height: 14, background: 'var(--pink-soft)', marginTop: 2 }} className="a2a-cursor" />
          </div>

          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-1)' }}>
            <button
              onClick={() => openDemo(selected)}
              style={{
                width: '100%',
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--on-accent)',
                background: 'var(--grad-brand)',
                border: 'none',
                borderRadius: 10,
                padding: '10px 0',
              }}
            >
              {t.officeCta}
            </button>
          </div>
        </div>
      </div>

      {/* ===== ROSTER ===== */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
        {AGENTS.map((a) => {
          const st = statusMeta(state[a.id]?.state ?? 'working', t);
          const isSel = a.id === selected;
          return (
            <button
              key={a.id}
              onClick={() => setSelected(a.id)}
              aria-pressed={isSel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                borderRadius: 10,
                padding: '7px 11px',
                background: isSel ? 'var(--surface-3)' : 'rgba(255,255,255,.03)',
                border: '1px solid ' + (isSel ? 'var(--violet)' : 'var(--border-2)'),
                color: 'var(--text-1)',
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: orbBgFor(a.orb),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8,
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {a.glyph}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 600 }}>{a.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: st.color, whiteSpace: 'nowrap' }}>
                {st.glyph} {st.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
