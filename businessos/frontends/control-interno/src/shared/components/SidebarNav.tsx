'use client'
import { useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLayoutStore } from '@/shared/stores/layout-store'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutGrid,
  Settings,
  Bot,
  LogOut,
  Sparkles,
  Search,
  CalendarDays,
  Brain,
  Wallet,
} from 'lucide-react'
import { canAccessRoute } from '@/lib/permissions'
import { useIsMobile } from '@/shared/hooks/useMediaQuery'
import { useDrawStore } from '@/features/draw/stores/draw-store'
import { useSearchStore } from '@/features/search/components'
import { NotificationBell } from '@/features/notifications/components/NotificationBell'
import { signout } from '@/actions/auth'
import type { Profile } from '@/types/database'

const NAV_LINKS = [
  // Nucleo del producto: el chat con tu agente primero (AI-first), luego las
  // superficies-espejo (board, calendario, canvas). Ops vive en Settings.
  { href: '/chat', label: 'Chat', icon: Bot },
  { href: '/board', label: 'Board', icon: LayoutGrid },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/draw3', label: 'Canvas', icon: Sparkles },
  { href: '/segundo-cerebro', label: 'Brain', icon: Brain },
  { href: '/finanzas', label: 'Finanzas', icon: Wallet },
] as const

interface SidebarNavProps {
  members?: Profile[]
  loading?: boolean
  collapsed?: boolean
}

export function SidebarNav({ collapsed = false }: SidebarNavProps) {
  const pathname = usePathname()
  const { role, profile } = useAuth()
  const isMobile = useIsMobile()
  const closeLeftSidebar = useLayoutStore((s) => s.closeLeftSidebar)
  const lastPageId = useDrawStore((s) => s.lastPageId)

  // En móvil el sidebar es un overlay: al elegir cualquier sección debe
  // cerrarse solo (antes quedaba abierto tapando la página elegida). En
  // desktop es persistente, no se toca.
  const handleNavigate = useCallback(() => {
    if (isMobile) closeLeftSidebar()
  }, [isMobile, closeLeftSidebar])

  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden ${collapsed ? 'items-center' : ''}`}>
      {/* Scrollable content */}
      <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain ${collapsed ? 'w-full items-center' : ''}`}>

      {/* Brand lockup: Bot + wordmark (solo icono cuando esta colapsado) */}
      <div className={collapsed ? 'flex flex-col items-center px-2 pt-4 pb-1' : 'flex items-center gap-2 px-4 pt-4 pb-1'}>
        <Bot className="size-6 shrink-0 text-primary" aria-hidden="true" />
        {!collapsed && (
          <span className="font-sans text-[12px] font-semibold tracking-[0.14em] uppercase text-foreground truncate">
            business-os-new
          </span>
        )}
      </div>

      {/* Top row: Search (Miro-style, replaces removed header) */}
      <div className={collapsed ? 'flex flex-col items-center gap-2 px-2 pt-2 pb-2' : 'flex items-center gap-1 px-3 pt-2 pb-2'}>
        <button
          onClick={() => useSearchStore.getState().toggle()}
          className={collapsed ? 'icon-btn size-10' : 'nav-item flex-1 text-sm md:text-xs'}
          title="Buscar (Cmd+K)"
          aria-label="Buscar"
        >
          <Search className="size-5 md:size-[15px]" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Buscar</span>
              <kbd className="hidden md:inline text-[9px] px-1 py-0.5 rounded bg-card-hover text-muted border border-border-subtle">⌘K</kbd>
            </>
          )}
        </button>
      </div>

      <div className={collapsed ? 'mx-3 w-10 border-t border-border-subtle' : 'mx-3 border-t border-border-subtle'} />

      {/* Navigation Links (grouped by section) */}
      <div className={collapsed ? 'flex w-full flex-col items-center gap-1 px-2 pt-2 pb-2' : 'px-3 pt-2 pb-2 space-y-2'}>
        {NAV_LINKS.filter(({ href }) => canAccessRoute(href, role)).map(({ href: rawHref, label, icon: Icon }) => {
          const href =
            rawHref === '/draw3' && lastPageId ? `${rawHref}/${lastPageId}` : rawHref
          const isActive = pathname === rawHref || pathname.startsWith(`${rawHref}/`)
          return (
            <Link
              key={rawHref}
              href={href}
              onClick={handleNavigate}
              className={`${collapsed ? 'nav-item h-10 w-10 justify-center p-0' : 'nav-item text-sm md:text-xs'} ${isActive ? 'nav-item-active' : ''}`}
              title={label}
              aria-label={label}
            >
              <Icon className="size-6 md:size-[15px]" />
              {!collapsed && label}
            </Link>
          )
        })}
      </div>

      </div>{/* end scrollable content */}

      {/* Bottom section — Team, Settings, Sign Out */}
      <div
        className={`${collapsed ? 'flex w-full shrink-0 flex-col items-center gap-2 overflow-y-auto overscroll-contain px-2' : 'shrink-0 overflow-y-auto overscroll-contain px-3'} max-h-[min(46vh,22rem)] border-t border-border-subtle bg-surface/95`}
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {/* Fila unica de iconos (2 jul 2026): notificaciones + settings + sign out.
            Antes eran 3 filas completas + el bloque Team. */}
        <div className={collapsed ? 'flex flex-col items-center gap-1 py-1' : 'flex items-center justify-around px-2 py-1.5'}>
          {/* En móvil el bell vive en el Header global; montarlo TAMBIÉN aquí
              (el aside sigue en el DOM aunque esté fuera de pantalla) duplicaba
              fetch + canal realtime de notificaciones en cada carga. */}
          {!isMobile && <NotificationBell compact placement="top" ghost />}
          {canAccessRoute('/settings', role) && (
            <Link
              href="/settings"
              onClick={handleNavigate}
              className={`icon-btn-ghost size-9 ${pathname === '/settings' ? 'text-primary' : ''}`}
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="size-5 md:size-[16px]" />
            </Link>
          )}
          <form action={signout}>
            <button
              type="submit"
              className="icon-btn-ghost size-9 hover:text-error"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="size-5 md:size-[16px]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
