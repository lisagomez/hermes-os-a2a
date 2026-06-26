---
name: add-emails
description: |
  Integra sistema de correos transaccionales con Resend + React Email en tu proyecto Next.js + Supabase.
  Configura cliente, templates profesionales, batch sending y unsubscribe management.

  Usar cuando: "agrega emails", "add emails", "sistema de correos", "integra Resend",
  "email transaccional", "enviar correos", "email templates", "notificaciones por email",
  "welcome email", "correos automaticos", "mailer", "SMTP", "correo".

  Pre-requisito: /add-login (necesita profiles en Supabase).
  NO USAR para: push notifications (usar /add-mobile), email marketing masivo.
allowed-tools: Bash(npm *), Bash(npx *), Read, Write, Edit, Glob, Grep
---

# Add Emails — Resend + React Email

Integra un sistema de correos transaccionales completo usando Resend como proveedor
y React Email para templates tipados y profesionales.

NO PREGUNTES. Ejecuta el Golden Path completo.

## Pre-requisitos

1. `/add-login` ejecutado — busca `src/shared/lib/supabase/client.ts`. Si no existe, dile al usuario que ejecute `/add-login` primero.
2. Paquetes: `npm install resend @react-email/components`

## Principios

- **Resend como proveedor.** API simple, React Email nativo, buen free tier.
- **React Email para templates.** Componentes tipados, preview en dev, inline styles automatico.
- **Batch sending con rate limiting.** 100 emails por batch, 1s entre batches.
- **RFC 8058 unsubscribe.** One-click unsubscribe obligatorio para evitar spam filters.
- **Nunca exponer API key al frontend.** Todo server-side.

## Archivos a Crear

### 1. Migracion SQL

Archivo: `supabase/migrations/$(date +%Y%m%d%H%M%S)_add_emails.sql`

```sql
-- Email preferences on profiles
-- Requires: profiles table (from add-login)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true;
```

### 2. Resend Client

Archivo: `src/shared/lib/resend.ts`

```typescript
import { Resend } from 'resend';

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY not configured');
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const fromName = process.env.RESEND_FROM_NAME || 'My App';
const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@example.com';

export const EMAIL_FROM = `${fromName} <${fromEmail}>`;
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
```

### 3. Email Service

Archivo: `src/features/email/services/emailService.ts`

```typescript
import { getResendClient, EMAIL_FROM, SITE_URL } from '@/shared/lib/resend';

interface SendEmailParams {
  to: string;
  subject: string;
  react: React.ReactElement;
  userId?: string;
}

interface BatchRecipient {
  user_id: string;
  email: string;
}

export async function sendEmail({ to, subject, react, userId }: SendEmailParams) {
  const resend = getResendClient();

  const headers: Record<string, string> = {};
  if (userId) {
    const unsubUrl = `${SITE_URL}/api/email/unsubscribe?userId=${userId}&type=general`;
    headers['List-Unsubscribe'] = `<${unsubUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    react,
    headers,
  });

  if (error) throw error;
  return data;
}

export async function sendBatchEmails(
  recipients: BatchRecipient[],
  renderEmail: (recipient: BatchRecipient) => {
    subject: string;
    react: React.ReactElement;
  },
  batchSize = 100,
  delayMs = 1000
) {
  const batches = chunkArray(recipients, batchSize);
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    const emails = batch.map((recipient) => {
      const { subject, react } = renderEmail(recipient);
      const unsubUrl = `${SITE_URL}/api/email/unsubscribe?userId=${recipient.user_id}&type=general`;

      return {
        from: EMAIL_FROM,
        to: recipient.email,
        subject,
        react,
        headers: {
          'List-Unsubscribe': `<${unsubUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      };
    });

    try {
      const resend = getResendClient();
      await resend.batch.send(emails);
      sent += batch.length;
    } catch (err: any) {
      failed += batch.length;
      errors.push(err.message || 'Batch send failed');
    }

    // Rate limit between batches
    if (i < batches.length - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return { sent, failed, errors };
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

### 4. Welcome Email Template

Archivo: `src/features/email/templates/WelcomeEmail.tsx`

Este es un template de ejemplo. El usuario creara los suyos siguiendo este patron.

```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Preview,
  Hr,
} from '@react-email/components';

interface WelcomeEmailProps {
  userName: string;
  appName: string;
  loginUrl: string;
}

export default function WelcomeEmail({
  userName = 'Usuario',
  appName = 'My App',
  loginUrl = 'https://example.com/login',
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Bienvenido a {appName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerText}>{appName}</Text>
          </Section>

          <Section style={content}>
            <Text style={heading}>Bienvenido, {userName}</Text>
            <Text style={paragraph}>
              Tu cuenta esta lista. Ya puedes acceder a todo el contenido.
            </Text>

            <Section style={buttonContainer}>
              <Link href={loginUrl} style={button}>
                Acceder a {appName}
              </Link>
            </Section>
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              Recibiste este email porque creaste una cuenta en {appName}.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: '#0f0f13',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '40px auto',
};

const header: React.CSSProperties = {
  backgroundColor: '#09090b',
  padding: '24px 32px',
  borderRadius: '12px 12px 0 0',
  textAlign: 'center' as const,
};

const headerText: React.CSSProperties = {
  color: '#f4f4f5',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: 0,
};

const content: React.CSSProperties = {
  backgroundColor: '#18181b',
  padding: '32px',
};

const heading: React.CSSProperties = {
  color: '#f4f4f5',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
};

const paragraph: React.CSSProperties = {
  color: '#a1a1aa',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px 0',
};

const buttonContainer: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button: React.CSSProperties = {
  backgroundColor: '#683ACC',
  color: '#ffffff',
  padding: '12px 32px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '16px',
  fontWeight: 'bold',
};

const divider: React.CSSProperties = {
  borderColor: '#27272a',
  margin: 0,
};

const footer: React.CSSProperties = {
  backgroundColor: '#09090b',
  padding: '16px 32px',
  borderRadius: '0 0 12px 12px',
};

const footerText: React.CSSProperties = {
  color: '#71717a',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: 0,
};
```

### 5. Unsubscribe Route

Archivo: `src/app/api/email/unsubscribe/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET: User clicks unsubscribe link in email
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId || !UUID_REGEX.test(userId)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  await supabaseAdmin
    .from('profiles')
    .update({ email_notifications_enabled: false })
    .eq('id', userId);

  return NextResponse.redirect(new URL('/email-unsubscribed', request.url));
}

// POST: RFC 8058 one-click unsubscribe (email client initiated)
export async function POST(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId || !UUID_REGEX.test(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }

  await supabaseAdmin
    .from('profiles')
    .update({ email_notifications_enabled: false })
    .eq('id', userId);

  return NextResponse.json({ success: true });
}
```

### 6. Unsubscribe Confirmation Page

Archivo: `src/app/email-unsubscribed/page.tsx`

```tsx
export default function EmailUnsubscribedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-bold">Email desactivado</h1>
        <p className="text-muted-foreground">
          Ya no recibiras notificaciones por email.
          Puedes reactivarlas desde tu perfil en cualquier momento.
        </p>
      </div>
    </div>
  );
}
```

## Flujo de Ejecucion

1. Verificar que `/add-login` fue ejecutado (buscar profiles table).
2. Instalar: `npm install resend @react-email/components`
3. Crear TODOS los archivos listados.
4. Aplicar migracion.
5. Mostrar mensaje final.

## Mensaje Final

```
Sistema de emails integrado con Resend

Archivos creados:
  supabase/migrations/XXXXX_add_emails.sql
  src/shared/lib/resend.ts
  src/features/email/services/emailService.ts
  src/features/email/templates/WelcomeEmail.tsx
  src/app/api/email/unsubscribe/route.ts
  src/app/email-unsubscribed/page.tsx

Configura en .env.local:
  RESEND_API_KEY=re_xxx
  RESEND_FROM_NAME=Mi App
  RESEND_FROM_EMAIL=noreply@midominio.com
  NEXT_PUBLIC_SITE_URL=https://midominio.com

Pasos siguientes:
  1. Crea cuenta en https://resend.com
  2. Verifica tu dominio (DNS records)
  3. Copia la API key a .env.local
  4. Usa sendEmail() para enviar correos individuales
  5. Usa sendBatchEmails() para envios masivos (100/batch, rate limited)
  6. Crea nuevos templates copiando WelcomeEmail.tsx como base

Ejemplo de uso:
  import { sendEmail } from '@/features/email/services/emailService';
  import WelcomeEmail from '@/features/email/templates/WelcomeEmail';

  await sendEmail({
    to: 'user@example.com',
    subject: 'Bienvenido!',
    react: WelcomeEmail({ userName: 'Daniel', appName: 'Mi App', loginUrl: '...' }),
    userId: user.id,  // Para link de unsubscribe
  });
```
