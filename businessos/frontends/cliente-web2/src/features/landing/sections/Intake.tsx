'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useLanding } from '../context';
import {
  A2A_STEPS,
  INTAKE_DEFAULT_PROMPT,
  INTAKE_DELIVERABLES,
  INTAKE_KICKOFF,
  analyzeIntake,
  buildIntakeQuote,
  type A2aLineKind,
  type IntakeAnalysis,
  type IntakeQuote,
  type TimedItem,
} from '../intake';
import type { Lang } from '@/shared/i18n/strings';

const S: Record<Lang, Record<string, string>> = {
  es: {
    kicker: 'INTAKE · COTIZACIÓN — SIMULACIÓN',
    title1: 'Pide tu sistema.',
    title2: 'Repartimos el mazo.',
    step1: '1 · Describe lo que necesitas',
    step1Tag: 'un prompt basta — el Coordinador hace el resto',
    hint: '// detección por dominio: RH · nómina · IMSS/IDSE · multi-sucursal · checadores · NOI. Cambia el texto y vuelve a generar — la propuesta se re-arma.',
    btnGen: 'Generar propuesta de cotización',
    genState: 'Coordinador analizando… PRP preliminar generado.',
    step2: '2 · Mazo de agentes recomendado',
    step3: '3 · Entregables',
    step3Tag: 'la demo corre en 20 minutos desde tu aprobación',
    step4: '4 · Cotización',
    step4Tag: 'MXN + IVA · proyección de tokens auditable por póliza',
    thConcept: 'Concepto',
    thScope: 'Alcance',
    thTokens: 'Tokens proy.',
    thMxn: 'MXN',
    included: 'INCLUIDA',
    optional: '(OPCIONAL)',
    total: 'Total proyecto (sin opcionales)',
    terms:
      'Términos: anticipo 50% ({half}) a la firma · 50% contra entrega en producción · precios MXN + IVA · el sprint de 20 min arranca al confirmarse el anticipo · tus datos: Supabase con RLS por tenant (o infraestructura dedicada opcional) · repo GitHub de tu propiedad desde el día 1 · datos de incapacidades tratados como datos personales sensibles (LFPDPPP): aviso de privacidad + DPA incluidos.',
    apTitle: '✋ Tu aprobación arranca el reloj',
    apSub: 'Al aprobar: se genera el contrato de prestación de servicios, se emite la liga de pago del anticipo (50%) y el sprint de 20 minutos inicia al confirmarse el pago.',
    apOkTitle: '✓ Cotización aprobada',
    apOkSub: 'Contrato en camino a tu correo para firma electrónica. El decision_id ya viaja en el hilo de trazabilidad.',
    btnApprove: 'Aprobar cotización',
    btnAdjust: 'Ajustar alcance',
    step5: '5 · Kickoff',
    step5Tag: 'esto ya lo viste en Mission Control',
    a2aTitle: 'Intake agéntico',
    a2aTag: 'el agente del cliente cotiza, negocia y aprueba sin humano — hasta los gates',
    a2aDesc:
      'Mismo motor de cotización, distinta interfaz: en lugar de formulario, el endpoint A2A recibe la solicitud estructurada, responde la propuesta en payload legible por máquina (el mazo, entregables y precios), y el agente del cliente puede aprobar. Los invariantes no cambian: contrato firmado + anticipo pagado antes del sprint, y gate humano en lo irreversible — de ambos lados.',
    a2aBtn: 'Simular intercambio A2A',
    a2aLogTitle: 'Canal A2A',
    a2aLogTag: 'ventas-a2a · única superficie pública tras el edge',
    a2aIdle: 'Endpoint en escucha. Presiona «Simular intercambio A2A».',
    simNote: '// simulación — el mazo se cotiza por proyecto; los agentes ya están en producción · esta sección no consume tokens de runtime',
    agents: 'agentes',
    optionals: 'opcionales por cotizar',
  },
  en: {
    kicker: 'INTAKE · QUOTE — SIMULATION',
    title1: 'Ask for your system.',
    title2: 'We deal the deck.',
    step1: '1 · Describe what you need',
    step1Tag: 'one prompt is enough — the Coordinator does the rest',
    hint: '// domain detection: HR · payroll · IMSS/IDSE · multi-branch · time clocks · NOI. Edit the text and generate again — the proposal re-deals.',
    btnGen: 'Generate quote proposal',
    genState: 'Coordinator analyzing… preliminary PRP generated.',
    step2: '2 · Recommended agent deck',
    step3: '3 · Deliverables',
    step3Tag: 'the demo runs 20 minutes after your approval',
    step4: '4 · Quote',
    step4Tag: 'MXN + VAT · token projection auditable per journal entry',
    thConcept: 'Concept',
    thScope: 'Scope',
    thTokens: 'Proj. tokens',
    thMxn: 'MXN',
    included: 'INCLUDED',
    optional: '(OPTIONAL)',
    total: 'Project total (without optionals)',
    terms:
      'Terms: 50% down payment ({half}) on signing · 50% on production delivery · prices in MXN + VAT · the 20-min sprint starts once the down payment is confirmed · your data: Supabase with per-tenant RLS (or optional dedicated infrastructure) · GitHub repo owned by you from day 1 · sick-leave data handled as sensitive personal data (LFPDPPP): privacy notice + DPA included.',
    apTitle: '✋ Your approval starts the clock',
    apSub: 'On approval: the service contract is generated, the down-payment link (50%) is issued, and the 20-minute sprint starts once payment is confirmed.',
    apOkTitle: '✓ Quote approved',
    apOkSub: 'Contract on its way to your inbox for e-signature. The decision_id is already traveling in the traceability thread.',
    btnApprove: 'Approve quote',
    btnAdjust: 'Adjust scope',
    step5: '5 · Kickoff',
    step5Tag: 'you already saw this on Mission Control',
    a2aTitle: 'Agentic intake',
    a2aTag: 'the client’s agent quotes, negotiates and approves without a human — up to the gates',
    a2aDesc:
      'Same quoting engine, different interface: instead of a form, the A2A endpoint receives the structured request, replies with a machine-readable proposal (the deck, deliverables and prices), and the client’s agent can approve. The invariants don’t change: signed contract + paid down payment before the sprint, and a human gate on anything irreversible — on both sides.',
    a2aBtn: 'Simulate A2A exchange',
    a2aLogTitle: 'A2A channel',
    a2aLogTag: 'ventas-a2a · the only public surface behind the edge',
    a2aIdle: 'Endpoint listening. Press “Simulate A2A exchange”.',
    simNote: '// simulation — the deck is quoted per project; the agents are already in production · this section spends zero runtime tokens',
    agents: 'agents',
    optionals: 'optional, quoted separately',
  },
};

const mono: CSSProperties = { fontFamily: 'var(--font-mono)' };
const panelStyle: CSSProperties = {
  border: '1px solid var(--border-2)',
  borderRadius: 'var(--radius-l)',
  background: 'var(--surface-1)',
  padding: '20px 22px',
};
const panelHead: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 10,
  flexWrap: 'wrap',
  marginBottom: 14,
};
const headTitle: CSSProperties = { fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' };
const headTag: CSSProperties = { ...mono, fontSize: 10.5, color: 'var(--text-dim)' };
const ctaStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: 'var(--on-accent)',
  background: 'var(--grad-brand)',
  padding: '11px 20px',
  borderRadius: 12,
  border: 'none',
  cursor: 'pointer',
};
const secBtnStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text-1)',
  background: 'transparent',
  padding: '10px 18px',
  borderRadius: 12,
  border: '1px solid var(--border-3)',
  cursor: 'pointer',
};

interface LogLine {
  time: string;
  kind: A2aLineKind;
  label?: string;
  text: string;
  pre?: string;
}

export function Intake() {
  const { lang, mode } = useLanding();
  const t = S[lang];

  // Mientras el visitante no edite, el prompt de ejemplo sigue su idioma.
  const [customPrompt, setCustomPrompt] = useState<string | null>(null);
  const prompt = customPrompt ?? INTAKE_DEFAULT_PROMPT[lang];
  const [analysis, setAnalysis] = useState<IntakeAnalysis | null>(null);
  const [quote, setQuote] = useState<IntakeQuote | null>(null);
  const [dealKey, setDealKey] = useState(0);
  const [approved, setApproved] = useState(false);
  const [decisionId, setDecisionId] = useState('');

  const [log, setLog] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const generate = useCallback(() => {
    const a = analyzeIntake(prompt);
    setAnalysis(a);
    setQuote(buildIntakeQuote(a));
    setDealKey((k) => k + 1);
    setApproved(false);
  }, [prompt]);

  const approve = useCallback(() => {
    setApproved(true);
    setDecisionId(`DEC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-RH01`);
  }, []);

  const runA2a = useCallback(() => {
    if (running) return;
    setRunning(true);
    setLog([]);
    timers.current.forEach(clearTimeout);
    timers.current = A2A_STEPS.map((s) =>
      setTimeout(() => {
        setLog((prev) =>
          prev.concat({
            time: new Date().toTimeString().slice(0, 8),
            kind: s.kind,
            label: s.label,
            text: s.text[lang],
            pre: s.pre,
          }),
        );
      }, s.delay),
    );
    timers.current.push(setTimeout(() => setRunning(false), 7000));
  }, [running, lang]);

  const mxn = (n: number) => `$${n.toLocaleString('es-MX')}`;
  const lineColor: Record<A2aLineKind, string> = {
    in: 'var(--energy-bright)',
    out: 'var(--lilac)',
    sys: 'var(--text-2)',
    warn: 'var(--pink-soft)',
  };

  return (
    <section id="intake" style={{ maxWidth: 'var(--page-max)', margin: '0 auto', padding: '40px 32px' }}>
      <div
        className="a2a-reveal"
        style={{
          border: '1px solid var(--border-2)',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(200deg, rgba(255,77,141,.08), #0F0D16 50%)',
          padding: 30,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div>
          <div style={{ ...mono, fontSize: 12, letterSpacing: 'var(--tracking-kicker)', color: 'var(--violet)', marginBottom: 10 }}>
            ⬢ {t.kicker}
          </div>
          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
            {t.title1}{' '}
            <span style={{ background: 'var(--grad-text)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              {t.title2}
            </span>
          </h2>
        </div>

        {mode === 'human' ? (
          <>
            <div style={panelStyle}>
              <div style={panelHead}>
                <span style={headTitle}>{t.step1}</span>
                <span style={headTag}>{t.step1Tag}</span>
              </div>
              <textarea
                ref={promptRef}
                value={prompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={5}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  background: 'var(--surface-2)',
                  color: 'var(--text-1)',
                  border: '1px solid var(--border-2)',
                  borderRadius: 'var(--radius-m)',
                  padding: 12,
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  fontFamily: 'var(--font-display)',
                }}
              />
              <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-dim)', marginTop: 8 }}>{t.hint}</div>
              <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={generate} style={ctaStyle}>
                  {t.btnGen}
                </button>
                {analysis && <span style={{ ...mono, fontSize: 11, color: 'var(--text-3)' }}>{t.genState}</span>}
              </div>
              {analysis && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  {analysis.tags.map((tag, i) => (
                    <span
                      key={i}
                      style={{
                        ...mono,
                        fontSize: 10.5,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-pill)',
                        border: tag.opt ? '1px dashed var(--energy)' : '1px solid var(--violet)',
                        color: tag.opt ? 'var(--energy-bright)' : 'var(--lilac)',
                        background: tag.opt ? 'rgba(232,163,32,.08)' : 'rgba(159,123,255,.1)',
                      }}
                    >
                      {tag.label[lang]}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {analysis && quote && (
              <>
                <div style={panelStyle}>
                  <div style={panelHead}>
                    <span style={headTitle}>{t.step2}</span>
                    <span style={headTag}>
                      {analysis.deck.length} {t.agents} · {analysis.deck.filter((c) => c.opt).length} {t.optionals}
                    </span>
                  </div>
                  <div
                    key={dealKey}
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: 12 }}
                  >
                    {analysis.deck.map((c, i) => (
                      <div
                        key={c.id}
                        className="a2a-deal a2a-lift"
                        style={{
                          animationDelay: `${i * 90}ms`,
                          border: c.opt ? '1.5px dashed var(--energy)' : '1px solid var(--border-3)',
                          borderRadius: 'var(--radius-l)',
                          background: 'var(--surface-2)',
                          padding: '13px 14px 15px',
                          position: 'relative',
                          minHeight: 168,
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <span style={{ ...mono, position: 'absolute', top: 9, right: 11, fontSize: 9, color: 'var(--text-dim)' }}>
                          {i + 1}/{analysis.deck.length}
                        </span>
                        <div style={{ fontSize: 20, lineHeight: 1, color: c.opt ? 'var(--energy)' : 'var(--violet)' }}>{c.suit}</div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, margin: '7px 0 4px' }}>{c.role[lang]}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-2)', flex: 1, lineHeight: 1.5 }}>{c.fn[lang]}</div>
                        <div
                          style={{
                            ...mono,
                            fontSize: 9.5,
                            marginTop: 9,
                            paddingTop: 8,
                            borderTop: '1px dashed var(--border-2)',
                            color: c.opt ? 'var(--energy-bright)' : 'var(--lilac)',
                          }}
                        >
                          {c.meta[lang]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={panelStyle}>
                  <div style={panelHead}>
                    <span style={headTitle}>{t.step3}</span>
                    <span style={headTag}>{t.step3Tag}</span>
                  </div>
                  <TimedList items={INTAKE_DELIVERABLES} lang={lang} />
                </div>

                <div style={panelStyle}>
                  <div style={panelHead}>
                    <span style={headTitle}>{t.step4}</span>
                    <span style={headTag}>{t.step4Tag}</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                      <thead>
                        <tr>
                          {[t.thConcept, t.thScope, t.thTokens, t.thMxn].map((h, i) => (
                            <th
                              key={h}
                              style={{
                                ...mono,
                                fontSize: 10,
                                letterSpacing: '.07em',
                                textTransform: 'uppercase',
                                color: 'var(--text-3)',
                                textAlign: i >= 2 ? 'right' : 'left',
                                padding: '6px 8px',
                                borderBottom: '1.5px solid var(--border-3)',
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {quote.rows.map((r, i) => {
                          const td: CSSProperties = {
                            padding: '8px',
                            borderBottom: '1px solid var(--border-1)',
                            color: r.opt ? 'var(--energy-bright)' : undefined,
                          };
                          return (
                            <tr key={i}>
                              <td style={td}>
                                {r.concept[lang]}
                                {r.opt && <span style={{ ...mono, fontSize: 9.5 }}> {t.optional}</span>}
                                {r.included && <b style={{ color: 'var(--success-pale)' }}> {t.included}</b>}
                              </td>
                              <td style={{ ...td, fontSize: 11.5, color: r.opt ? 'var(--energy-bright)' : 'var(--text-3)' }}>{r.scope[lang]}</td>
                              <td style={{ ...td, ...mono, textAlign: 'right' }}>{r.tk ? `${r.tk}k` : '—'}</td>
                              <td style={{ ...td, ...mono, textAlign: 'right' }}>{r.mxn ? mxn(r.mxn) : '—'}</td>
                            </tr>
                          );
                        })}
                        <tr>
                          <td colSpan={2} style={{ ...mono, padding: '9px 8px', fontWeight: 700, borderTop: '2px solid var(--border-3)' }}>
                            {t.total}
                          </td>
                          <td style={{ ...mono, padding: '9px 8px', fontWeight: 700, textAlign: 'right', borderTop: '2px solid var(--border-3)' }}>
                            {quote.totalTk}k
                          </td>
                          <td style={{ ...mono, padding: '9px 8px', fontWeight: 700, textAlign: 'right', borderTop: '2px solid var(--border-3)' }}>
                            {mxn(quote.totalMxn)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.6 }}>
                    {t.terms.replace('{half}', mxn(quote.totalMxn / 2))}
                  </p>

                  <div
                    style={{
                      border: approved ? '2px solid var(--success)' : '2px dashed var(--energy)',
                      background: approved ? 'rgba(40,200,64,.08)' : 'rgba(232,163,32,.06)',
                      borderRadius: 'var(--radius-m)',
                      padding: '14px 16px',
                      display: 'flex',
                      gap: 14,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      marginTop: 14,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 220, fontSize: 13 }}>
                      <b>{approved ? t.apOkTitle : t.apTitle}</b>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                        {approved ? t.apOkSub : t.apSub}
                      </span>
                    </div>
                    <button onClick={approve} disabled={approved} style={{ ...ctaStyle, opacity: approved ? 0.4 : 1, cursor: approved ? 'not-allowed' : 'pointer' }}>
                      {t.btnApprove}
                    </button>
                    <button
                      onClick={() => {
                        promptRef.current?.focus();
                        promptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      style={secBtnStyle}
                    >
                      {t.btnAdjust}
                    </button>
                  </div>
                </div>

                {approved && (
                  <div style={panelStyle}>
                    <div style={panelHead}>
                      <span style={headTitle}>{t.step5}</span>
                      <span style={headTag}>
                        {t.step5Tag} · decision_id <span style={{ color: 'var(--lilac)' }}>{decisionId}</span>
                      </span>
                    </div>
                    <TimedList items={INTAKE_KICKOFF} lang={lang} />
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <div style={panelStyle}>
              <div style={panelHead}>
                <span style={headTitle}>{t.a2aTitle}</span>
                <span style={headTag}>{t.a2aTag}</span>
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: '0 0 14px', lineHeight: 'var(--leading-body)' }}>{t.a2aDesc}</p>
              <button onClick={runA2a} disabled={running} style={{ ...ctaStyle, opacity: running ? 0.4 : 1, cursor: running ? 'not-allowed' : 'pointer' }}>
                {t.a2aBtn}
              </button>
            </div>
            <div style={panelStyle}>
              <div style={panelHead}>
                <span style={headTitle}>{t.a2aLogTitle}</span>
                <span style={headTag}>{t.a2aLogTag}</span>
              </div>
              <div
                ref={logRef}
                style={{
                  ...mono,
                  fontSize: 11.5,
                  lineHeight: 1.7,
                  maxHeight: 420,
                  overflowY: 'auto',
                  background: 'var(--bg)',
                  border: '1px solid var(--border-1)',
                  borderRadius: 'var(--radius-m)',
                  padding: '12px 14px',
                  color: 'var(--text-2)',
                }}
              >
                {log.length === 0 && (
                  <p style={{ margin: 0 }}>
                    <span style={{ color: 'var(--text-dim)' }}>[--:--:--]</span> {t.a2aIdle}
                  </p>
                )}
                {log.map((l, i) => (
                  <div key={i}>
                    <p style={{ margin: 0 }}>
                      <span style={{ color: 'var(--text-dim)' }}>[{l.time}]</span>{' '}
                      {l.label && <span style={{ color: lineColor[l.kind], fontWeight: 700 }}>{l.label} </span>}
                      <span style={{ color: l.label ? undefined : lineColor[l.kind] }}>{l.text}</span>
                    </p>
                    {l.pre && (
                      <pre
                        style={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontSize: 10.5,
                          color: 'var(--text-3)',
                          background: 'rgba(255,255,255,.05)',
                          borderRadius: 8,
                          padding: '8px 10px',
                          margin: '4px 0 8px',
                        }}
                      >
                        {l.pre}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{ ...mono, fontSize: 10.5, color: 'var(--text-dim)', textAlign: 'center' }}>{t.simNote}</div>
      </div>
    </section>
  );
}

function TimedList({ items, lang }: { items: TimedItem[]; lang: Lang }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((d, i) => (
        <li
          key={i}
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'baseline',
            padding: '8px 10px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border-1)',
            borderRadius: 'var(--radius-s)',
            fontSize: 13,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--lilac)',
              background: 'rgba(159,123,255,.12)',
              border: '1px solid rgba(159,123,255,.3)',
              padding: '2px 8px',
              borderRadius: 6,
              whiteSpace: 'nowrap',
              minWidth: 92,
              textAlign: 'center',
            }}
          >
            {d.when[lang]}
          </span>
          <span style={{ flex: 1, minWidth: 200, color: 'var(--text-2)', lineHeight: 1.5 }}>{d.text[lang]}</span>
        </li>
      ))}
    </ul>
  );
}
