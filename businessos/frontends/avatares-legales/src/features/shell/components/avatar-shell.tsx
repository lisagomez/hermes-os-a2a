import type { ReactNode } from 'react'
import { AvatarSidebar } from './avatar-sidebar'
import { DataSourceBadge } from './data-source-badge'

/**
 * Cascarón de la app: barra lateral persistente + barra superior con la
 * insignia de procedencia de datos + área de contenido. Server component;
 * la interactividad vive en la barra lateral (client).
 */
export function AvatarShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AvatarSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end border-b border-line bg-surface px-6 py-2.5">
          <DataSourceBadge />
        </header>
        <main className="min-w-0 flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  )
}
