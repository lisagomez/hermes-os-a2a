import { test, expect } from '@playwright/test'
import type { Tarea } from '../src/features/dashboard/types'
import { EstadoTareaBadge } from '../src/features/dashboard/components/desarrollo/estado-tarea-badge'
import { TareasTable } from '../src/features/dashboard/components/desarrollo/tareas-table'
import { CHROME, STATUS } from '../src/features/dashboard/components/ai-spend/colors'

/**
 * Tests del gate `tests` para /desarrollo.
 *
 * ¿Por qué sin navegador? El Supervisor re-corre `npx playwright test` dentro de
 * un contenedor sin binarios de chromium. Estos tests NO usan el fixture `page`:
 * renderizan los componentes de presentación reales de /desarrollo (TareasTable,
 * EstadoTareaBadge) y recorren el árbol JSX instrumentado por el runner
 * ({__pw_type, type, props}) para asertar sobre el HTML que producirían — texto e
 * inline styles. Cubren: tabla (columnas + filas), badges por estado (color) y
 * empty state. Es decir, lo que la página realmente pinta, sin depender de un
 * browser ni de un webserver.
 */

// ---- helper: recorre el árbol JSX instrumentado por @playwright/test ----
// Los componentes son funciones puras (sin hooks): llamarlos con props devuelve
// su árbol JSX. Bajamos por hijos y por componentes anidados, acumulando texto
// y objetos `style` para asertar igual que sobre un HTML renderizado.
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
      // componente funcional anidado -> invocarlo para obtener su sub-árbol
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

// invoca un componente funcional puro y renderiza su salida
function renderCmp<C extends (p: never) => unknown>(cmp: C, props: Parameters<C>[0]): Rendered {
  return render((cmp as (p: typeof props) => unknown)(props))
}

// ----------------------------- Empty state -----------------------------

test('TareasTable con array vacío muestra empty state y no una tabla rota', () => {
  const { text, styles } = renderCmp(TareasTable, { tareas: [] })

  // mensaje claro de empty state
  expect(text).toContain('Sin tareas todavía')
  expect(text).toContain('aparecerá aquí')

  // NO debe pintar cabeceras de tabla (tabla rota) cuando no hay datos
  expect(text).not.toContain('Objetivo')
  expect(text).not.toContain('Intentos')

  // sin badges coloreados en el empty state
  expect(styles).toHaveLength(0)
})

// ------------------------------- Tabla --------------------------------

test('TareasTable renderiza las 5 columnas y los datos de cada fila', () => {
  const tareas: Tarea[] = [
    {
      task_id: 'task-xyz-999',
      objetivo: 'Objetivo unico de prueba',
      estado: 'rechazada',
      intentos: 7,
      created_at: '2026-07-12T09:40:00Z',
    },
  ]
  const { text } = renderCmp(TareasTable, { tareas })

  // cabeceras (task_id, objetivo, estado, intentos, fecha)
  expect(text).toContain('Task')
  expect(text).toContain('Objetivo')
  expect(text).toContain('Estado')
  expect(text).toContain('Intentos')
  expect(text).toContain('Fecha')

  // datos de la fila
  expect(text).toContain('task-xyz-999')
  expect(text).toContain('Objetivo unico de prueba')
  expect(text).toContain('7') // intentos
  // fecha formateada determinista: 'YYYY-MM-DDTHH:MM' -> 'YYYY-MM-DD HH:MM'
  expect(text).toContain('2026-07-12 09:40')
})

// Fixture multi-fila local con TODOS los estados de `tareaSchema` (réplica del
// dominio real de `tareas`). NO se importa de services/mock.ts: ese módulo tiene
// `import 'server-only'`, que en el runner de Node de Playwright resuelve a su
// `index.js` (throw) — el guard es para el bundler de Next, no para un test. Keep
// it self-contained.
const TAREAS_FIXTURE: Tarea[] = [
  { task_id: 'mission-control-2026-0001', objetivo: 'Crear página /desarrollo', estado: 'en_ejecucion', intentos: 1, created_at: '2026-07-12T09:40:00Z' },
  { task_id: 'dogfood-swarm-1', objetivo: 'Dogfood del enjambre (Fase 7)', estado: 'aprobada', intentos: 2, created_at: '2026-07-11T18:20:00Z' },
  { task_id: 'dogfood-trio-1', objetivo: 'Dogfood del trío con GLM-5.2', estado: 'aprobada', intentos: 3, created_at: '2026-07-11T12:05:00Z' },
  { task_id: 'fase9-supervisor-0007', objetivo: 'Chequeos de adquisición (Fase 9)', estado: 'en_revision', intentos: 1, created_at: '2026-07-10T16:30:00Z' },
  { task_id: 'cli-audit-0011', objetivo: 'Migrar cli-audit a índice versionado', estado: 'escalada', intentos: 3, created_at: '2026-07-12T07:15:00Z' },
  { task_id: 'polar-webhook-0004', objetivo: 'Reintentar webhook Polar (403 CF)', estado: 'rechazada', intentos: 2, created_at: '2026-07-02T22:10:00Z' },
  { task_id: 'telegram-privacy-0006', objetivo: 'Apagar Group Privacy del bot', estado: 'concretada', intentos: 1, created_at: '2026-07-12T10:00:00Z' },
  { task_id: 'hermes-cron-0009', objetivo: 'Crear crons faltantes en 3 verticales', estado: 'recibida', intentos: 0, created_at: '2026-07-12T11:00:00Z' },
  { task_id: 'arm-cax-0002', objetivo: 'Probar imagen Hermes sobre ARM', estado: 'cancelada', intentos: 0, created_at: '2026-07-05T13:45:00Z' },
]

test('TareasTable renderiza un fixture multi-fila sin perder filas', () => {
  // Cubre que el componente maneja el tipo Tarea del data layer con varias filas
  // y todos los estados posibles del check constraint de `tareas`.
  const { text } = renderCmp(TareasTable, { tareas: TAREAS_FIXTURE })
  for (const t of TAREAS_FIXTURE) {
    expect(text).toContain(t.task_id)
  }
})

// ------------------------ Badges por estado ---------------------------
// Criterio: aprobada=verde, rechazada=rojo, en_ejecucion=azul,
// escalada=ámbar, resto=gris.

const AZUL = '#3987e5'

test('Badge aprobada es verde y muestra icono + label', () => {
  const { text, styles } = renderCmp(EstadoTareaBadge, { estado: 'aprobada' })
  expect(text).toContain('aprobada')
  expect(text).toContain('✓')
  expect(styles).toContainEqual({ color: STATUS.good, borderColor: STATUS.good })
})

test('Badge rechazada es roja', () => {
  const { styles } = renderCmp(EstadoTareaBadge, { estado: 'rechazada' })
  expect(styles).toContainEqual({ color: STATUS.critical, borderColor: STATUS.critical })
})

test('Badge en_ejecucion es azul', () => {
  const { styles } = renderCmp(EstadoTareaBadge, { estado: 'en_ejecucion' })
  expect(styles).toContainEqual({ color: AZUL, borderColor: AZUL })
})

test('Badge escalada es ámbar', () => {
  const { styles } = renderCmp(EstadoTareaBadge, { estado: 'escalada' })
  expect(styles).toContainEqual({ color: STATUS.warning, borderColor: STATUS.warning })
})

// los estados "resto" comparten el gris cromado (no verde/rojo/azul/ámbar)
test('Badge del resto de estados son grises (CHROME.muted)', () => {
  const resto = ['recibida', 'en_revision', 'concretada', 'cancelada'] as const
  for (const estado of resto) {
    const { styles } = renderCmp(EstadoTareaBadge, { estado })
    expect(styles, `estado ${estado}`).toContainEqual({ color: CHROME.muted, borderColor: CHROME.muted })
  }
})

test('Badge formatea el label: sustituye "_" por espacio', () => {
  const { text } = renderCmp(EstadoTareaBadge, { estado: 'en_ejecucion' })
  expect(text).toContain('en ejecucion')
  expect(text).not.toContain('en_ejecucion')
})

// integración: el badge coloreado vive dentro de una celda de la tabla
test('La tabla embebe el badge con el color correcto del estado de la fila', () => {
  const tareas: Tarea[] = [
    {
      task_id: 'fila-color',
      objetivo: 'cualquiera',
      estado: 'aprobada',
      intentos: 1,
      created_at: '2026-07-12T09:40:00Z',
    },
  ]
  const { text, styles } = renderCmp(TareasTable, { tareas })
  // la tabla pintó el label del badge, no solo datos planos
  expect(text).toContain('aprobada')
  // y llevó el color del estado a una celda
  expect(styles).toContainEqual({ color: STATUS.good, borderColor: STATUS.good })
})
