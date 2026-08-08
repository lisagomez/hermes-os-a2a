'use client'

import { useEffect, useRef, useState } from 'react'
import type { AppEcosistema } from '@/shared/app-registry'
import { appsParaLauncher, resolverUrlApp } from '@/shared/app-registry'
import { APP_ID, OVERRIDES_URL } from '@/shared/nav.config'

/**
 * App Launcher (waffle) de Mission Control: primer puente cross-app del
 * ecosistema. Solo lista apps INTERNAS; el JSX es local (tokens de la skin
 * mission, glifos — sin lucide). La vista y el clasificador de estados son
 * puros (testeables sin navegador).
 */

export type EstadoTile = 'actual' | 'activa' | 'acceso-especial' | 'en-construccion'

/** Clasificador PURO de estados de tile (contrato compartido con las otras apps). */
export function estadoTile(app: AppEcosistema, appActualId: string, url: string): EstadoTile {
  if (app.id === appActualId) return 'actual'
  if (!url) return 'en-construccion'
  if (app.nota) return 'acceso-especial'
  return 'activa'
}

export function AppLauncherView({
  apps,
  appActualId,
  urls,
  abierto,
  onToggle,
}: {
  apps: AppEcosistema[]
  appActualId: string
  urls: Record<string, string>
  abierto: boolean
  onToggle?: () => void
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onToggle?.()}
        title="Apps del ecosistema"
        aria-expanded={abierto}
        data-testid="waffle"
        className="rounded px-2 py-1 text-lg leading-none text-ink-secondary hover:bg-surface-muted hover:text-ink"
      >
        ⠿
      </button>
      {abierto && (
        <div
          data-testid="launcher-apps"
          className="absolute left-0 top-full z-50 mt-2 w-72 rounded-lg border border-line bg-surface p-2 shadow-xl"
        >
          {apps.map((app) => {
            const url = urls[app.id] ?? ''
            const estado = estadoTile(app, appActualId, url)
            const cuerpo = (
              <>
                <span className="mt-0.5 w-6 shrink-0 text-center text-lg text-success">{app.glifo}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    {app.nombre}
                    {estado === 'actual' && <span className="rounded-full bg-success-muted px-2 text-xs text-success">actual</span>}
                    {estado === 'en-construccion' && <span className="rounded-full bg-warning-muted px-2 text-xs text-warning">en construcción</span>}
                  </span>
                  <span className="block truncate text-xs text-ink-secondary">{app.descripcion}</span>
                  {app.nota && estado !== 'actual' && <span className="block text-xs text-warning">{app.nota}</span>}
                  {estado === 'en-construccion' && app.docUrl && (
                    <span className="block text-xs text-ink-muted">saber más: {app.docUrl}</span>
                  )}
                </span>
              </>
            )
            const clase = 'flex w-full items-start gap-2 rounded p-2 text-left'
            if (estado === 'actual') {
              return (
                <div key={app.id} className={`${clase} border border-success-muted bg-surface-muted/60`} data-testid={`tile-${app.id}`}>
                  {cuerpo}
                </div>
              )
            }
            if (estado === 'en-construccion') {
              return (
                <div key={app.id} className={`${clase} opacity-55`} data-testid={`tile-${app.id}`}>
                  {cuerpo}
                </div>
              )
            }
            return (
              <a key={app.id} href={url} target="_self" className={`${clase} hover:bg-surface-muted`} data-testid={`tile-${app.id}`}>
                {cuerpo}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AppLauncher() {
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
  // produccion explícito (#7 del ataque): en localhost el waffle apunta a los
  // dev defaults, no a producción con la sesión real.
  const urls = Object.fromEntries(
    apps.map((a) => [a.id, resolverUrlApp(a, { overrides: OVERRIDES_URL, produccion: process.env.NODE_ENV === 'production' })])
  )

  return (
    <div ref={ref}>
      <AppLauncherView apps={apps} appActualId={APP_ID} urls={urls} abierto={abierto} onToggle={() => setAbierto((v) => !v)} />
    </div>
  )
}
