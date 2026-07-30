'use client'
// Breadcrumb DERIVADO del árbol (rastroDe de src/shared/app-registry). Barra
// delgada solo-desktop montada por DashboardShell; en drawFullscreen no existe.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { rastroDe } from '@/shared/app-registry'
import { NAV_CI } from '@/shared/nav.config'

export function Breadcrumb() {
  const pathname = usePathname()
  const rastro = rastroDe(NAV_CI, pathname ?? '/')
  if (rastro.length === 0) return null
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex h-8 shrink-0 items-center gap-1 border-b border-border-subtle bg-surface/80 px-4 text-xs"
    >
      {rastro.map((nodo, i) => {
        const ultimo = i === rastro.length - 1
        return (
          <span key={nodo.id} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="size-3 text-muted" />}
            {ultimo || !nodo.href ? (
              <span className={`truncate ${ultimo ? 'font-semibold text-foreground' : 'text-muted'}`}>{nodo.etiqueta}</span>
            ) : (
              <Link href={nodo.href} className="truncate text-muted hover:text-foreground">
                {nodo.etiqueta}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
