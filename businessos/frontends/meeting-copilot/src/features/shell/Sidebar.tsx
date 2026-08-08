'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  BookOpenCheck,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  Funnel,
  Home,
  Layers,
  LayoutGrid,
  LogOut,
  MailCheck,
  MessagesSquare,
  Mic,
  Radar,
  ScrollText,
  ShieldCheck,
  Settings2,
  Telescope,
  Settings,
  Users,
  Wand2,
  type LucideIcon,
} from 'lucide-react'
import { useUiStore } from '@/shared/stores/ui-store'
// Import del submódulo /nav (NO el barrel): el barrel arrastra apps.ts (URLs
// internas) al bundle del layout, que también sirve las rutas PÚBLICAS /reservar.
import { rastroDe, type NavNodo } from '@/shared/app-registry/nav'
import { NAV_COPILOT } from './nav.config'

// El árbol vive en nav.config.ts (Sección → Página → Subpágina); aquí solo se
// mapean los iconos y se pinta. El activo sale de rastroDe (desambigua
// Reuniones vs Conversaciones por query — el matcher viejo la ignoraba).
const ICONOS_NAV: Record<string, LucideIcon> = {
  Funnel,
  Home,
  CalendarDays,
  MessagesSquare,
  Mic,
  Telescope,
  Users,
  CalendarCheck,
  Layers,
  LayoutGrid,
  BookOpenCheck,
  ClipboardCheck,
  MailCheck,
  ShieldCheck,
  Settings2,
  ScrollText,
  Wand2,
}

function SidebarContenido() {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const { sidebarColapsado, toggleSidebar, seccionesCerradas, toggleSeccion } = useUiStore()

  const rastro = rastroDe(NAV_COPILOT, pathname, search)
  const activos = new Set(rastro.map((n) => n.id))

  const item = (nodo: NavNodo, nivel: 1 | 2) => {
    if (!nodo.href || nodo.ocultoEnSidebar) return null
    const Icono = ICONOS_NAV[nodo.iconoLucide ?? ''] ?? LayoutGrid
    const activo = activos.has(nodo.id)
    return (
      <Link
        key={nodo.id}
        href={nodo.href}
        title={nodo.etiqueta}
        aria-current={activo ? 'page' : undefined}
        className={`nav-item ${activo ? 'nav-item-active' : ''} ${nivel === 2 && !sidebarColapsado ? 'ml-2' : ''}`}
      >
        <Icono className="h-4 w-4 shrink-0" />
        {!sidebarColapsado && <span className="truncate">{nodo.etiqueta}</span>}
      </Link>
    )
  }

  return (
    <aside
      data-testid="sidebar"
      className={`flex shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-150 ${
        sidebarColapsado ? 'w-[3.6rem]' : 'w-56'
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-s bg-accent text-accent-ink">
          <Radar className="h-4 w-4" />
        </span>
        {!sidebarColapsado && (
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight text-ink">Meeting Copilot</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">Mission Control</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        {NAV_COPILOT.secciones.map((seccion) => {
          // Nivel 1 con href y sin hijos visibles: item suelto (Inicio, Pre-Discovery, Manager).
          if (seccion.href) return item(seccion, 1)
          const paginas = (seccion.hijos ?? []).filter((h) => !h.ocultoEnSidebar)
          if (paginas.length === 0) return null
          const abierta = sidebarColapsado || !seccionesCerradas.includes(seccion.id)
          return (
            <div key={seccion.id}>
              {!sidebarColapsado && (
                <button
                  type="button"
                  onClick={() => toggleSeccion(seccion.id)}
                  aria-expanded={abierta}
                  data-testid={`seccion-${seccion.id}`}
                  className="flex w-full items-center justify-between px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted transition-colors hover:text-ink"
                >
                  {seccion.etiqueta}
                  {abierta ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
              )}
              {abierta && <div className="space-y-0.5">{paginas.map((p) => item(p, 2))}</div>}
            </div>
          )
        })}
      </nav>

      <div className="space-y-0.5 border-t border-line-subtle px-2 py-2">
        <Link href="/configuracion" title="Configuración" className={`nav-item ${pathname === '/configuracion' ? 'nav-item-active' : ''}`}>
          <Settings className="h-4 w-4 shrink-0" />
          {!sidebarColapsado && <span>Configuración</span>}
        </Link>
        <button type="button" onClick={toggleSidebar} className="nav-item w-full" title={sidebarColapsado ? 'Expandir' : 'Colapsar'}>
          {sidebarColapsado ? <ChevronsRight className="h-4 w-4 shrink-0" /> : <ChevronsLeft className="h-4 w-4 shrink-0" />}
          {!sidebarColapsado && <span>Colapsar</span>}
        </button>
        {/* Solo cuando hay auth real (la var se inline-a al compilar): en dev
            mock-first (AUTH_DISABLED=1, sin Supabase) el botón no aplica. */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL ? (
          <form method="post" action="/auth/signout">
            <button type="submit" className="nav-item w-full" title="Cerrar sesión">
              <LogOut className="h-4 w-4 shrink-0" />
              {!sidebarColapsado && <span>Cerrar sesión</span>}
            </button>
          </form>
        ) : null}
      </div>
    </aside>
  )
}

export function Sidebar() {
  // Suspense: el activo lee la query (useSearchParams) — requisito de build Next 16.
  return (
    <Suspense fallback={<aside data-testid="sidebar" className="w-56 shrink-0 border-r border-line bg-surface" />}>
      <SidebarContenido />
    </Suspense>
  )
}
