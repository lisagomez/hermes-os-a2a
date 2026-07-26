'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpenCheck,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  Home,
  LayoutGrid,
  MessagesSquare,
  Radar,
  Settings,
} from 'lucide-react'
import { useUiStore } from '@/shared/stores/ui-store'

const NAV = [
  { href: '/', etiqueta: 'Inicio', Icono: Home, exacto: true },
  { href: '/reuniones', etiqueta: 'Reuniones', Icono: CalendarDays, exacto: false },
  { href: '/reuniones?vista=conversaciones', etiqueta: 'Conversaciones', Icono: MessagesSquare, exacto: true },
  { href: '/herramientas', etiqueta: 'Herramientas', Icono: LayoutGrid, exacto: true },
  { href: '/playbooks', etiqueta: 'Playbooks', Icono: BookOpenCheck, exacto: false },
  { href: '/manager', etiqueta: 'Manager', Icono: ClipboardCheck, exacto: false },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarColapsado, toggleSidebar } = useUiStore()

  const activo = (href: string, exacto: boolean) => {
    const base = href.split('?')[0]
    if (exacto) return pathname === base
    return pathname === base || pathname.startsWith(`${base}/`)
  }

  return (
    <aside
      data-testid="sidebar"
      className={`flex shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-150 ${
        sidebarColapsado ? 'w-[3.6rem]' : 'w-56'
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-ink">
          <Radar className="h-4 w-4" />
        </span>
        {!sidebarColapsado && (
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight text-ink">Meeting Copilot</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">Mission Control</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 px-2">
        {NAV.map(({ href, etiqueta, Icono, exacto }) => (
          <Link
            key={href}
            href={href}
            title={etiqueta}
            className={`nav-item ${activo(href, exacto) ? 'nav-item-active' : ''}`}
          >
            <Icono className="h-4 w-4 shrink-0" />
            {!sidebarColapsado && <span className="truncate">{etiqueta}</span>}
          </Link>
        ))}
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
      </div>
    </aside>
  )
}
