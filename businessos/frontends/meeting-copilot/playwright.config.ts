import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests-e2e',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4321',
    viewport: { width: 1280, height: 800 },
    permissions: ['microphone'],
    launchOptions: {
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    },
  },
  webServer: {
    command: 'npm run build && npx next start -p 4321',
    url: 'http://localhost:4321',
    timeout: 240_000,
    reuseExistingServer: true,
    // El smoke valida la APP, no el candado: sin esto, toda ruta redirige a
    // /login (fail-closed sin Supabase). El gate de auth se prueba en unit
    // tests (acceso.test.ts) y en el smoke post-deploy de producción.
    env: { AUTH_DISABLED: '1' },
  },
})
