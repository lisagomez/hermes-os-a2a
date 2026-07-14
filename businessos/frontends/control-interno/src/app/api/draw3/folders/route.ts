/**
 * /api/draw3/folders — canvas folders, server-side with unified auth.
 *
 * Folders previously used the browser Supabase client (RLS), which returned
 * nothing on the desktop app (no Supabase session, only the localhost bypass) —
 * so folders never showed in the desktop sidebar. Routing them through this API
 * (same auth as pages: token / desktop bypass / web session) fixes that and keeps
 * web working too.
 */
import { NextResponse } from 'next/server'
import { authenticateDraw3 } from '@/lib/draw3-auth'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Optional owner profile id to scope canvas folders. When unset (single-tenant
// install) all folders are returned and new folders are created without owner.
const OWNER_PROFILE_ID = process.env.OWNER_PROFILE_ID ?? null

export async function GET(request: Request) {
  if (!(await authenticateDraw3(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createServiceClient()
  let query = supabase
    .from('draw_folders')
    .select()
    .order('position', { ascending: true })
  if (OWNER_PROFILE_ID) query = query.eq('user_id', OWNER_PROFILE_ID)
  const { data, error } = await query
  if (error) {
    console.error('[api/draw3/folders GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, folders: data ?? [] })
}

export async function POST(request: Request) {
  if (!(await authenticateDraw3(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { name } = (await request.json().catch(() => ({}))) as { name?: string }
  const supabase = createServiceClient()
  const folderRow: Record<string, unknown> = { name: name ?? 'Nueva Carpeta' }
  if (OWNER_PROFILE_ID) folderRow.user_id = OWNER_PROFILE_ID
  const { data, error } = await supabase
    .from('draw_folders')
    .insert(folderRow)
    .select()
    .single()
  if (error || !data) {
    console.error('[api/draw3/folders POST]', error)
    return NextResponse.json({ error: error?.message ?? 'create failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, folder: data })
}

export async function PATCH(request: Request) {
  if (!(await authenticateDraw3(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = (await request.json().catch(() => ({}))) as {
    action?: 'rename' | 'delete' | 'move'
    id?: string
    name?: string
    pageId?: string
    folderId?: string | null
  }
  const supabase = createServiceClient()

  if (body.action === 'rename' && body.id) {
    const { error } = await supabase
      .from('draw_folders')
      .update({ name: body.name ?? 'Carpeta', updated_at: new Date().toISOString() })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'delete' && body.id) {
    // Move pages in this folder back to root, then delete the folder.
    await supabase.from('draw').update({ folder_id: null }).eq('folder_id', body.id)
    const { error } = await supabase.from('draw_folders').delete().eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'move' && body.pageId) {
    const { error } = await supabase
      .from('draw')
      .update({ folder_id: body.folderId ?? null, updated_at: new Date().toISOString() })
      .eq('page_id', body.pageId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
