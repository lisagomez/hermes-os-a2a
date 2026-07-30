'use client'
import { useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLayoutStore } from '@/shared/stores/layout-store'
import { useAuth } from '@/hooks/useAuth'
import {
  Activity,
  LayoutGrid,
  Settings,
  Bot,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Clock,
  LogOut,
  MessagesSquare,
  Sparkles,
  Search,
  CalendarDays,
  Brain,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { canAccessRoute } from '@/lib/permissions'
import { rastroDe, type NavNodo } from '@/shared/app-registry'
import { NAV_CI } from '@/shared/nav.config'
import { AppLauncher } from '@/shared/components/AppLauncher'
import { useIsMobile } from '@/shared/hooks/useMediaQuery'
import { useDrawStore } from '@/features/draw/stores/draw-store'
import { useSearchStore } from '@/features/search/components'
import { NotificationBell } from '@/features/notifications/components/NotificationBell'
import { signout } from '@/actions/auth'
import type { Profile } from '@/types/database'

// El árbol de navegación vive en src/shared/nav.config.ts (config-driven,
// Sección → Página → Subpágina). Aquí solo se mapean los iconos lucide.
const ICONOS_NAV: Record<string, LucideIcon> = {
  Bot,
  MessagesSquare,
  LayoutGrid,
  CalendarDays,
  Sparkles,
  Brain,
  Wallet,
  Wrench,
  Activity,
  Clock,
}

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
  const seccionesCerradas = useLayoutStore((s) => s.seccionesCerradas)
  const toggleSeccion = useLayoutStore((s) => s.toggleSeccion)
  const lastPageId = useDrawStore((s) => s.lastPageId)

  // Rama activa del árbol (breadcrumb/resaltado); los hrefs de esta app no
  // llevan query, así que el pathname basta.
  const rastro = rastroDe(NAV_CI, pathname ?? '/')
  const activos = new Set(rastro.map((n) => n.id))
  // RBAC POR NODO: el árbol no manda sobre permissions.ts — lo consume.
  const visible = (nodo: NavNodo) => canAccessRoute(nodo.permisoRuta ?? nodo.href ?? '', role)

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

      {/* Top row: Search (Miro-style, replaces removed header) + waffle del ecosistema */}
      <div className={collapsed ? 'flex flex-col items-center gap-2 px-2 pt-2 pb-2' : 'flex items-center gap-1 px-3 pt-2 pb-2'}>
        <AppLauncher compact={collapsed} />
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

      {/* Árbol jerárquico (Sección → Página → Subpágina), filtrado por rol.
          Colapsado: riel de iconos con solo las páginas (nivel 2). */}
      <div className={collapsed ? 'flex w-full flex-col items-center gap-1 px-2 pt-2 pb-2' : 'px-3 pt-2 pb-2 space-y-2'}>
        {NAV_CI.secciones.map((seccion) => {
          const paginas = (seccion.hijos ?? []).filter((n) => !n.ocultoEnSidebar && visible(n))
          if (paginas.length === 0) return null // sección sin hijos visibles para el rol → no se pinta
          const abierta = collapsed || !seccionesCerradas.includes(seccion.id)

          const itemPagina = (nodo: NavNodo, nivel: 2 | 3) => {
            const rawHref = nodo.href ?? '/'
            const href = rawHref === '/draw3' && lastPageId ? `${rawHref}/${lastPageId}` : rawHref
            const Icon = ICONOS_NAV[nodo.iconoLucide ?? '']
            const isActive = activos.has(nodo.id)
            return (
              <Link
                key={nodo.id}
                href={href}
                onClick={handleNavigate}
                className={`${collapsed ? 'nav-item h-10 w-10 justify-center p-0' : `nav-item text-sm md:text-xs ${nivel === 3 ? 'ml-6' : ''}`} ${isActive ? 'nav-item-active' : ''}`}
                title={nodo.etiqueta}
                aria-label={nodo.etiqueta}
                aria-current={isActive ? 'page' : undefined}
              >
                {Icon ? <Icon className="size-6 md:size-[15px]" /> : nivel === 3 && !collapsed ? <span className="w-[15px] text-center text-muted">·</span> : null}
                {!collapsed && nodo.etiqueta}
              </Link>
            )
          }

          return (
            <div key={seccion.id} className={collapsed ? 'flex w-full flex-col items-center gap-1' : 'space-y-0.5'}>
              {!collapsed && (
                <button
                  onClick={() => toggleSeccion(seccion.id)}
                  className="flex w-full items-center justify-between px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted hover:text-foreground"
                  aria-expanded={abierta}
                >
                  {seccion.etiqueta}
                  {abierta ? <ChevronDown className="size-3" /> : <ChevronRightIcon className="size-3" />}
                </button>
              )}
              {abierta &&
                paginas.map((pagina) => (
                  <div key={pagina.id} className={collapsed ? 'contents' : 'space-y-0.5'}>
                    {itemPagina(pagina, 2)}
                    {!collapsed &&
                      activos.has(pagina.id) &&
                      (pagina.hijos ?? [])
                        .filter((h) => !h.ocultoEnSidebar && visible(h))
                        .map((sub) => itemPagina(sub, 3))}
                  </div>
                ))}
            </div>
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
