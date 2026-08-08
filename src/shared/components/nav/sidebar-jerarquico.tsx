'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState, useSyncExternalStore } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import type { NavArbol, NavNodo } from '@/shared/app-registry'
import { rastroDe } from '@/shared/app-registry'
import { NAV_MC } from '@/shared/nav.config'

/**
 * Sidebar jerárquico de Mission Control (Sección → Página → Subpágina).
 * La vista es PURA (sin hooks: testeable como función por los specs sin
 * navegador); el wrapper lee pathname/query (Suspense por useSearchParams) y
 * persiste colapso/secciones en localStorage — sin zustand, dieta de deps
 * del panel. Glifos Unicode (la skin mission no usa lucide).
 */

const CLAVE_STORAGE = 'mission-control-nav'

export interface EstadoSidebar {
  colapsado: boolean
  seccionesCerradas: string[] // default: todo abierto (vistas clave a 1 clic)
}

export function SidebarJerarquicoView({
  arbol,
  rastro,
  estado,
  onToggleSeccion,
  onToggleColapso,
  onNavegar,
  variante = 'desktop',
}: {
  arbol: NavArbol
  rastro: NavNodo[]
  estado: EstadoSidebar
  onToggleSeccion?: (id: string) => void
  onToggleColapso?: () => void
  onNavegar?: () => void
  /** desktop: oculto bajo md (el móvil usa NavMovil como drawer). */
  variante?: 'desktop' | 'drawer'
}) {
  const activos = new Set(rastro.map((n) => n.id))
  const { colapsado } = estado

  const item = (nodo: NavNodo, nivel: 2 | 3) => {
    if (nodo.ocultoEnSidebar || !nodo.href) return null
    const activo = activos.has(nodo.id)
    const base = colapsado
      ? 'flex h-9 w-9 items-center justify-center rounded'
      : `flex items-center gap-2 rounded px-3 py-1.5 text-sm ${nivel === 3 ? 'ml-5' : ''}`
    const tinta = activo ? 'bg-surface-muted text-ink' : 'text-ink-secondary hover:bg-surface-muted hover:text-ink'
    return (
      <Link key={nodo.id} href={nodo.href} title={nodo.etiqueta} onClick={onNavegar} className={`${base} ${tinta}`} aria-current={activo ? 'page' : undefined}>
        <span className="w-4 shrink-0 text-center text-ink-muted">{nodo.glifo ?? nodo.etiqueta[0]}</span>
        {!colapsado && <span className="truncate">{nodo.etiqueta}</span>}
      </Link>
    )
  }

  // Bajo md el aside desktop NO existe (antes: 280px reales por el font-size 20px
  // dejaban ~50px de contenido y el header quedaba recortado sin scroll — #1 del
  // ataque al PR #194); el móvil navega con el drawer de NavMovil.
  const claseVariante =
    variante === 'drawer'
      ? 'flex h-full w-64 max-w-[85vw] flex-col border-r border-line bg-surface'
      : `hidden h-full shrink-0 flex-col border-r border-line bg-surface/60 transition-[width] md:flex ${colapsado ? 'w-14' : 'w-56'}`

  return (
    <aside data-testid="sidebar-mc" className={claseVariante}>
      <div className="flex items-center gap-2 px-3 py-4">
        <span className="text-lg text-success">◉</span>
        {!colapsado && (
          <span className="truncate text-sm font-bold uppercase tracking-widest text-ink-secondary">Mission Control</span>
        )}
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto px-2">
        {arbol.secciones.map((seccion) => {
          const abierta = colapsado || !estado.seccionesCerradas.includes(seccion.id)
          const hijosVisibles = (seccion.hijos ?? []).filter((h) => !h.ocultoEnSidebar)
          if (hijosVisibles.length === 0 && !seccion.href) return null
          return (
            <div key={seccion.id}>
              {!colapsado && (
                <button
                  type="button"
                  onClick={() => onToggleSeccion?.(seccion.id)}
                  className="flex w-full items-center justify-between px-3 py-1 text-xs uppercase tracking-wide text-ink-muted hover:text-ink-secondary"
                  aria-expanded={abierta}
                >
                  {seccion.etiqueta}
                  <span>{abierta ? '⌄' : '›'}</span>
                </button>
              )}
              {abierta && (
                <div className={colapsado ? 'flex flex-col items-center gap-1' : 'space-y-0.5'}>
                  {hijosVisibles.map((pagina) => (
                    <div key={pagina.id}>
                      {item(pagina, 2)}
                      {!colapsado &&
                        activos.has(pagina.id) &&
                        (pagina.hijos ?? []).filter((h) => !h.ocultoEnSidebar).map((sub) => item(sub, 3))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={() => onToggleColapso?.()}
        className="flex items-center gap-2 border-t border-line px-3 py-2 text-sm text-ink-secondary hover:text-ink"
        title={colapsado ? 'Expandir' : 'Colapsar'}
      >
        <span className="w-4 text-center">{colapsado ? '»' : '«'}</span>
        {!colapsado && <span>Colapsar</span>}
      </button>
    </aside>
  )
}

// Persistencia sin zustand: localStorage como external store (SSR-safe, sin
// setState-en-efecto — regla react-hooks de React 19). Cache por referencia
// para que getSnapshot sea estable entre renders.
const ESTADO_DEFAULT: EstadoSidebar = { colapsado: false, seccionesCerradas: [] }
let cacheCrudo: string | null = null
let cacheEstado: EstadoSidebar = ESTADO_DEFAULT

function leerEstado(): EstadoSidebar {
  let crudo: string | null = null
  try {
    crudo = window.localStorage.getItem(CLAVE_STORAGE)
  } catch {
    /* sin storage → default */
  }
  if (crudo === cacheCrudo) return cacheEstado
  cacheCrudo = crudo
  try {
    const parseado = crudo ? (JSON.parse(crudo) as Partial<EstadoSidebar> | null) : null
    // Guard de forma (#10 del ataque): un valor corrupto en localStorage no debe
    // reventar el árbol client de (main) de forma persistente.
    cacheEstado =
      parseado && typeof parseado.colapsado === 'boolean' && Array.isArray(parseado.seccionesCerradas)
        ? (parseado as EstadoSidebar)
        : ESTADO_DEFAULT
  } catch {
    cacheEstado = ESTADO_DEFAULT
  }
  return cacheEstado
}

function suscribir(notificar: () => void): () => void {
  window.addEventListener('mc-nav-cambio', notificar)
  window.addEventListener('storage', notificar)
  return () => {
    window.removeEventListener('mc-nav-cambio', notificar)
    window.removeEventListener('storage', notificar)
  }
}

function SidebarConContexto() {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const estado = useSyncExternalStore(suscribir, leerEstado, () => ESTADO_DEFAULT)

  const guardar = (siguiente: EstadoSidebar) => {
    try {
      window.localStorage.setItem(CLAVE_STORAGE, JSON.stringify(siguiente))
    } catch {
      /* sin storage no hay persistencia; el sidebar sigue funcionando */
    }
    window.dispatchEvent(new Event('mc-nav-cambio'))
  }

  return (
    <SidebarJerarquicoView
      arbol={NAV_MC}
      rastro={rastroDe(NAV_MC, pathname, search)}
      estado={estado}
      onToggleSeccion={(id) =>
        guardar({
          ...estado,
          seccionesCerradas: estado.seccionesCerradas.includes(id)
            ? estado.seccionesCerradas.filter((x) => x !== id)
            : [...estado.seccionesCerradas, id],
        })
      }
      onToggleColapso={() => guardar({ ...estado, colapsado: !estado.colapsado })}
    />
  )
}

export function SidebarJerarquico() {
  return (
    <Suspense
      fallback={<SidebarJerarquicoView arbol={NAV_MC} rastro={[]} estado={{ colapsado: false, seccionesCerradas: [] }} />}
    >
      <SidebarConContexto />
    </Suspense>
  )
}

// ─── Navegación móvil (drawer + hamburguesa, solo <md) ─────────────────────

function NavMovilConContexto() {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    if (!abierto) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [abierto])

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title="Abrir navegación"
        aria-label="Abrir navegación"
        data-testid="nav-movil"
        className="rounded px-2 py-1 text-lg leading-none text-ink-secondary hover:bg-surface-muted hover:text-ink"
      >
        ☰
      </button>
      {abierto && (
        <div className="fixed inset-0 z-50 flex">
          <div className="h-full" onClick={(e) => e.stopPropagation()}>
            <SidebarJerarquicoView
              arbol={NAV_MC}
              rastro={rastroDe(NAV_MC, pathname, search)}
              estado={{ colapsado: false, seccionesCerradas: [] }}
              variante="drawer"
              onNavegar={() => setAbierto(false)}
            />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setAbierto(false)} />
        </div>
      )}
    </div>
  )
}

export function NavMovil() {
  return (
    <Suspense fallback={null}>
      <NavMovilConContexto />
    </Suspense>
  )
}
