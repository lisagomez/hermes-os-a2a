'use client'

// Breadcrumb DERIVADO del árbol (rastroDe): vive en la Topbar. Las páginas de
// detalle (patron con :id) muestran su etiqueta estática; el nombre de la
// entidad es responsabilidad de la página.

import Link from 'next/link'
import { Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
// Submódulo /nav, no el barrel: no arrastrar apps.ts al bundle público (/reservar).
import { rastroDe } from '@/shared/app-registry/nav'
import { NAV_COPILOT } from './nav.config'

function BreadcrumbContenido() {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const rastro = rastroDe(NAV_COPILOT, pathname, search)
  if (rastro.length === 0) return null
  return (
    <nav aria-label="Breadcrumb" data-testid="breadcrumb" className="hidden min-w-0 items-center gap-1 lg:flex">
      {rastro.map((nodo, i) => {
        const ultimo = i === rastro.length - 1
        return (
          <span key={nodo.id} className="flex min-w-0 items-center gap-1 text-[12px]">
            {i > 0 && <ChevronRight className="h-3 w-3 text-ink-muted" />}
            {ultimo || !nodo.href ? (
              <span className={`truncate ${ultimo ? 'font-semibold text-ink' : 'text-ink-secondary'}`}>{nodo.etiqueta}</span>
            ) : (
              <Link href={nodo.href} className="truncate text-ink-secondary transition-colors hover:text-ink">
                {nodo.etiqueta}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}

export function Breadcrumb() {
  return (
    <Suspense fallback={null}>
      <BreadcrumbContenido />
    </Suspense>
  )
}
