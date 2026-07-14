// Calendar bridge configuration, fed entirely by env (no personal defaults).
//   GOOGLE_CALENDAR_ACCOUNT            — primary account email (required to use the gog bridge)
//   GOOGLE_CALENDAR_ACCOUNT_SECONDARY  — optional second account (e.g. a shared/work calendar)
//   OBJECTIVE_CALENDAR_ID              — optional calendar id whose all-day events are "daily objectives"
//   GOG_KEYRING_PASSWORD               — required by the gog CLI keyring (no default; read in gog-bridge)
//
// The primary account is typed 'personal', the secondary 'business'. Non-owner
// roles only ever see the secondary (shared) account, if one is configured.
import type { CalendarAccountType } from '@/features/calendar/types'

export const PRIMARY_ACCOUNT = (process.env.GOOGLE_CALENDAR_ACCOUNT ?? '').trim()
export const SECONDARY_ACCOUNT = (process.env.GOOGLE_CALENDAR_ACCOUNT_SECONDARY ?? '').trim()
export const OBJECTIVE_CALENDAR_ID = (process.env.OBJECTIVE_CALENDAR_ID ?? '').trim() || null

/** Accounts the bridge is allowed to touch (primary + optional secondary). */
export const ALLOWED_ACCOUNTS: string[] = [PRIMARY_ACCOUNT, SECONDARY_ACCOUNT].filter(Boolean)

export const ACCOUNT_TYPE_BY_EMAIL: Record<string, CalendarAccountType> = {
  ...(PRIMARY_ACCOUNT ? { [PRIMARY_ACCOUNT]: 'personal' as const } : {}),
  ...(SECONDARY_ACCOUNT ? { [SECONDARY_ACCOUNT]: 'business' as const } : {}),
}

export const EMAIL_BY_ACCOUNT_TYPE: Record<CalendarAccountType, string> = {
  personal: PRIMARY_ACCOUNT,
  business: SECONDARY_ACCOUNT || PRIMARY_ACCOUNT,
}

export function isCalendarConfigured(): boolean {
  return ALLOWED_ACCOUNTS.length > 0
}

/** Accounts a given role may read/write: owner sees all, others only the secondary. */
export function accountsForRole(role: string | null | undefined): string[] {
  if (role === 'owner') return ALLOWED_ACCOUNTS
  return SECONDARY_ACCOUNT ? [SECONDARY_ACCOUNT] : []
}
