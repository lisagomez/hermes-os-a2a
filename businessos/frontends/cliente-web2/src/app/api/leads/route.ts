import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient, hasServiceConfig } from '@/lib/supabase/service';

// Validación estricta de la entrada del formulario público (landing).
const LeadSchema = z.object({
  nombre: z.string().trim().min(1, 'nombre requerido').max(120),
  email: z.string().trim().email('email inválido').max(200),
  empresa: z.string().trim().max(160).optional(),
  mensaje: z.string().trim().max(2000).optional(),
  idioma: z.enum(['es', 'en']).optional(),
  mazo: z.array(z.string().max(60)).max(20).optional(),
  horario: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = LeadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 400 });
  }
  const lead = parsed.data;

  // Degradación honesta: si Supabase no está configurado, no fingimos éxito.
  if (!hasServiceConfig()) {
    console.error('[leads] Supabase no configurado — lead no persistido');
    return NextResponse.json({ ok: false, error: 'Servicio no disponible' }, { status: 503 });
  }

  const leadId = `web2-${crypto.randomUUID()}`;
  const row = {
    lead_id: leadId,
    origen: 'web2' as const,
    empresa: lead.empresa ?? '',
    contacto: `${lead.nombre} <${lead.email}>`,
    mensaje: lead.mensaje ?? '',
    etapa: 'nuevo' as const,
    datos: {
      source: 'web2-landing',
      nombre: lead.nombre,
      email: lead.email,
      idioma: lead.idioma ?? 'es',
      mazo: lead.mazo ?? [],
      horario: lead.horario ?? null,
    },
  };

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from('leads').insert(row);
    if (error) {
      console.error('[leads] insert falló:', error.message);
      return NextResponse.json({ ok: false, error: 'No se pudo guardar' }, { status: 500 });
    }
  } catch (err) {
    console.error('[leads] excepción:', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: 'No se pudo guardar' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, lead_id: leadId });
}
