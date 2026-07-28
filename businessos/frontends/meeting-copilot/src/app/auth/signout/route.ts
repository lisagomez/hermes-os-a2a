import { NextResponse } from 'next/server'
import { createClient } from '@/shared/lib/supabase/server'
import { authConfigurada } from '@/shared/lib/auth/acceso'

export async function POST(request: Request) {
  if (authConfigurada()) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}
