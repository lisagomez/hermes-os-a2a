'use client'

import Link from 'next/link'
import { Suspense, useSyncExternalStore } from 'react'
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
}: {
  arbol: NavArbol
  rastro: NavNodo[]
  estado: EstadoSidebar
  onToggleSeccion?: (id: string) => void
  onToggleColapso?: () => void
}) {
  const activos = new Set(rastro.map((n) => n.id))
  const { colapsado } = estado

  const item = (nodo: NavNodo, nivel: 2 | 3) => {
    if (nodo.ocultoEnSidebar || !nodo.href) return null
    const activo = activos.has(nodo.id)
    const base = colapsado
      ? 'flex h-9 w-9 items-center justify-center rounded'
      : `flex items-center gap-2 rounded px-3 py-1.5 text-sm ${nivel === 3 ? 'ml-5' : ''}`
    const tinta = activo ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    return (
      <Link key={nodo.id} href={nodo.href} title={nodo.etiqueta} className={`${base} ${tinta}`} aria-current={activo ? 'page' : undefined}>
        <span className="w-4 shrink-0 text-center text-slate-500">{nodo.glifo ?? nodo.etiqueta[0]}</span>
        {!colapsado && <span className="truncate">{nodo.etiqueta}</span>}
      </Link>
    )
  }

  return (
    <aside
      data-testid="sidebar-mc"
      className={`flex h-full shrink-0 flex-col border-r border-slate-800 bg-slate-900/60 transition-[width] ${colapsado ? 'w-14' : 'w-56'}`}
    >
      <div className="flex items-center gap-2 px-3 py-4">
        <span className="text-lg text-emerald-500">◉</span>
        {!colapsado && (
          <span className="truncate text-sm font-bold uppercase tracking-widest text-slate-400">Mission Control</span>
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
                  className="flex w-full items-center justify-between px-3 py-1 text-xs uppercase tracking-wide text-slate-500 hover:text-slate-300"
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
        className="flex items-center gap-2 border-t border-slate-800 px-3 py-2 text-sm text-slate-400 hover:text-white"
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
    cacheEstado = crudo ? (JSON.parse(crudo) as EstadoSidebar) : ESTADO_DEFAULT
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
