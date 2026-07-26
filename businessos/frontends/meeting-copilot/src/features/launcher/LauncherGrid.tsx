'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import * as iconos from 'lucide-react'
import { Pin, Search, type LucideIcon } from 'lucide-react'
import { CATALOGO_HERRAMIENTAS, ETIQUETA_CATEGORIA_HERRAMIENTA } from './catalogo'
import { resolverRutaHerramienta } from './rutas'
import { useUiStore } from '@/shared/stores/ui-store'
import { useAppStore } from '@/features/domain/store'
import { Chip } from '@/shared/components/ui'
import type { Herramienta } from '@/features/domain/types'

// Mapa estático (referencias estables): la tarjeta solo hace un property-access.
const MAPA_ICONOS = iconos as unknown as Record<string, LucideIcon>

function TarjetaHerramienta({ h, compacta = false }: { h: Herramienta; compacta?: boolean }) {
  const { pinned, togglePin, registrarUso, setLauncher } = useUiStore()
  const ultimaAnalizada = useAppStore((s) => s.ultimaReunionAnalizada)
  const Icono = MAPA_ICONOS[h.icono] ?? iconos.Wrench
  const fijada = pinned.includes(h.slug)
  const deshabilitada = h.estado === 'soon'
  const ruta = resolverRutaHerramienta(h.ruta, ultimaAnalizada)

  const cuerpo = (
    <div
      className={`card group relative flex h-full flex-col gap-2 p-3 transition-shadow ${
        deshabilitada ? 'opacity-55' : 'hover:shadow-[var(--shadow-2)]'
      }`}
      data-testid={`herramienta-${h.slug}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-muted text-accent">
          <Icono className="h-4 w-4" />
        </span>
        <button
          type="button"
          title={fijada ? 'Quitar de fijadas' : 'Fijar'}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            togglePin(h.slug)
          }}
          className={`rounded p-1 transition-colors ${fijada ? 'text-accent' : 'text-ink-muted opacity-0 hover:text-ink group-hover:opacity-100'}`}
          data-testid={`pin-${h.slug}`}
        >
          <Pin className={`h-3.5 w-3.5 ${fijada ? 'fill-current' : ''}`} />
        </button>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink">{h.nombre}</p>
        {!compacta && <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-ink-secondary">{h.descripcion}</p>}
      </div>
      <div className="mt-auto flex items-center gap-1.5">
        <Chip>{ETIQUETA_CATEGORIA_HERRAMIENTA[h.categoria]}</Chip>
        {h.estado === 'beta' && <Chip tono="info">beta</Chip>}
        {h.estado === 'soon' && <Chip tono="warning">próximamente</Chip>}
      </div>
    </div>
  )

  if (deshabilitada) {
    return <div title="Disponible próximamente">{cuerpo}</div>
  }
  return (
    <Link
      href={ruta}
      onClick={() => {
        registrarUso(h.slug)
        setLauncher(false)
      }}
    >
      {cuerpo}
    </Link>
  )
}

export function LauncherGrid({ compacto = false }: { compacto?: boolean }) {
  const [consulta, setConsulta] = useState('')
  const { pinned, recientes } = useUiStore()

  const filtradas = useMemo(() => {
    const q = consulta.trim().toLowerCase()
    if (!q) return CATALOGO_HERRAMIENTAS
    return CATALOGO_HERRAMIENTAS.filter((h) => `${h.nombre} ${h.descripcion} ${h.categoria}`.toLowerCase().includes(q))
  }, [consulta])

  const fijadas = filtradas.filter((h) => pinned.includes(h.slug))
  const slugsRecientes = recientes.map((r) => r.slug)
  const recientesVisibles = filtradas.filter((h) => slugsRecientes.includes(h.slug) && !pinned.includes(h.slug))
  const cols = compacto ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
        <input
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Buscar herramientas…"
          className="input pl-8"
          data-testid="buscar-herramientas"
        />
      </div>

      {consulta.trim() === '' && fijadas.length > 0 && (
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Fijadas</h3>
          <div className={`grid gap-2.5 ${cols}`}>
            {fijadas.map((h) => (
              <TarjetaHerramienta key={h.slug} h={h} compacta={compacto} />
            ))}
          </div>
        </section>
      )}

      {consulta.trim() === '' && recientesVisibles.length > 0 && (
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Recientes</h3>
          <div className={`grid gap-2.5 ${cols}`}>
            {recientesVisibles.map((h) => (
              <TarjetaHerramienta key={h.slug} h={h} compacta={compacto} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          {consulta.trim() === '' ? 'Todas las herramientas' : `Resultados (${filtradas.length})`}
        </h3>
        {filtradas.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-ink-secondary">
            Ninguna herramienta coincide con “{consulta}”.
          </p>
        ) : (
          <div className={`grid gap-2.5 ${cols}`}>
            {filtradas.map((h) => (
              <TarjetaHerramienta key={h.slug} h={h} compacta={compacto} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
