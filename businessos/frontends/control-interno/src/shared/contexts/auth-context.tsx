'use client'
/**
 * AuthProvider — fuente ÚNICA de auth para toda la app. Antes 11 componentes
 * llamaban useAuth por separado, cada uno con su propia suscripción onAuthStateChange
 * + su propio fetch de `profiles` (11 fetches en cada apertura). Ahora: 1 suscripción,
 * 1 fetch, compartido por contexto.
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LOCAL_DESKTOP_EMAIL, LOCAL_DESKTOP_USER_ID } from '@/lib/desktop-auth'
import { isDesktopRuntime } from '@/lib/local-first'
import type { User } from '@supabase/supabase-js'
import type { Profile, UserRole } from '@/types/database'

const LOCAL_DESKTOP_PROFILE: Profile = {
  id: LOCAL_DESKTOP_USER_ID,
  full_name: process.env.NEXT_PUBLIC_OWNER_NAME ?? 'Owner',
  avatar_url: null,
  email: LOCAL_DESKTOP_EMAIL,
  role: 'owner',
  created_at: '2026-05-26T00:00:00.000Z',
  updated_at: '2026-05-26T00:00:00.000Z',
}

export interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  isOwner: boolean
  role: UserRole
}

const AuthContext = createContext<AuthState>({
  user: null, profile: null, loading: true, isOwner: false, role: 'member',
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  // id del usuario cuyo profile YA cargó CON ÉXITO. Solo se marca tras un fetch OK,
  // para que un fetch fallido reintente en lugar de quedar atascado en role='member'.
  const loadedIdRef = useRef<string | null>(null)
  // id cuyo fetch está EN VUELO — dedupe de eventos repetidos (INITIAL_SESSION +
  // TOKEN_REFRESHED) sin marcarlo como cargado todavía.
  const fetchingIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (isDesktopRuntime()) {
      setUser(null)
      setProfile(LOCAL_DESKTOP_PROFILE)
      setLoading(false)
      return
    }

    const supabase = createClient()
    let mounted = true

    // setTimeout(0) escapa el navigator lock que supabase auth sostiene durante la
    // emisión del evento (sin esto, deadlock en la query REST). loading SOLO pasa a
    // false cuando el profile queda resuelto — NUNCA con profile=null por un evento
    // duplicado (esa ventana exponía role='member' y expulsaba al owner de las rutas
    // owner-only → loop de redirect en móvil/red lenta).
    const loadProfile = (userId: string, attempt = 0) => {
      setTimeout(async () => {
        if (!mounted) return
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        if (!mounted) return
        if (error || !data) {
          // Fetch falló (blip de red / RLS). NO marcar como cargado: reintento acotado
          // para redes flaky (móvil/5G). fetchingIdRef sigue puesto durante el reintento.
          if (attempt < 3) {
            setTimeout(() => { if (mounted) loadProfile(userId, attempt + 1) }, 1200 * (attempt + 1))
            return
          }
          // Tras varios intentos, soltar loading para no colgar la UI (modo degradado).
          fetchingIdRef.current = null
          setLoading(false)
          return
        }
        fetchingIdRef.current = null
        loadedIdRef.current = userId
        setProfile(data)
        setLoading(false)
      }, 0)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null
        if (!mounted) return
        setUser(currentUser)

        if (!currentUser) {
          loadedIdRef.current = null
          fetchingIdRef.current = null
          setProfile(null)
          setLoading(false)
          return
        }

        // Profile ya cargado con éxito → nada que hacer (loading ya es false).
        if (loadedIdRef.current === currentUser.id) return
        // Fetch en vuelo para este usuario → no duplicar.
        if (fetchingIdRef.current === currentUser.id) return

        fetchingIdRef.current = currentUser.id
        setLoading(true)
        loadProfile(currentUser.id)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const isOwner = profile?.role === 'owner'
  const role: UserRole = profile?.role ?? 'member'

  return (
    <AuthContext.Provider value={{ user, profile, loading, isOwner, role }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthState {
  return useContext(AuthContext)
}
