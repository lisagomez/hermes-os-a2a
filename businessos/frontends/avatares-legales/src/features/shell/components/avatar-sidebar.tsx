'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Scale } from 'lucide-react'
import { AVATARES } from '@/features/shell/avatares'

/**
 * Barra lateral persistente con los 4 avatares (glifo + nombre + rol del
 * buyer persona). Client component: el estado activo sale de usePathname.
 */
export function AvatarSidebar() {
  const rutaActual = usePathname()

  return (
    <aside className="flex w-64 shrink-0 flex-col border-e border-line bg-surface">
      <Link
        href="/"
        className="flex items-center gap-2.5 border-b border-line px-5 py-4"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-control bg-accent text-accent-ink">
          <Scale size={16} strokeWidth={1.75} aria-hidden />
        </span>
        <span>
          <span className="block font-display text-sm font-semibold leading-tight text-ink">
            Avatares legales
          </span>
          <span className="block font-mono text-[10px] tracking-[0.15em] text-ink-muted">
            HERMES OS · A2A
          </span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Avatares">
        {AVATARES.map((avatar) => {
          const Icono = avatar.icono
          const activo = rutaActual.startsWith(avatar.base)
          return (
            <Link
              key={avatar.id}
              href={avatar.vistas[0].href}
              aria-current={activo ? 'page' : undefined}
              className={`flex items-start gap-3 rounded-control px-3 py-2.5 transition-colors ${
                activo
                  ? 'bg-accent-muted text-accent'
                  : 'text-ink-secondary hover:bg-surface-muted hover:text-ink'
              }`}
            >
              <Icono
                size={18}
                strokeWidth={1.75}
                aria-hidden
                className="mt-0.5 shrink-0"
              />
              <span>
                <span
                  className={`block text-sm leading-tight ${
                    activo ? 'font-semibold' : 'font-medium'
                  }`}
                >
                  {avatar.nombre}
                </span>
                <span className="block text-xs leading-snug text-ink-muted">
                  {avatar.persona}
                </span>
              </span>
            </Link>
          )
        })}
      </nav>

      <p className="border-t border-line px-5 py-3 text-[11px] leading-relaxed text-ink-muted">
        Prototipo — no constituye asesoría legal.
      </p>
    </aside>
  )
}
