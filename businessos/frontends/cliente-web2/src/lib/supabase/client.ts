import { createBrowserClient } from '@supabase/ssr';

// Los NEXT_PUBLIC_* los inlinea Next en build cuando se leen como expresión
// estática completa process.env.<NAME> (nunca process.env[name]).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Cliente de browser (anon key + RLS). Para datos públicos-seguros. */
export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — copia .env.example a .env.local',
    );
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
