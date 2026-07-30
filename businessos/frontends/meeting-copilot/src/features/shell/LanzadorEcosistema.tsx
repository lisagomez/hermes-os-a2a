'use client'

// Waffle CROSS-app del ecosistema (distinto del LauncherPopover intra-app de
// herramientas: conviven). El DATO viene del registro vendored; el JSX es
// local con los tokens del copilot (tema dual). 4 estados de tile (contrato).

import { useEffect, useRef, useState } from 'react'
import { Bot, Grip, Radar, Telescope, type LucideIcon } from 'lucide-react'
import { Chip } from '@/shared/components/ui'
import type { AppEcosistema } from '@/shared/app-registry'
import { appsParaLauncher, resolverUrlApp } from '@/shared/app-registry'
import { APP_ID, OVERRIDES_URL } from './nav.config'

const ICONOS: Record<string, LucideIcon> = { Radar, Bot, Telescope }

type EstadoTile = 'actual' | 'activa' | 'acceso-especial' | 'en-construccion'

function estadoTile(app: AppEcosistema, url: string): EstadoTile {
  if (app.id === APP_ID) return 'actual'
  if (!url) return 'en-construccion'
  if (app.nota) return 'acceso-especial'
  return 'activa'
}

export function LanzadorEcosistema() {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false)
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [abierto])

  const apps = appsParaLauncher()

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        title="Apps del ecosistema"
        aria-expanded={abierto}
        data-testid="waffle-ecosistema"
        className="rounded-s border border-line bg-surface p-2 text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <Grip className="h-4 w-4" />
      </button>
      {abierto && (
        <div
          data-testid="lanzador-ecosistema"
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-m border border-line bg-surface-raised p-2 shadow-[var(--shadow-2)]"
        >
          {apps.map((app) => {
            const url = resolverUrlApp(app, { overrides: OVERRIDES_URL })
            const estado = estadoTile(app, url)
            const Icono = ICONOS[app.iconoLucide ?? ''] ?? Grip
            const cuerpo = (
              <>
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-s bg-accent-muted text-accent">
                  <Icono className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    {app.nombre}
                    {estado === 'actual' && <Chip tono="accent">actual</Chip>}
                    {estado === 'en-construccion' && <Chip tono="warning">en construcción</Chip>}
                  </span>
                  <span className="block truncate text-[11px] text-ink-secondary">{app.descripcion}</span>
                  {estado === 'acceso-especial' && app.nota && <span className="block text-[11px] text-warning">{app.nota}</span>}
                </span>
              </>
            )
            const clase = 'flex w-full items-start gap-2 rounded-s p-2 text-left'
            if (estado === 'actual') {
              return (
                <div key={app.id} className={`${clase} border border-accent bg-accent-muted/40`} data-testid={`app-${app.id}`}>
                  {cuerpo}
                </div>
              )
            }
            if (estado === 'en-construccion') {
              return (
                <div key={app.id} className={`${clase} opacity-55`} data-testid={`app-${app.id}`}>
                  {cuerpo}
                </div>
              )
            }
            return (
              <a key={app.id} href={url} target="_self" className={`${clase} transition-colors hover:bg-surface-muted`} data-testid={`app-${app.id}`}>
                {cuerpo}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
