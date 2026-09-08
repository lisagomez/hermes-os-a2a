import { test, expect } from '@playwright/test'
import { readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

/**
 * Guardia de la frontera tests/ ↔ tests-e2e/.
 *
 * `tests/` es el gate barato de CI ("specs sin navegador"): sus specs renderizan
 * componentes con react-dom/server y el runner basta. `tests-e2e/` son los smokes
 * con navegador real, que se corren con `npm run smoke`.
 *
 * Esa separación era una COSTUMBRE, y falló: un spec con `page.goto` entró a
 * tests/ (commit c85359a) y dejó el job en rojo para TODOS los PRs del repo,
 * incluidos los de solo documentación — un rojo por razón ajena al cambio, que
 * es lo que entrena al equipo a ignorar el rojo. Ahora la frontera tiene gate.
 */

// Fixtures que exigen un binario de navegador en el runner. `request`
// (APIRequestContext) no está: no lanza navegador.
const FIXTURES_CON_NAVEGADOR = ['page', 'browser', 'context']

const DIR = join(process.cwd(), 'tests')

// Firma de un test/hook que desestructura fixtures: `async ({ page }) => {`.
const DESESTRUCTURA_FIXTURES = /(?:async\s+)?\(\s*\{([^}]*)\}\s*\)\s*=>/g

test('ningún spec de tests/ pide un navegador (esos viven en tests-e2e/)', () => {
  const specs = readdirSync(DIR).filter((f) => f.endsWith('.spec.ts') && f !== basename(__filename))

  // Sin esta aserción, un tests/ vacío o un filtro roto dejarían el gate verde
  // sin haber mirado nada (2026-09-04: contar la caja, no el contenido).
  expect(specs.length, 'no se encontró ningún spec en tests/').toBeGreaterThan(0)

  const infractores: string[] = []
  for (const spec of specs) {
    const fuente = readFileSync(join(DIR, spec), 'utf8')
    for (const m of fuente.matchAll(DESESTRUCTURA_FIXTURES)) {
      const pedidos = m[1].split(',').map((f) => f.split(':')[0].trim())
      const conNavegador = pedidos.filter((f) => FIXTURES_CON_NAVEGADOR.includes(f))
      if (conNavegador.length > 0) infractores.push(`${spec} → { ${conNavegador.join(', ')} }`)
    }
  }

  expect(
    infractores,
    `Estos specs de tests/ piden fixtures de navegador y el job "specs sin navegador" no instala chromium.\n` +
      `Muévelos a tests-e2e/ (se corren con \`npm run smoke\`):\n  ${infractores.join('\n  ')}`
  ).toEqual([])
})
