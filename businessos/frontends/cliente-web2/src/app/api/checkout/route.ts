import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient, hasServiceConfig } from '@/lib/supabase/service';

const POLAR_API = (process.env.POLAR_API ?? 'https://api.polar.sh/v1').replace(/\/$/, '');
const POLAR_TOKEN = process.env.POLAR_ACCESS_TOKEN ?? '';
const POLAR_PRODUCT_ID = process.env.POLAR_PRODUCT_ID ?? '';

const Body = z.object({
  mazo: z.array(z.string().max(60)).max(20).optional(),
  email: z.string().trim().email().max(200).optional(),
  concepto: z.string().trim().max(160).optional(),
});

/**
 * Crea un Polar Checkout Session (fiat, Merchant of Record) para un depósito /
 * retainer, cuando hay un producto configurado. El monto final del proyecto se
 * cierra en la llamada de descubrimiento; esto sirve para reservar/apartar.
 * Degrada con 503 si Polar no está configurado (no finge un pago).
 */
export async function POST(request: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: 'Datos inválidos' }, { status: 400 });
  }

  if (!POLAR_TOKEN || !POLAR_PRODUCT_ID) {
    return NextResponse.json({ ok: false, error: 'Pagos no configurados' }, { status: 503 });
  }

  const origin = new URL(request.url).origin;
  // Polar rechaza valores de metadata con string vacío (min_length: 1) —
  // "mazo" solo se manda si trae algo, nunca como "".
  const mazo = (parsed.mazo ?? []).join(',');
  const metadata: Record<string, string> = {
    origen: 'web2-landing',
    concepto: parsed.concepto ?? 'Depósito de proyecto',
  };
  if (mazo) metadata.mazo = mazo;

  const body: Record<string, unknown> = {
    products: [POLAR_PRODUCT_ID],
    success_url: `${origin}/?pago=ok`,
    metadata,
  };
  if (parsed.email) body.customer_email = parsed.email;

  try {
    const res = await fetch(`${POLAR_API}/checkouts/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${POLAR_TOKEN}`,
        'Content-Type': 'application/json',
        // Cloudflare (1010) bloquea UAs no-navegador de algunos runtimes.
        'User-Agent': 'curl/8.0',
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; id?: string; error?: string };
    if (!res.ok || !data.url) {
      console.error('[checkout] Polar respondió', res.status, JSON.stringify(data).slice(0, 200));
      return NextResponse.json({ ok: false, error: 'No se pudo crear el checkout' }, { status: 502 });
    }

    // Best-effort: registra el checkout en `cobros` para que quede rastreable
    // (mission control, webhook) igual que los cobros creados por el host-job.
    // Nunca bloquea la respuesta al cliente si Supabase falla — el checkout
    // de Polar ya existe y es la fuente de verdad del pago.
    if (hasServiceConfig()) {
      try {
        const supabase = createServiceClient();
        const { error } = await supabase.from('cobros').insert({
          cliente: parsed.email ?? 'web2-landing (sin email)',
          concepto: parsed.concepto ?? 'Depósito de proyecto',
          monto: null, // pay-what-you-want: el monto final lo fija el cliente en Polar
          moneda: 'USD',
          polar_checkout_id: data.id,
          checkout_url: data.url,
          metadata: { origen: 'web2-landing', mazo: parsed.mazo ?? [] },
        });
        if (error) console.error('[checkout] cobros insert falló:', error.message);
      } catch (err) {
        console.error('[checkout] cobros insert excepción:', err instanceof Error ? err.message : err);
      }
    } else {
      console.error('[checkout] Supabase no configurado — checkout no quedó registrado en cobros');
    }

    return NextResponse.json({ ok: true, url: data.url, checkout_id: data.id });
  } catch (err) {
    console.error('[checkout] excepción:', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: 'No se pudo crear el checkout' }, { status: 502 });
  }
}
