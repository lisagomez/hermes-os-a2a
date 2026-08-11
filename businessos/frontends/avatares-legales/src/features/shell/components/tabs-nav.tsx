'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { VistaAvatar } from '@/features/shell/avatares'

/**
 * Barra de pestañas de un segmento de avatar. Cada vista es una sub-ruta con
 * URL propia (compartible en demo). Client component por usePathname.
 */
export function TabsNav({ vistas }: { vistas: VistaAvatar[] }) {
  const rutaActual = usePathname()

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-line"
      aria-label="Vistas del avatar"
    >
      {vistas.map((vista) => {
        const activa = rutaActual.startsWith(vista.href)
        return (
          <Link
            key={vista.href}
            href={vista.href}
            aria-current={activa ? 'page' : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm transition-colors ${
              activa
                ? 'border-accent font-semibold text-accent'
                : 'border-transparent font-medium text-ink-secondary hover:border-line-strong hover:text-ink'
            }`}
          >
            {vista.etiqueta}
          </Link>
        )
      })}
    </nav>
  )
}
