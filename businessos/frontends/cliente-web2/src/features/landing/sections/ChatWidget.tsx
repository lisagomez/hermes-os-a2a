'use client';
import { useRef, useState } from 'react';
import { useLanding } from '../context';

interface Msg {
  role: 'user' | 'agent';
  text: string;
}

export function ChatWidget() {
  const { lang } = useLanding();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const placeholder = lang === 'en' ? 'Ask us anything…' : 'Pregúntanos lo que sea…';
  const title = lang === 'en' ? 'Talk to the factory' : 'Habla con la fábrica';
  const hint =
    lang === 'en'
      ? 'A live agent demo. Try "what can you build for a bakery?"'
      : 'Demo de agente en vivo. Prueba "¿qué puedes construir para una panadería?"';

  function scrollDown() {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text: message }, { role: 'agent', text: '' }]);
    setBusy(true);
    scrollDown();

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, source: 'web2-landing' }),
      });
      if (!res.body) throw new Error('no body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';

      // Parseo SSE: eventos separados por doble salto de línea.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const evt of events) {
          const line = evt.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const obj = JSON.parse(payload) as { type?: string; text?: string };
            if ((obj.type === 'text_delta' || obj.type === 'text') && obj.text) {
              acc += obj.text;
              setMsgs((m) => {
                const copy = m.slice();
                copy[copy.length - 1] = { role: 'agent', text: acc };
                return copy;
              });
              scrollDown();
            }
          } catch {
            // fragmento incompleto; se completa en el siguiente chunk
          }
        }
      }
      if (!acc) {
        setMsgs((m) => {
          const copy = m.slice();
          copy[copy.length - 1] = { role: 'agent', text: lang === 'en' ? '…' : '…' };
          return copy;
        });
      }
    } catch {
      setMsgs((m) => {
        const copy = m.slice();
        copy[copy.length - 1] = {
          role: 'agent',
          text: lang === 'en' ? 'Connection issue. Try again.' : 'Problema de conexión. Intenta de nuevo.',
        };
        return copy;
      });
    } finally {
      setBusy(false);
      scrollDown();
    }
  }

  return (
    <>
      {open && (
        <div
          style={{
            position: 'fixed',
            right: 20,
            bottom: 88,
            zIndex: 90,
            width: 360,
            maxWidth: 'calc(100vw - 40px)',
            height: 460,
            maxHeight: 'calc(100vh - 140px)',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--border-3)',
            borderRadius: 'var(--radius-l)',
            background: 'var(--surface-1)',
            boxShadow: 'var(--shadow-modal)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderBottom: '1px solid var(--border-1)',
              background: 'var(--surface-2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--orb-violet)' }} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar chat" style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 18 }}>
              ✕
            </button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {msgs.length === 0 && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>{hint}</div>}
            {msgs.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  padding: '9px 12px',
                  borderRadius: 12,
                  whiteSpace: 'pre-wrap',
                  color: m.role === 'user' ? 'var(--on-accent)' : 'var(--text-1)',
                  background: m.role === 'user' ? 'var(--grad-brand)' : 'var(--surface-3)',
                  border: m.role === 'user' ? 'none' : '1px solid var(--border-2)',
                }}
              >
                {m.text || '…'}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--border-1)' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
              placeholder={placeholder}
              style={{
                flex: 1,
                background: 'var(--surface-3)',
                border: '1px solid var(--border-2)',
                borderRadius: 10,
                padding: '10px 12px',
                color: 'var(--text-1)',
                fontFamily: 'var(--font-display)',
                fontSize: 13.5,
                outline: 'none',
              }}
            />
            <button
              onClick={send}
              disabled={busy}
              aria-label="Enviar"
              style={{
                cursor: busy ? 'wait' : 'pointer',
                border: 'none',
                background: 'var(--grad-brand)',
                color: 'var(--on-accent)',
                borderRadius: 10,
                padding: '0 14px',
                fontWeight: 700,
                opacity: busy ? 0.7 : 1,
              }}
            >
              ▸
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Chat"
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          zIndex: 91,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          background: 'var(--grad-brand)',
          color: 'var(--on-accent)',
          fontSize: 22,
          boxShadow: 'var(--glow-violet)',
        }}
      >
        {open ? '✕' : '💬'}
      </button>
    </>
  );
}
