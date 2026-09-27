import { test, expect } from '@playwright/test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Guarda del gate `tests`: ninguna prueba de esta carpeta usa navegador.
 *
 * El Supervisor re-corre `npx playwright test` en un contenedor sin chromium (ver
 * playwright.config.ts). Una sola prueba con el fixture `page` rompe el gate para todos: pasó el
 * 2026-09-06 con logistica-product-research (PR #312) y `verify` quedó en rojo en cada PR desde
 * entonces. Las pruebas con navegador van a `tests-e2e/` (`npm run smoke`, playwright.e2e.config.ts).
 */
const DIR = __dirname
const USA_NAVEGADOR = /\(\s*\{[^}]*\b(page|browser|context)\b[^}]*\}\s*\)/

test('ninguna prueba del gate tests usa el navegador (page, browser, context)', () => {
  const culpables = readdirSync(DIR)
    .filter((f) => f.endsWith('.spec.ts') && f !== 'sin-navegador.spec.ts')
    .filter((f) => USA_NAVEGADOR.test(readFileSync(join(DIR, f), 'utf-8')))
  expect(
    culpables,
    `Estas pruebas usan navegador y el gate tests corre sin chromium; muévelas a tests-e2e/ (npm run smoke): ${culpables.join(', ')}`,
  ).toEqual([])
})
