import { defineConfig } from '@playwright/test'

/**
 * Smokes E2E de Mission Control con NAVEGADOR REAL — separado del config del
 * gate `tests` (playwright.config.ts, sin browser): `npx playwright test`
 * pelado NO los corre; se invocan con `npm run smoke`.
 *
 * Patrón meeting-copilot: server de producción real con AUTH_DISABLED=1
 * (el smoke valida la APP, no el candado — el candado se prueba con el
 * middleware activo en producción) y DASHBOARD_DATA=mock (sin Supabase).
 */
export default defineConfig({
  testDir: './tests-e2e',
  timeout: 60_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4310',
  },
  webServer: {
    command: 'npm run build && npx next start -p 4310',
    url: 'http://localhost:4310',
    timeout: 240_000,
    reuseExistingServer: true,
    env: { AUTH_DISABLED: '1', DASHBOARD_DATA: 'mock' },
  },
})
