/**
 * POST /api/draw3/[id]/thumbnail — sube el preview webp de la página al
 * bucket `draw-thumbnails` y actualiza draw.thumbnail_url.
 *
 * Body: { dataUrl: 'data:image/webp;base64,...' }
 * El cliente captura un render reducido (~480px) después de guardar.
 */
import { NextResponse } from 'next/server'
import { authenticateDraw3 } from '@/lib/draw3-auth'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_THUMBNAIL_BYTES = 300 * 1024

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await authenticateDraw3(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: pageId } = await params
    const body = await request.json().catch(() => null) as { dataUrl?: string } | null
    const dataUrl = body?.dataUrl ?? ''
    const match = /^data:(image\/(?:webp|png|jpeg));base64,(.+)$/.exec(dataUrl)
    if (!match) {
      return NextResponse.json({ error: 'dataUrl must be a base64 image data URL (webp/png/jpeg)' }, { status: 400 })
    }
    const contentType = match[1]
    const bytes = Buffer.from(match[2], 'base64')
    if (bytes.byteLength > MAX_THUMBNAIL_BYTES) {
      return NextResponse.json({ error: `Thumbnail too large (${bytes.byteLength} bytes, max ${MAX_THUMBNAIL_BYTES})` }, { status: 413 })
    }

    const supabase = createServiceClient()
    const ext = contentType.split('/')[1]
    const path = `${pageId}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('draw-thumbnails')
      .upload(path, bytes, { contentType, upsert: true })
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: pub } = supabase.storage.from('draw-thumbnails').getPublicUrl(path)
    // Cache-bust: la URL es estable por pagina, el sidebar agrega ?v=updated_at
    const { error: updateError } = await supabase
      .from('draw')
      .update({ thumbnail_url: pub.publicUrl })
      .eq('page_id', pageId)
      .eq('is_deleted', false)
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, page_id: pageId, thumbnail_url: pub.publicUrl })
  } catch (err) {
    console.error('[api/draw3/:id/thumbnail] error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
