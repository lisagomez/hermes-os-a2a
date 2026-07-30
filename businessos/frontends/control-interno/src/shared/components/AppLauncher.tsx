'use client'
// App Launcher (waffle) del ecosistema — JSX local con la marca Titanium
// (aislar, no fundir: el DATO viene del registro vendored; el componente es
// de esta app). Solo apps internas; 4 estados de tile (contrato del registro).

import { useEffect, useRef, useState } from 'react'
import { Bot, Grip, Radar, Telescope, type LucideIcon } from 'lucide-react'
import type { AppEcosistema } from '@/shared/app-registry'
import { appsParaLauncher, resolverUrlApp } from '@/shared/app-registry'
import { APP_ID, OVERRIDES_URL } from '@/shared/nav.config'

const ICONOS: Record<string, LucideIcon> = { Radar, Bot, Telescope }

type EstadoTile = 'actual' | 'activa' | 'acceso-especial' | 'en-construccion'

function estadoTile(app: AppEcosistema, url: string): EstadoTile {
  if (app.id === APP_ID) return 'actual'
  if (!url) return 'en-construccion'
  if (app.nota) return 'acceso-especial'
  return 'activa'
}

export function AppLauncher({ compact = false }: { compact?: boolean }) {
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
        onClick={() => setAbierto((v) => !v)}
        className={compact ? 'icon-btn size-10' : 'icon-btn-ghost size-9'}
        title="Apps del ecosistema"
        aria-label="Apps del ecosistema"
        aria-expanded={abierto}
      >
        <Grip className="size-5 md:size-[16px]" />
      </button>
      {abierto && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-border-subtle bg-surface/95 p-2 shadow-depth-rest-soft backdrop-blur-xl">
          {apps.map((app) => {
            const url = resolverUrlApp(app, { overrides: OVERRIDES_URL })
            const estado = estadoTile(app, url)
            const Icono = ICONOS[app.iconoLucide ?? ''] ?? Grip
            const cuerpo = (
              <>
                <Icono className="mt-0.5 size-5 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    {app.nombre}
                    {estado === 'actual' && <span className="rounded-full bg-card-hover px-2 text-[10px] text-primary">actual</span>}
                    {estado === 'en-construccion' && <span className="rounded-full bg-card-hover px-2 text-[10px] text-muted">en construcción</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">{app.descripcion}</span>
                  {estado === 'acceso-especial' && app.nota && <span className="block text-xs text-gold">{app.nota}</span>}
                </span>
              </>
            )
            const clase = 'flex w-full items-start gap-2 rounded-lg p-2 text-left'
            if (estado === 'actual') return <div key={app.id} className={`${clase} border border-primary/40 bg-card-hover`}>{cuerpo}</div>
            if (estado === 'en-construccion') return <div key={app.id} className={`${clase} opacity-55`}>{cuerpo}</div>
            return (
              <a key={app.id} href={url} target="_self" className={`${clase} hover:bg-card-hover`}>
                {cuerpo}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
