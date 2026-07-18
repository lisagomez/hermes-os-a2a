import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase con la service_role key.
 * Bypassa RLS — usar SOLO en routes server-side, NUNCA en código de cliente.
 * Las tablas de negocio (leads, cobros) tienen RLS sin políticas: sólo este
 * cliente puede escribirlas.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** True si el entorno tiene configurado Supabase server-side. */
export function hasServiceConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
