import { test, expect } from '@playwright/test'
import {
  validarArbol,
  type ArbolExplorador,
  type ConstructorExplorador,
  type ReglaExplorador,
} from '../src/features/dashboard/types'
import { EstadoBadge } from '../src/features/dashboard/components/grafo/badges'
import {
  ArbolPanel,
  ReglaItem,
} from '../src/features/dashboard/components/grafo/explorador/arbol-panel'
import { AmbitoSelector } from '../src/features/dashboard/components/grafo/explorador/ambito-selector'
import { ConstructorPanel } from '../src/features/dashboard/components/grafo/explorador/constructor-panel'
import { NoDisponible } from '../src/features/dashboard/components/grafo/explorador/no-disponible'
import { CHROME, STATUS } from '../src/shared/constants/colors'

/**
 * Tests del gate `tests` para /grafo/explorador (App C paso 3). Sin navegador
 * (mismo motivo y mismo patrón que tests/desarrollo.spec.ts): componentes de
 * presentación puros invocados como funciones + validadores de la capa de
 * tipos. Cubren los contratos que el ataque adversarial marcó como frágiles:
 * tolerancia del schema (safeParse POR regla, estados fuera del enum viejo),
 * huecos visibles, y la frontera "esta vista jamás escribe".
 */

// ---- helper: recorre el árbol JSX instrumentado por @playwright/test ----
interface Rendered {
  text: string
  styles: Record<string, string>[]
}

function render(node: unknown): Rendered {
  const parts: string[] = []
  const styles: Record<string, string>[] = []

  const walk = (n: unknown): void => {
    if (n == null || typeof n === 'boolean') return
    if (typeof n === 'string') { parts.push(n); return }
    if (typeof n === 'number') { parts.push(String(n)); return }
    if (Array.isArray(n)) { n.forEach(walk); return }
    if (typeof n === 'object' && n !== null && '__pw_type' in n) {
      const el = n as unknown as { type: unknown; props?: Record<string, unknown> }
      const props = el.props ?? {}
      if (typeof el.type === 'function') { walk((el.type as (p: typeof props) => unknown)(props)); return }
      if (props.style && typeof props.style === 'object') {
        styles.push(props.style as Record<string, string>)
      }
      walk(props.children)
    }
  }

  walk(node)
  return { text: parts.join(''), styles }
}

function renderCmp<C extends (p: never) => unknown>(cmp: C, props: Parameters<C>[0]): Rendered {
  return render((cmp as (p: typeof props) => unknown)(props))
}

// ---- fixtures espejo del contrato de flujos-a2a (schemas.py, PR #230) ----

const impactoWire = {
  categoria: 'viaticos',
  regimen: 'PM_TITULO_II',
  veredicto_base: 'deducible',
  tope_monto: null,
  tope_pct: null,
  requisitos: ['CFDI vigente'],
  banderas: [],
  parametros: {},
}

const reglaWire = {
  clave: 'mx-fiscal-viaticos',
  jurisdiccion: 'MX',
  dimension: 'fiscal',
  titulo: 'Viáticos deducibles',
  texto_resumen: 'Con comprobante y estrictamente indispensables.',
  fuente_cita: 'LISR Art. 28, fracción V',
  fuente_url: 'https://example.gob.mx/lisr',
  source_version: 'LISR DOF 2024-12-30',
  vigente_desde: '2025-01-01',
  vigente_hasta: null,
  vigente: true,
  impactos: [impactoWire],
}

const arbolWire = {
  fecha: null,
  total_reglas: 2,
  jurisdicciones: [
    {
      codigo: 'MX',
      nombre: 'México',
      dimensiones: [
        { codigo: 'fiscal', nombre: 'Fiscal', reglas: [reglaWire] },
        // impacto de dimensión regulatorio: veredicto_base con vocabulario
        // propio Y regla solo-requisitos (veredicto null) — ambas formas reales
        {
          codigo: 'regulatorio',
          nombre: 'Regulatorio',
          reglas: [
            {
              ...reglaWire,
              clave: 'mx-reg-aviso',
              dimension: 'regulatorio',
              impactos: [
                { ...impactoWire, categoria: null, regimen: 'GENERAL', veredicto_base: null },
              ],
            },
          ],
        },
        { codigo: 'contable', nombre: 'Contable', reglas: [] }, // hueco
      ],
    },
  ],
}

// ------------------------- validarArbol (capa de tipos) -------------------------

test('validarArbol acepta la forma wire de flujos-a2a sin descartar nada', () => {
  const arbol = validarArbol(arbolWire)
  expect(arbol).not.toBeNull()
  expect(arbol!.descartadas).toBe(0)
  expect(arbol!.jurisdicciones[0].dimensiones[0].reglas[0].clave).toBe('mx-fiscal-viaticos')
  // el impacto solo-requisitos sobrevive con veredicto_base null
  expect(arbol!.jurisdicciones[0].dimensiones[1].reglas[0].impactos[0].veredicto_base).toBeNull()
})

test('validarArbol descarta UNA regla irreconocible y conserva las demás (granular, no por-árbol)', () => {
  const conRota = structuredClone(arbolWire)
  // regla sin fuente_cita ni clave: viola la regla de oro → se descarta y se cuenta
  conRota.jurisdicciones[0].dimensiones[0].reglas.push({ basura: true } as never)
  const arbol = validarArbol(conRota)
  // control de reversión: un .parse() de árbol completo devolvería null aquí
  expect(arbol).not.toBeNull()
  expect(arbol!.descartadas).toBe(1)
  expect(arbol!.jurisdicciones[0].dimensiones[0].reglas).toHaveLength(1)
})

test('validarArbol devuelve null solo si la ESTRUCTURA externa es irreconocible', () => {
  expect(validarArbol({ cualquier: 'cosa' })).toBeNull()
})

// ------------------------- EstadoBadge (bug latente del enum) -------------------------

test('EstadoBadge conoce el vocabulario regulatorio (permitido/no_permitido)', () => {
  const permitido = renderCmp(EstadoBadge, { estado: 'permitido' })
  expect(permitido.text).toContain('permitido')
  expect(permitido.styles.some((s) => s.color === STATUS.good)).toBe(true)
  const noPermitido = renderCmp(EstadoBadge, { estado: 'no_permitido' })
  expect(noPermitido.text).toContain('no permitido')
  expect(noPermitido.styles.some((s) => s.color === STATUS.critical)).toBe(true)
})

test('EstadoBadge degrada a neutro ante un estado desconocido (no revienta la vista)', () => {
  const r = renderCmp(EstadoBadge, { estado: 'estado_futuro' })
  expect(r.text).toContain('estado futuro')
  expect(r.styles.some((s) => s.color === CHROME.muted)).toBe(true)
})

// ------------------------- Árbol (huecos y vigencia visibles) -------------------------

const arbolValidado: ArbolExplorador = validarArbol(arbolWire) as ArbolExplorador

test('ArbolPanel declara el hueco de cobertura de una dimensión sin reglas', () => {
  const r = renderCmp(ArbolPanel, { arbol: arbolValidado })
  expect(r.text).toContain('hueco de cobertura')
  expect(r.text).toContain('Contable')
})

test('ArbolPanel declara las reglas descartadas por schema (fallo visible, no silencioso)', () => {
  const r = renderCmp(ArbolPanel, { arbol: { ...arbolValidado, descartadas: 2 } })
  expect(r.text).toContain('2 reglas descartadas')
})

test('ReglaItem: vigencia nunca color-solo y la fuente siempre citada', () => {
  const vigente = renderCmp(ReglaItem, { regla: arbolValidado.jurisdicciones[0].dimensiones[0].reglas[0] })
  expect(vigente.text).toContain('vigente')
  expect(vigente.text).toContain('LISR Art. 28, fracción V')
  const derogada: ReglaExplorador = {
    ...arbolValidado.jurisdicciones[0].dimensiones[0].reglas[0],
    vigente: false,
    vigente_hasta: '2025-03-20',
  }
  const r = renderCmp(ReglaItem, { regla: derogada })
  expect(r.text).toContain('no vigente')
  expect(r.styles.some((s) => s.color === STATUS.critical)).toBe(true)
})

test('ReglaItem: impacto sin veredicto_base se pinta como "solo requisitos"', () => {
  const r = renderCmp(ReglaItem, { regla: arbolValidado.jurisdicciones[0].dimensiones[1].reglas[0] })
  expect(r.text).toContain('solo requisitos / banderas')
  expect(r.text).toContain('todas las categorías')
})

// ------------------------- Constructor (frontera: jamás escribe) -------------------------

const insumos: ConstructorExplorador = {
  jurisdiccion: 'MX',
  dimension: 'fiscal',
  fecha: null,
  regimenes: ['PF_ACTIVIDAD_EMPRESARIAL', 'PM_TITULO_II'],
  regimen_default: 'PM_TITULO_II',
  categorias: [{ clave: 'viaticos', nombre: 'Viáticos', descripcion: 'Viajes' }],
  plantilla_payload: {
    contexto: { jurisdiccion: 'MX', dimension: 'fiscal', regimen: 'PM_TITULO_II' },
    conceptos: [{ descripcion: '', importe: null }],
  },
}

test('ConstructorPanel pinta el payload de POST /evaluaciones íntegro y parseable', () => {
  const r = renderCmp(ConstructorPanel, { insumos })
  const esperado = JSON.stringify(insumos.plantilla_payload, null, 2)
  expect(r.text).toContain(esperado)
  const contexto = (JSON.parse(esperado) as { contexto: { jurisdiccion: string } }).contexto
  expect(contexto.jurisdiccion).toBe('MX')
})

test('ConstructorPanel declara la frontera de solo-lectura y marca el régimen default', () => {
  const r = renderCmp(ConstructorPanel, { insumos })
  expect(r.text).toContain('JAMÁS escribe')
  expect(r.text).toContain('PM_TITULO_II · default')
})

// ------------------------- Selector y empty state honesto -------------------------

test('AmbitoSelector lista los catálogos de jurisdicciones y dimensiones', () => {
  const r = renderCmp(AmbitoSelector, {
    catalogos: {
      jurisdicciones: [{ codigo: 'MX', nombre: 'México' }],
      dimensiones: [{ codigo: 'fiscal', nombre: 'Fiscal' }],
    },
    jurisdiccion: 'MX',
  })
  expect(r.text).toContain('México (MX)')
  expect(r.text).toContain('Fiscal')
  expect(r.text).toContain('Vigencia al')
})

test('NoDisponible sin health: qué pasa y qué hacer (perfil a2a en el mismo runtime)', () => {
  const r = renderCmp(NoDisponible, { saludFlujos: null })
  expect(r.text).toContain('flujos-a2a')
  expect(r.text).toContain('--profile a2a')
  expect(r.text).toContain('Vercel')
})

test('NoDisponible con health: culpa al GRAFO, no a flujos-a2a (pieza correcta)', () => {
  const r = renderCmp(NoDisponible, {
    saludFlujos: { status: 'ok', grafo: 'grafo no disponible: GET /reglas: timeout', reglas: null },
  })
  expect(r.text).toContain('flujos-a2a está vivo')
  expect(r.text).toContain('grafo no disponible: GET /reglas: timeout')
  // el remedio del otro caso NO se receta aquí (no arregla un grafo caído)
  expect(r.text).not.toContain('--profile a2a up')
})
