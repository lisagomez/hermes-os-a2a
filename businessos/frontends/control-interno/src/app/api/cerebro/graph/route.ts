// Segundo Cerebro — grafo completo del conocimiento curado.
// La memoria/knowledge se lee del FILESYSTEM server-side (gotcha RLS/desktop:
// data del dueño jamás via supabase.from() del browser). Read-only estricto.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasRole } from '@/lib/auth-utils'
import { buildGraph } from '@/features/cerebro/server/graph'

export const dynamic = 'force-dynamic'

async function authorized(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  return hasRole(user.id, 'owner', 'admin')
}

export async function GET(request: Request) {
  if (!(await authorized())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const force = new URL(request.url).searchParams.get('refresh') === '1'
  const graph = await buildGraph(force)
  return NextResponse.json(graph)
}
