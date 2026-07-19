import { z } from 'zod';

const CLAUDECLAW_URL = process.env.CLAUDECLAW_URL ?? '';
const CLAUDECLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? '';

// Turnos largos del agente: sin esto Vercel corta el stream en el límite default.
export const maxDuration = 300;

// Historial multi-turno: lo mantiene el widget en el cliente y lo reenvía cada
// turno (el daemon es stateless). Acotado para no inflar el payload.
const Turn = z.object({
  role: z.enum(['user', 'agent']),
  text: z.string().max(2000),
});

const Body = z.object({
  message: z.string().trim().min(1).max(2000),
  source: z.string().max(60).optional(),
  history: z.array(Turn).max(16).optional(),
});

/** Emite un SSE mínimo (degradación elegante) cuando el chat no está disponible. */
function degradedStream(text: string): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'text_delta', text })}\n\n`));
      controller.enqueue(enc.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}

export async function POST(request: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await request.json());
  } catch {
    return new Response(JSON.stringify({ error: 'Cuerpo inválido' }), { status: 400 });
  }

  // El daemon (Hermes) NO es público por defecto; sin config, degradamos sin
  // fingir. El "encendido" del chat live es un paso de infra (edge Caddy).
  if (!CLAUDECLAW_URL || !CLAUDECLAW_TOKEN) {
    return degradedStream(
      'El chat en vivo aún no está conectado en este entorno. Escríbenos por el formulario de "Agendar llamada" y te contactamos. 💬',
    );
  }

  try {
    const upstream = await fetch(`${CLAUDECLAW_URL}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CLAUDECLAW_TOKEN}` },
      body: JSON.stringify({
        message: parsed.message,
        source: parsed.source ?? 'web2-landing',
        history: parsed.history ?? [],
      }),
      signal: request.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '');
      console.error('[chat] daemon respondió', upstream.status, text.slice(0, 200));
      return degradedStream('No pudimos contactar al asistente en este momento. Intenta más tarde o agenda una llamada. 🙏');
    }

    return new Response(upstream.body, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return new Response(null, { status: 499 });
    console.error('[chat] excepción:', err instanceof Error ? err.message : err);
    return degradedStream('No pudimos contactar al asistente en este momento. Intenta más tarde o agenda una llamada. 🙏');
  }
}
