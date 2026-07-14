// Login allowlist + role assignment, fed entirely by env (no personal defaults).
//   OWNER_EMAIL     — single owner email (role 'owner')
//   ADMIN_EMAILS    — comma-separated emails (role 'admin')
//   ALLOWED_EMAILS  — comma-separated extra emails (role 'member')
// The allowlist is the union of all three. If none are set, no email can log in.

export type UserRole = 'owner' | 'admin' | 'member'

function parseCsv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? '').trim().toLowerCase()
const ADMIN_EMAILS = parseCsv(process.env.ADMIN_EMAILS)
const MEMBER_EMAILS = parseCsv(process.env.ALLOWED_EMAILS)

export const ALLOWED_EMAILS: readonly string[] = [
  ...(OWNER_EMAIL ? [OWNER_EMAIL] : []),
  ...ADMIN_EMAILS,
  ...MEMBER_EMAILS,
]

export function isEmailAllowed(email: string): boolean {
  return ALLOWED_EMAILS.includes(email.toLowerCase())
}

export function getRoleForEmail(email: string): UserRole {
  const normalized = email.toLowerCase()
  if (OWNER_EMAIL && normalized === OWNER_EMAIL) return 'owner'
  if (ADMIN_EMAILS.includes(normalized)) return 'admin'
  return 'member'
}
