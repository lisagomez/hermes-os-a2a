import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth-utils'
import { createServiceClient } from '@/lib/supabase/service'
import { SECONDARY_ACCOUNT } from '@/lib/calendar/config'

// Optional agent profile id used to attribute calendar activity writes. When unset,
// activity is logged without an agent_id.
const AGENT_PROFILE_ID = process.env.AGENT_PROFILE_ID ?? null

export async function requireCalendarUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      role: null,
    }
  }

  const role = await getUserRole(user.id)
  if (!role) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      user: null,
      role: null,
    }
  }

  return { error: null, user, role }
}

export function canUseAccount(role: string | null, accountEmail?: string) {
  if (!accountEmail) return true
  if (role === 'owner') return true
  return SECONDARY_ACCOUNT !== '' && accountEmail === SECONDARY_ACCOUNT
}

export async function logCalendarActivity(message: string, targetId?: string | null) {
  try {
    const service = createServiceClient()
    const row: Record<string, unknown> = {
      type: 'calendar_update',
      message,
      target_id: targetId ?? null,
    }
    if (AGENT_PROFILE_ID) row.agent_id = AGENT_PROFILE_ID
    await service.from('activities').insert(row)
  } catch {
    // Activity logging should never break Calendar writes.
  }
}
