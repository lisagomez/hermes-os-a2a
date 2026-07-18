import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isLocalDesktopUserId } from '@/lib/desktop-auth'
import type { UserRole } from '@/types/database'

// Cache in-memory del rol por userId (TTL 5 min). El rol de un profile casi
// nunca cambia, pero ANTES cada request de API pagaba un round-trip a Postgres
// solo para re-leerlo (16 call-sites de hasRole en /api/chat/* y compañía).
// En lambdas tibias de Vercel y en el server desktop esto elimina ese hop del
// critical path. Mismas semánticas: cache miss o expirado → query real.
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000
const roleCache = new Map<string, { role: UserRole | null; expires: number }>()

let cachedServiceClient: SupabaseClient | null = null
function getServiceClient(): SupabaseClient {
  if (cachedServiceClient) return cachedServiceClient
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase credentials')
  }
  cachedServiceClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cachedServiceClient
}

/**
 * Get the user's role from the database.
 * Used in API routes to enforce role-based access control.
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  if (isLocalDesktopUserId(userId)) return 'owner'

  const hit = roleCache.get(userId)
  if (hit && hit.expires > Date.now()) return hit.role

  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data) {
    console.error('Error fetching user role:', error)
    return null
  }

  const role = (data.role as UserRole) || 'member'
  roleCache.set(userId, { role, expires: Date.now() + ROLE_CACHE_TTL_MS })
  return role
}

/**
 * Check if the user is an owner.
 * Returns true only if role is 'owner'.
 */
export async function isOwner(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  return role === 'owner'
}

/**
 * Check if the user has access to a specific role.
 * Useful for protecting specific features.
 */
export async function hasRole(userId: string, ...allowedRoles: UserRole[]): Promise<boolean> {
  const role = await getUserRole(userId)
  return role ? allowedRoles.includes(role) : false
}
