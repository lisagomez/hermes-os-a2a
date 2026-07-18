import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const BUCKET = 'generated-images'

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = await createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() ?? 'png'
    const fileName = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`

    const supabase = createServiceClient()
    const buffer = Buffer.from(await file.arrayBuffer())

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, { contentType: file.type, upsert: false })

    if (error) {
      console.error('[storage/upload] Upload failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (err) {
    console.error('[storage/upload] Unexpected error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
