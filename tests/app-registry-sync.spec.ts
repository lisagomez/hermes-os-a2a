import { test, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Paridad vendored ↔ canónico: el drift del registro es gate ROJO, jamás
 * silencioso. El .vercelignore solo afecta el deploy — los tests locales sí
 * ven businessos/. Protocolo si falla: node scripts/sync-vendored.mjs en el
 * MISMO PR (ver businessos/frontends/app-registry/README.md).
 */

const SCRIPT = join(process.cwd(), 'businessos', 'frontends', 'app-registry', 'scripts', 'sync-vendored.mjs')

test('las copias vendored del app-registry coinciden con el canónico (--check)', () => {
  test.skip(!existsSync(SCRIPT), 'checkout parcial sin businessos/ (el deploy de Vercel no corre este gate)')
  const salida = execFileSync('node', [SCRIPT, '--check'], { encoding: 'utf8' })
  expect(salida).toContain('ok:')
})
