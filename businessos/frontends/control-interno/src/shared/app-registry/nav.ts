// VENDORED-FROM businessos/frontends/app-registry/src/nav.ts (v2, c1bb9bf2fea4)
// NO editar aquí: editar el canónico y correr node scripts/sync-vendored.mjs
// @a2a/app-registry — SCHEMA del árbol de navegación jerárquica (Sección →
// Página → Subpágina, máx 3 niveles) + funciones PURAS compartidas: activo,
// breadcrumb, aplanado e invariantes. Cada app define SU árbol en su propio
// nav.config.ts (config, no JSX) y pinta con sus tokens locales.

export interface NavNodo {
  /** Único en todo el árbol (lo verifica validarArbol). */
  id: string
  etiqueta: string
  /** Navegable; admite query ('/desarrollo?departamento=adquisicion'). Las secciones puras van sin href. */
  href?: string
  /** Rutas dinámicas ('/asesores/:id/agenda'): matchea activo y breadcrumb. */
  patron?: string
  /** true = pathname === base (default: prefijo con separador). */
  exacto?: boolean
  glifo?: string
  iconoLucide?: string
  /** Clave que la app cruza con SU RBAC (solo control-interno la usa hoy). */
  permisoRuta?: string
  /** Subpáginas contextuales: no se pintan en el sidebar, solo en el breadcrumb. */
  ocultoEnSidebar?: boolean
  hijos?: NavNodo[]
}

export interface NavArbol {
  appId: string
  secciones: NavNodo[]
}

export const PROFUNDIDAD_MAX = 3

function pares(search: string | undefined): Record<string, string> {
  const params = new URLSearchParams(search ?? '')
  const out: Record<string, string> = {}
  params.forEach((v, k) => {
    out[k] = v
  })
  return out
}

function matchPatron(patron: string, pathname: string): boolean {
  const p = patron.split('/').filter(Boolean)
  const r = pathname.split('/').filter(Boolean)
  if (p.length !== r.length) return false
  return p.every((seg, i) => seg.startsWith(':') || seg === r[i])
}

/** ¿El nodo (href/patron) está activo para pathname(+search)? Un href con query
 *  exige que ESOS pares coincidan en search; un patron matchea por segmentos. */
export function esRutaActiva(
  href: string,
  pathname: string,
  opciones: { exacto?: boolean; search?: string; patron?: string } = {}
): boolean {
  if (opciones.patron) return matchPatron(opciones.patron, pathname)
  const [base, queryHref] = href.split('?')
  const baseOk = opciones.exacto ? pathname === base : pathname === base || pathname.startsWith(base + '/')
  if (!baseOk) return false
  if (!queryHref) return true
  const actuales = pares(opciones.search)
  return Object.entries(pares(queryHref)).every(([k, v]) => actuales[k] === v)
}

interface Candidato {
  rastro: NavNodo[]
  puntos: number
}

function puntuar(nodo: NavNodo, pathname: string, search: string | undefined): number | null {
  if (nodo.patron) return matchPatron(nodo.patron, pathname) ? 5 : null
  if (!nodo.href) return null
  if (!esRutaActiva(nodo.href, pathname, { exacto: nodo.exacto, search })) return null
  const query = nodo.href.split('?')[1]
  // Desempate entre hermanos con misma base: más pares de query = más específico;
  // el sin-query solo gana si ningún con-query matchea (aquí: puntúa menos).
  const nQuery = query ? Array.from(new URLSearchParams(query).keys()).length : 0
  return nQuery * 10 + (nodo.exacto ? 1 : 0)
}

/** Rama activa MÁS PROFUNDA (y más específica a igual profundidad) → breadcrumb.
 *  Devuelve los nodos desde la sección hasta el nodo activo; [] si nada matchea. */
export function rastroDe(arbol: NavArbol, pathname: string, search?: string): NavNodo[] {
  const candidatos: Candidato[] = []
  const visitar = (nodo: NavNodo, ancestros: NavNodo[]) => {
    const rastro = [...ancestros, nodo]
    const p = puntuar(nodo, pathname, search)
    if (p !== null) candidatos.push({ rastro, puntos: rastro.length * 100 + p })
    for (const hijo of nodo.hijos ?? []) visitar(hijo, rastro)
  }
  for (const seccion of arbol.secciones) visitar(seccion, [])
  if (candidatos.length === 0) return []
  candidatos.sort((a, b) => b.puntos - a.puntos)
  return candidatos[0].rastro
}

export interface NodoAplanado {
  nodo: NavNodo
  nivel: 1 | 2 | 3
  rastro: NavNodo[]
}

/** Índice plano del árbol (⌘K, tests). */
export function aplanarNav(arbol: NavArbol): NodoAplanado[] {
  const out: NodoAplanado[] = []
  const visitar = (nodo: NavNodo, ancestros: NavNodo[]) => {
    const rastro = [...ancestros, nodo]
    out.push({ nodo, nivel: rastro.length as 1 | 2 | 3, rastro })
    for (const hijo of nodo.hijos ?? []) visitar(hijo, rastro)
  }
  for (const seccion of arbol.secciones) visitar(seccion, [])
  return out
}

/** Invariantes del árbol: ids únicos, profundidad ≤3, todo nodo navegable o con
 *  hijos. Devuelve la lista de errores; [] = válido. Cada app lo corre en SUS tests. */
export function validarArbol(arbol: NavArbol): string[] {
  const errores: string[] = []
  const ids = new Set<string>()
  const visitar = (nodo: NavNodo, nivel: number) => {
    if (ids.has(nodo.id)) errores.push(`id duplicado: ${nodo.id}`)
    ids.add(nodo.id)
    if (nivel > PROFUNDIDAD_MAX) errores.push(`${nodo.id}: profundidad ${nivel} > ${PROFUNDIDAD_MAX}`)
    if (!nodo.href && !nodo.patron && (!nodo.hijos || nodo.hijos.length === 0)) {
      errores.push(`${nodo.id}: sin href, sin patron y sin hijos (nodo muerto)`)
    }
    for (const hijo of nodo.hijos ?? []) visitar(hijo, nivel + 1)
  }
  for (const seccion of arbol.secciones) visitar(seccion, 1)
  return errores
}
