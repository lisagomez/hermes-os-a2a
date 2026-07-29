'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandBar } from './CommandBar'
import { LauncherPopover } from '@/features/launcher/LauncherPopover'
import { esRutaSinShell } from './rutas-sin-shell'

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // Pantalla completa (sin sidebar/topbar/launcher): /login y la superficie
  // pública /reservar — ver rutas-sin-shell.ts.
  if (esRutaSinShell(pathname)) return <>{children}</>

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
      <CommandBar />
      <LauncherPopover />
    </div>
  )
}
