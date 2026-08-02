import { NextRequest, NextResponse } from 'next/server';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';
import { createServiceClient, hasServiceConfig } from '@/lib/supabase/service';

const POLAR_WEBHOOK_SECRET = (process.env.POLAR_WEBHOOK_SECRET ?? '').trim();

/**
 * Espejo de polar-cobros.py::ESTADOS_POLAR — misma fuente de verdad, mismo
 * mapeo. Este webhook cubre el modelo de cobros puntuales (checkout.updated);
 * eventos de órdenes/suscripciones no aplican aquí (no hay producto
 * recurrente en producción todavía) y se ignoran explícitamente.
 */
const ESTADOS_POLAR: Record<string, string> = {
  open: 'abierto',
  confirmed: 'confirmado',
  succeeded: 'pagado',
  expired: 'expirado',
  failed: 'fallido',
};

/**
 * Fuente de verdad de los pagos (reemplaza a polar-cobros.py --sync como
 * mecanismo primario; --sync queda como respaldo de reconciliación).
 * Idempotente: reflejar el mismo estado dos veces es un no-op para `cobros`.
 */
export async function POST(request: NextRequest) {
  if (!POLAR_WEBHOOK_SECRET) {
    console.error('[webhook/polar] POLAR_WEBHOOK_SECRET no configurado — rechazando');
    return NextResponse.json({ error: 'No configurado' }, { status: 503 });
  }

  const body = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  let event: ReturnType<typeof validateEvent>;
  try {
    event = validateEvent(body, headers, POLAR_WEBHOOK_SECRET);
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      console.error('[webhook/polar] firma inválida');
      return NextResponse.json({ error: 'Firma inválida' }, { status: 403 });
    }
    console.error('[webhook/polar] excepción validando evento:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Evento inválido' }, { status: 400 });
  }

  if (event.type !== 'checkout.updated') {
    return NextResponse.json({ received: true, skipped: event.type });
  }

  const checkout = event.data;
  const estado = ESTADOS_POLAR[String(checkout.status)];
  if (!estado) {
    console.log(`[webhook/polar] estado sin mapeo: ${checkout.status} (checkout ${checkout.id})`);
    return NextResponse.json({ received: true });
  }

  if (!hasServiceConfig()) {
    console.error('[webhook/polar] Supabase no configurado — no se pudo reflejar', checkout.id, estado);
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });
  }

  try {
    const supabase = createServiceClient();
    const metadata = checkout.metadata as Record<string, unknown>;

    const row: Record<string, unknown> = {
      polar_checkout_id: checkout.id,
      checkout_url: checkout.url,
      estado,
      updated_at: new Date().toISOString(),
    };
    // El monto final de un checkout "pay what you want" solo se conoce una
    // vez que el cliente lo confirma en la página hospedada de Polar.
    if ((estado === 'confirmado' || estado === 'pagado') && checkout.totalAmount > 0) {
      row.monto = Math.round(checkout.totalAmount) / 100;
    }

    const { data: existing, error: selectError } = await supabase
      .from('cobros')
      .select('id')
      .eq('polar_checkout_id', checkout.id)
      .maybeSingle();
    if (selectError) {
      console.error('[webhook/polar] select falló:', selectError.message);
      return NextResponse.json({ error: 'Error consultando cobros' }, { status: 500 });
    }

    if (existing) {
      const { error } = await supabase.from('cobros').update(row).eq('id', existing.id);
      if (error) console.error('[webhook/polar] update falló:', error.message);
    } else {
      // Checkout que este webhook ve por primera vez (no vino del checkout de
      // la landing ni del host-job): se registra igual, con lo que traiga el
      // metadata, para no perder el rastro del cobro.
      const { error } = await supabase.from('cobros').insert({
        cliente: (metadata?.cliente as string | undefined) ?? checkout.customerEmail ?? 'desconocido (via webhook)',
        concepto: (metadata?.concepto as string | undefined) ?? 'Cobro Polar',
        moneda: (checkout.currency || 'USD').toUpperCase(),
        metadata: { origen: (metadata?.origen as string | undefined) ?? 'webhook-polar' },
        ...row,
      });
      if (error) console.error('[webhook/polar] insert falló:', error.message);
    }
  } catch (err) {
    console.error('[webhook/polar] excepción:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Error procesando' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
