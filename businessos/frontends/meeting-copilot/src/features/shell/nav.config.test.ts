// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { aplanarNav, appsParaLauncher, rastroDe, validarArbol } from '@/shared/app-registry'
import { NAV_COPILOT } from './nav.config'

describe('árbol de navegación del copilot', () => {
  it('cumple los invariantes (ids únicos, ≤3 niveles, sin nodos muertos)', () => {
    expect(validarArbol(NAV_COPILOT)).toEqual([])
  })

  const ruta = (pathname: string, search?: string) => rastroDe(NAV_COPILOT, pathname, search).map((n) => n.etiqueta)

  it('desambigua Reuniones vs Conversaciones por query (el matcher viejo la ignoraba)', () => {
    expect(ruta('/reuniones')).toEqual(['Reuniones', 'Reuniones'])
    expect(ruta('/reuniones', 'vista=conversaciones')).toEqual(['Reuniones', 'Conversaciones'])
  })

  it('las rutas dinámicas matchean por patrón (detalle de reunión y agenda del asesor)', () => {
    expect(ruta('/reuniones/r-123/insights')).toEqual(['Reuniones', 'Reuniones', 'Detalle'])
    expect(ruta('/asesores/asesor-ana/agenda')).toEqual(['Agendamiento', 'Asesores', 'Agenda'])
    expect(ruta('/asesores')).toEqual(['Agendamiento', 'Asesores'])
  })

  it('la Fase 14 (Agendamiento) está integrada como sección con sus 3 páginas', () => {
    const nivel2 = aplanarNav(NAV_COPILOT)
      .filter((p) => p.nivel === 2 && p.rastro[0].id === 'sec-agendamiento')
      .map((p) => p.nodo.id)
    expect(nivel2).toEqual(['asesores', 'citas', 'servicios'])
  })

  it('las rutas públicas y el footer quedan FUERA del árbol (sin breadcrumb)', () => {
    expect(ruta('/reservar/ana-torres')).toEqual([])
    expect(ruta('/login')).toEqual([])
    expect(ruta('/configuracion')).toEqual([])
  })

  it('el launcher del ecosistema solo lista internas', () => {
    expect(appsParaLauncher().map((a) => a.id)).toEqual(['mission-control', 'control-interno', 'meeting-copilot'])
  })
})

describe('paridad vendored ↔ canónico (--check)', () => {
  it('la copia local del registro coincide con businessos/frontends/app-registry', () => {
    const script = join(__dirname, '..', '..', '..', '..', 'app-registry', 'scripts', 'sync-vendored.mjs')
    const salida = execFileSync('node', [script, '--check'], { encoding: 'utf8' })
    expect(salida).toContain('ok:')
  })
})
