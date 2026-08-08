import { test, expect } from '@playwright/test'
import {
  aplanarNav,
  appsParaLauncher,
  esRutaActiva,
  rastroDe,
  resolverUrlApp,
  validarArbol,
} from '../src/shared/app-registry'
import { NAV_MC } from '../src/shared/nav.config'
import { SidebarJerarquicoView } from '../src/shared/components/nav/sidebar-jerarquico'
import { AppLauncherView, estadoTile } from '../src/shared/components/nav/app-launcher'
import { BreadcrumbView } from '../src/shared/components/nav/breadcrumb'

/**
 * Navegación jerárquica + App Launcher, sin navegador: funciones puras del
 * registro vendored y vistas puras invocadas con props (patrón de la casa).
 */

function render(node: unknown): string {
  const parts: string[] = []
  const walk = (n: unknown): void => {
    if (n == null || typeof n === 'boolean') return
    if (typeof n === 'string') { parts.push(n); return }
    if (typeof n === 'number') { parts.push(String(n)); return }
    if (Array.isArray(n)) { n.forEach(walk); return }
    if (typeof n === 'object' && n !== null && '__pw_type' in n) {
      const el = n as unknown as { type: unknown; props?: Record<string, unknown> }
      const props = el.props ?? {}
      if (typeof el.type === 'function') { walk((el.type as (p: typeof props) => unknown)(props)); return }
      walk(props.children)
    }
  }
  walk(node)
  return parts.join('')
}

test('el árbol de Mission Control cumple los invariantes (ids únicos, ≤3 niveles, sin nodos muertos)', () => {
  expect(validarArbol(NAV_MC)).toEqual([])
  // 3 secciones, 6 páginas navegables de primer clic + 2 subpáginas de nivel 3
  // (Adquisición › Tareas y Grafo › Explorador)
  const planos = aplanarNav(NAV_MC)
  expect(planos.filter((p) => p.nivel === 1)).toHaveLength(3)
  expect(planos.filter((p) => p.nivel === 3)).toHaveLength(2)
})

test('esRutaActiva: exacto, prefijo y query como contrato', () => {
  expect(esRutaActiva('/dashboard', '/dashboard', { exacto: true })).toBe(true)
  expect(esRutaActiva('/dashboard', '/dashboard/x', { exacto: true })).toBe(false)
  expect(esRutaActiva('/grafo', '/grafo/detalle')).toBe(true)
  expect(esRutaActiva('/grafo', '/grafologia')).toBe(false) // frontera de prefijo
  expect(esRutaActiva('/desarrollo?departamento=adquisicion', '/desarrollo', { search: 'departamento=adquisicion' })).toBe(true)
  expect(esRutaActiva('/desarrollo?departamento=adquisicion', '/desarrollo', { search: 'departamento=software' })).toBe(false)
  expect(esRutaActiva('', '/asesores/a-1/agenda', { patron: '/asesores/:id/agenda' })).toBe(true)
  expect(esRutaActiva('', '/asesores/a-1', { patron: '/asesores/:id/agenda' })).toBe(false)
})

test('rastroDe: breadcrumbs de las rutas del panel (incluido el desempate por query)', () => {
  const ruta = (pathname: string, search?: string) =>
    rastroDe(NAV_MC, pathname, search).map((n) => n.etiqueta)

  expect(ruta('/dashboard')).toEqual(['Panorama', 'Pantheon'])
  expect(ruta('/ai-spend')).toEqual(['Panorama', 'AI Spend'])
  // CRM movido a meeting-copilot (2026-08-08): /crm ya no está en el árbol
  expect(ruta('/crm')).toEqual([])
  expect(ruta('/contratos')).toEqual(['Legal', 'Contratos SC'])
  // Desempate: con ?departamento=adquisicion gana la rama Adquisición › Tareas…
  expect(ruta('/desarrollo', 'departamento=adquisicion')).toEqual(['Ejecución', 'Adquisición', 'Tareas'])
  // …sin query (o con otro departamento) gana Desarrollo a secas.
  expect(ruta('/desarrollo')).toEqual(['Ejecución', 'Desarrollo'])
  expect(ruta('/desarrollo', 'departamento=procesos')).toEqual(['Ejecución', 'Desarrollo'])
  expect(ruta('/login')).toEqual([])
})

test('SidebarJerarquicoView pinta secciones, marca la rama activa y colapsa a riel', () => {
  const rastro = rastroDe(NAV_MC, '/desarrollo', 'departamento=adquisicion')
  const abierto = render(
    SidebarJerarquicoView({ arbol: NAV_MC, rastro, estado: { colapsado: false, seccionesCerradas: [] } })
  )
  // CRM movido a meeting-copilot (2026-08-08): ya no es etiqueta del sidebar
  for (const etiqueta of ['Mission Control', 'Panorama', 'Pantheon', 'AI Spend', 'Grafo', 'Ejecución', 'Adquisición', 'Legal', 'Contratos SC']) {
    expect(abierto).toContain(etiqueta)
  }
  // Subpáginas solo bajo la rama activa: Tareas visible (rama Adquisición activa)
  expect(abierto).toContain('Tareas')
  // CRM ya NO vive en este árbol (movido a meeting-copilot 2026-08-08):
  // la regresión #2 del ataque (visibilidad a 1 clic) ahora aplica en el copiloto.
  const desdeDashboard = render(
    SidebarJerarquicoView({ arbol: NAV_MC, rastro: rastroDe(NAV_MC, '/dashboard'), estado: { colapsado: false, seccionesCerradas: [] } })
  )
  expect(desdeDashboard).not.toContain('CRM')

  // Una sección cerrada esconde sus páginas
  const cerrado = render(
    SidebarJerarquicoView({ arbol: NAV_MC, rastro: [], estado: { colapsado: false, seccionesCerradas: ['panorama'] } })
  )
  expect(cerrado).not.toContain('Pantheon')
  expect(cerrado).toContain('Desarrollo')

  // Colapsado: riel sin etiquetas (glifos), sin encabezados de sección
  const riel = render(
    SidebarJerarquicoView({ arbol: NAV_MC, rastro: [], estado: { colapsado: true, seccionesCerradas: [] } })
  )
  expect(riel).not.toContain('Panorama')
  expect(riel).not.toContain('Pantheon')
  expect(riel).toContain('✦') // glifo de Pantheon sigue navegable
})

test('BreadcrumbView deriva del rastro y no pinta nada fuera del árbol', () => {
  expect(render(BreadcrumbView({ rastro: rastroDe(NAV_MC, '/desarrollo', 'departamento=adquisicion') }))).toContain('Adquisición')
  expect(render(BreadcrumbView({ rastro: [] }))).toBe('')
})

test('App Launcher: solo internas, estados de tile y URLs con override', () => {
  const apps = appsParaLauncher()
  expect(apps.map((a) => a.id)).toEqual(['mission-control', 'control-interno', 'meeting-copilot'])
  // Clasificador de estados (contrato de los 4 estados)
  const mc = apps.find((a) => a.id === 'mission-control')!
  const ci = apps.find((a) => a.id === 'control-interno')!
  expect(estadoTile(mc, 'mission-control', mc.urlProd)).toBe('actual')
  // v2: control-interno sin urlProd (127.0.0.1 era una URL imposible en prod)
  expect(estadoTile(ci, 'mission-control', ci.urlProd)).toBe('en-construccion')
  expect(estadoTile(ci, 'mission-control', 'https://ci.ejemplo.mx')).toBe('acceso-especial') // con override, la nota se conserva
  // resolverUrlApp: override gana; sin override, prod
  expect(resolverUrlApp(ci, { overrides: { 'control-interno': 'https://ci.ejemplo.mx' } })).toBe('https://ci.ejemplo.mx')
  expect(resolverUrlApp(mc, {})).toBe(mc.urlProd)

  const urls = Object.fromEntries(apps.map((a) => [a.id, resolverUrlApp(a, {})]))
  const html = render(AppLauncherView({ apps, appActualId: 'mission-control', urls, abierto: true }))
  expect(html).toContain('Meeting Copilot')
  expect(html).toContain('vía túnel SSH')
  expect(html).toContain('actual') // la app propia resaltada
})
