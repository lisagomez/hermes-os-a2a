---
name: add-payments
description: |
  Integra sistema de pagos con Polar (Merchant of Record) en tu proyecto Next.js + Supabase.
  Crea checkout, webhooks, base de datos y frontend completo.

  Usar cuando: "agrega pagos", "add payments", "integra Polar", "quiero cobrar",
  "checkout", "suscripciones", "webhook", "sistema de cobros", "monetizar",
  "add billing", "cobrar por mi app", "pasarela de pagos", "polar".

  Pre-requisito: /add-login (necesita auth + profiles en Supabase).
  NO USAR para: Stripe directo, analytics de pagos, reportes de revenue.
allowed-tools: Bash(npm *), Bash(npx *), Read, Write, Edit, Glob, Grep
---

# Add Payments — Polar Integration

Integra un sistema de pagos completo usando Polar como Merchant of Record.
Polar corre encima de Stripe. Maneja impuestos, facturacion e IVA internacional.
Tu solo recibes dinero. No necesitas empresa constituida.

NO PREGUNTES. Ejecuta el Golden Path completo.

## Pre-requisitos

Antes de crear archivos, verifica:

1. `/add-login` ejecutado — busca `src/shared/lib/supabase/client.ts`. Si no existe, dile al usuario que ejecute `/add-login` primero.
2. Paquete: `npm install @polar-sh/sdk`

## Principios Criticos

- **Polar = Merchant of Record.** Ellos son el vendedor legal.
- **Polar corre encima de Stripe.** No son competidores, son capas.
- **El webhook es la fuente de verdad.** NUNCA confies en el frontend para validar pagos.
- **subscription.active = acceso.** NO des acceso en checkout.updated.
- **Idempotencia obligatoria.** El mismo webhook puede llegar multiples veces.
- **SIEMPRE .trim() en secrets.** Espacios invisibles rompen la verificacion de firma.

## Archivos a Crear

### 1. Migracion SQL

Archivo: `supabase/migrations/$(date +%Y%m%d%H%M%S)_add_payments.sql`

```sql
-- Add payments support
-- Requires: profiles table (from add-login)

-- Access control on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_access boolean DEFAULT false;

-- Purchases table
CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'canceled', 'refunded')),
  polar_checkout_id text,
  polar_subscription_id text UNIQUE,
  polar_customer_id text,
  price_cents integer,
  billing_interval text CHECK (billing_interval IN ('month', 'year')),
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(status);

-- RLS (service_role bypasses automatically for webhook operations)
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own purchases" ON public.purchases
  FOR SELECT USING (auth.uid() = user_id);
```

### 2. Polar Client

Archivo: `src/shared/lib/polar.ts`

```typescript
import { Polar } from '@polar-sh/sdk';

const isSandbox = process.env.POLAR_ENVIRONMENT === 'sandbox';

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN?.trim(),
  server: isSandbox ? 'sandbox' : 'production',
});

// CRITICO: .trim() evita espacios invisibles que rompen verificacion de firma
export const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET?.trim() ?? '';

export const POLAR_PRODUCT_ID = process.env.POLAR_PRODUCT_ID ?? '';
```

### 3. Supabase Admin Client

Archivo: `src/shared/lib/supabase/admin.ts`

SI ya existe este archivo (de add-login u otro skill), NO lo sobreescribas.

```typescript
import { createClient } from '@supabase/supabase-js';

// Service role client — bypasses RLS. Solo usar server-side.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### 4. Webhook Handler

Este es el archivo mas critico. Aqui es donde el dinero se convierte en acceso.

Archivo: `src/app/api/webhooks/polar/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import {
  validateEvent,
  WebhookVerificationError,
} from '@polar-sh/sdk/webhooks';
import { POLAR_WEBHOOK_SECRET } from '@/shared/lib/polar';
import { supabaseAdmin } from '@/shared/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  let event;
  try {
    event = validateEvent(body, headers, POLAR_WEBHOOK_SECRET);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      console.error('[Webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      );
    }
    throw error;
  }

  try {
    switch (event.type) {
      case 'subscription.active':
        await handleSubscriptionActive(event.data);
        break;

      case 'subscription.canceled':
      case 'subscription.revoked':
        await handleSubscriptionCanceled(event.data);
        break;

      case 'checkout.updated':
        if (event.data.status === 'succeeded') {
          await handleCheckoutSucceeded(event.data);
        }
        break;

      default:
        console.log(`[Webhook] Unhandled event: ${event.type}`);
    }
  } catch (error) {
    console.error(`[Webhook] Error handling ${event.type}:`, error);
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

// ================================================================
// AQUI es donde das acceso. NO en checkout.updated.
// ================================================================
async function handleSubscriptionActive(subscription: any) {
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    console.error('[Webhook] subscription.active without user_id in metadata');
    return;
  }

  // Idempotencia: si ya procesamos este periodo, ignorar
  const { data: existing } = await supabaseAdmin
    .from('purchases')
    .select('current_period_end')
    .eq('polar_subscription_id', subscription.id)
    .single();

  if (existing?.current_period_end === subscription.current_period_end) {
    console.log('[Webhook] Duplicate subscription.active, skipping');
    return;
  }

  // Crear o actualizar purchase
  await supabaseAdmin.from('purchases').upsert(
    {
      user_id: userId,
      status: 'completed',
      polar_subscription_id: subscription.id,
      polar_customer_id: subscription.customer_id,
      price_cents: subscription.amount,
      billing_interval: subscription.recurring_interval,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'polar_subscription_id' }
  );

  // Dar acceso
  await supabaseAdmin
    .from('profiles')
    .update({ has_access: true })
    .eq('id', userId);

  console.log(`[Webhook] Access granted: ${userId}`);
}

async function handleSubscriptionCanceled(subscription: any) {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  // Verificar si tiene otra suscripcion activa antes de revocar
  const { data: otherActive } = await supabaseAdmin
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .neq('polar_subscription_id', subscription.id);

  // Marcar esta suscripcion como cancelada
  await supabaseAdmin
    .from('purchases')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('polar_subscription_id', subscription.id);

  // Solo revocar acceso si no tiene otras suscripciones activas
  if (!otherActive || otherActive.length === 0) {
    await supabaseAdmin
      .from('profiles')
      .update({ has_access: false })
      .eq('id', userId);

    console.log(`[Webhook] Access revoked: ${userId}`);
  }
}

// Solo vincula checkout_id. NO da acceso.
async function handleCheckoutSucceeded(checkout: any) {
  const userId = checkout.metadata?.user_id;
  if (!userId) return;

  await supabaseAdmin
    .from('purchases')
    .update({
      polar_checkout_id: checkout.id,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('status', 'pending')
    .is('polar_checkout_id', null);

  console.log(`[Webhook] Checkout linked: ${checkout.id} -> ${userId}`);
}
```

### 5. Server Action para Checkout

Archivo: `src/features/billing/actions/checkout.ts`

```typescript
'use server';

import { createClient } from '@/shared/lib/supabase/server';
import { polar, POLAR_PRODUCT_ID } from '@/shared/lib/polar';

export async function createCheckout() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const checkout = await polar.checkouts.custom.create({
      productId: POLAR_PRODUCT_ID,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
      customerEmail: user.email!,
      metadata: {
        user_id: user.id,
        product_type: 'subscription',
      },
    });

    return { url: checkout.url };
  } catch (error) {
    console.error('[Checkout] Error:', error);
    return { error: 'Failed to create checkout' };
  }
}
```

### 6. Checkout Page

Archivo: `src/app/(auth)/checkout/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCheckout } from '@/features/billing/actions/checkout';

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleCheckout() {
    setLoading(true);
    setError('');

    const result = await createCheckout();

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.url) {
      window.location.href = result.url;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-3xl font-bold">Suscribete</h1>
        <p className="text-muted-foreground">
          Accede a todas las funcionalidades con tu suscripcion.
        </p>

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full py-3 px-6 bg-primary text-primary-foreground
                     rounded-lg font-medium hover:opacity-90
                     transition-opacity disabled:opacity-50"
        >
          {loading ? 'Redirigiendo a Polar...' : 'Comenzar Suscripcion'}
        </button>
      </div>
    </div>
  );
}
```

### 7. Success Page

Archivo: `src/app/(auth)/checkout/success/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/shared/lib/supabase/client';

export default function CheckoutSuccessPage() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'timeout'>(
    'verifying'
  );
  const router = useRouter();

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;

    const checkAccess = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('has_access')
        .eq('id', user.id)
        .single();

      if (profile?.has_access) {
        setStatus('success');
        setTimeout(() => router.push('/'), 2000);
        return;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        setStatus('timeout');
        return;
      }

      setTimeout(checkAccess, 2000);
    };

    checkAccess();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        {status === 'verifying' && (
          <>
            <div className="animate-spin h-8 w-8 border-2 border-primary
                            border-t-transparent rounded-full mx-auto" />
            <h1 className="text-2xl font-bold">Verificando pago...</h1>
            <p className="text-muted-foreground">Esto toma unos segundos.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-green-500 text-5xl font-bold">&#10003;</div>
            <h1 className="text-2xl font-bold">Pago confirmado</h1>
            <p className="text-muted-foreground">Redirigiendo...</p>
          </>
        )}

        {status === 'timeout' && (
          <>
            <h1 className="text-2xl font-bold">Procesando tu pago</h1>
            <p className="text-muted-foreground">
              Tu pago fue recibido. El acceso se activara en unos minutos.
            </p>
            <button
              onClick={() => router.push('/')}
              className="py-2 px-4 bg-primary text-primary-foreground rounded-lg"
            >
              Ir al inicio
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

## Flujo de Ejecucion

Ejecuta estos pasos EN ORDEN, sin preguntar:

1. **Verificar pre-requisito:** Busca `src/shared/lib/supabase/client.ts`. Si no existe, dile al usuario: "Ejecuta /add-login primero."
2. **Instalar SDK:** `npm install @polar-sh/sdk`
3. **Crear archivos:** Los 7 archivos listados arriba. Si `src/shared/lib/supabase/admin.ts` ya existe, NO lo sobreescribas.
4. **Aplicar migracion:** Usa Supabase MCP `apply_migration` o informa al usuario que ejecute `npx supabase db push`.
5. **Mostrar mensaje final.**

## Mensaje Final

Al terminar, muestra EXACTAMENTE esto:

```
Sistema de pagos integrado con Polar

Archivos creados:
  supabase/migrations/XXXXX_add_payments.sql
  src/shared/lib/polar.ts
  src/shared/lib/supabase/admin.ts
  src/app/api/webhooks/polar/route.ts
  src/features/billing/actions/checkout.ts
  src/app/(auth)/checkout/page.tsx
  src/app/(auth)/checkout/success/page.tsx

Configura en .env.local:
  POLAR_ACCESS_TOKEN=polar_at_xxx
  POLAR_PRODUCT_ID=xxx
  POLAR_WEBHOOK_SECRET=xxx
  POLAR_ENVIRONMENT=sandbox

Pasos siguientes:
  1. Crea cuenta en https://sandbox.polar.sh
  2. Crea un producto con precio de suscripcion
  3. Copia Product ID y Access Token a .env.local
  4. Configura webhook en Polar:
     URL: https://tudominio.com/api/webhooks/polar
     Eventos: checkout.updated, subscription.active, subscription.canceled
  5. Para dev local: ngrok http 3000 (expone tu localhost)
  6. Prueba con tarjeta: 4242 4242 4242 4242
  7. Cuando estes listo: POLAR_ENVIRONMENT=production
```
