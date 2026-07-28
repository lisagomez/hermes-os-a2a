'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandBar } from './CommandBar'
import { LauncherPopover } from '@/features/launcher/LauncherPopover'

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // /login es pública y de pantalla completa: sin sidebar/topbar/launcher.
  if (pathname === '/login') return <>{children}</>

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
