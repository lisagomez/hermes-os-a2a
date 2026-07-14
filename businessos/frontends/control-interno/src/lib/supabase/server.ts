import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { LOCAL_DESKTOP_EMAIL, LOCAL_DESKTOP_USER_ID } from '@/lib/desktop-auth'
import { isDesktopAuthBypassFromHeaders } from '@/lib/desktop-auth-server'

// NEXT_PUBLIC_* values are inlined at build time by Next when read as a full,
// static process.env.<NAME> expression (never process.env[name]).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — copy .env.example to .env.local and fill it')
  }

  const cookieStore = await cookies()
  const allowLocalDesktop = await isDesktopAuthBypassFromHeaders()

  const client = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore en Server Components
          }
        },
      },
    }
  )

  if (allowLocalDesktop) {
    const originalGetUser = client.auth.getUser.bind(client.auth)
    client.auth.getUser = async (...args: Parameters<typeof originalGetUser>) => {
      const result = await originalGetUser(...args).catch(() => null)
      if (result?.data?.user) return result

      return {
        data: {
          user: {
            id: LOCAL_DESKTOP_USER_ID,
            email: LOCAL_DESKTOP_EMAIL,
            aud: 'authenticated',
            role: 'authenticated',
            app_metadata: {},
            user_metadata: { full_name: process.env.OWNER_NAME ?? process.env.NEXT_PUBLIC_OWNER_NAME ?? 'Owner' },
            created_at: '2026-05-26T00:00:00.000Z',
          },
        },
        error: null,
      } as Awaited<ReturnType<typeof originalGetUser>>
    }
  }

  return client
}
