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
 * El arreglo llegó dos veces (PR #314 de Johann, luego #318): esta guarda junta las dos.
 */
const DIR = __dirname
const ESTE_ARCHIVO = 'sin-navegador.spec.ts'
// Mismos archivos que corre el runner (testMatch por omisión de Playwright), en cualquier subcarpeta.
const ES_PRUEBA = /\.(spec|test)\.[cm]?[jt]sx?$/
// Un fixture de navegador desestructurado en un callback: `({ page }) =>`, `({ page }, testInfo) =>`,
// `({ page }: Tipo) =>`. Exigir el `=>` (o `{` de `function`) tras el `)` distingue el parámetro de
// una llamada pura como `listar({ page: 2 })`, que no debe marcarse.
const USA_NAVEGADOR = /\(\s*\{[^}]*\b(page|browser|context)\b[^}]*\}[^)]*\)\s*(=>|\{)/

test('la guarda reconoce las formas de fixture de navegador y no las llamadas puras', () => {
  const casos: Array<[string, boolean]> = [
    ['async ({ page }) => {', true],
    ['async ({ page, context }) => {', true],
    ['async ({\n  page,\n}) => {', true],
    ['async ({ page }, testInfo) => {', true],
    ['async ({ page }: { page: Page }) => {', true],
    ['async ({ browser }, info) => {', true],
    ['async function ({ page }) {', true],
    ['const r = listar({ page: 2 })', false],
    ['expect(render({ context: ctx })).toContain("x")', false],
    ['async ({ request }) => {', false],
  ]
  for (const [codigo, esperado] of casos) {
    expect(USA_NAVEGADOR.test(codigo), JSON.stringify(codigo)).toBe(esperado)
  }
})

test('ninguna prueba del gate tests usa el navegador (page, browser, context)', () => {
  const pruebas = readdirSync(DIR, { recursive: true, encoding: 'utf-8' })
    .filter((f) => ES_PRUEBA.test(f) && f !== ESTE_ARCHIVO)
  // Sin esta aserción, un filtro roto dejaría la guarda verde sin haber mirado nada (2026-09-04:
  // contar la caja, no el contenido). Aporte del PR #314.
  expect(pruebas.length, 'no se encontró ninguna prueba en tests/').toBeGreaterThan(0)
  const culpables = pruebas.filter((f) => USA_NAVEGADOR.test(readFileSync(join(DIR, f), 'utf-8')))
  expect(
    culpables,
    `Estas pruebas usan navegador y el gate tests corre sin chromium; muévelas a tests-e2e/ (npm run smoke): ${culpables.join(', ')}`,
  ).toEqual([])
})
