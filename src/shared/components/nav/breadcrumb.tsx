'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import type { NavNodo } from '@/shared/app-registry'
import { rastroDe } from '@/shared/app-registry'
import { NAV_MC } from '@/shared/nav.config'

/** Breadcrumb DERIVADO del árbol (rastroDe) — vista pura + wrapper con hooks. */

export function BreadcrumbView({ rastro }: { rastro: NavNodo[] }) {
  if (rastro.length === 0) return null
  return (
    <nav aria-label="Breadcrumb" data-testid="breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      {rastro.map((nodo, i) => {
        const ultimo = i === rastro.length - 1
        return (
          <span key={nodo.id} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <span className="text-ink-muted">›</span>}
            {ultimo || !nodo.href ? (
              <span className={`truncate ${ultimo ? 'font-semibold text-ink' : 'text-ink-secondary'}`}>{nodo.etiqueta}</span>
            ) : (
              <Link href={nodo.href} className="truncate text-ink-secondary hover:text-ink">
                {nodo.etiqueta}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}

function BreadcrumbConContexto() {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  return <BreadcrumbView rastro={rastroDe(NAV_MC, pathname, search)} />
}

export function Breadcrumb() {
  return (
    <Suspense fallback={null}>
      <BreadcrumbConContexto />
    </Suspense>
  )
}
