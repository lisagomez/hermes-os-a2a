import { createBrowserClient } from '@supabase/ssr'

// NEXT_PUBLIC_* values are inlined at build time by Next when read as a full,
// static process.env.<NAME> expression (never process.env[name]).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — copy .env.example to .env.local and fill it')
  }

  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  )
}
