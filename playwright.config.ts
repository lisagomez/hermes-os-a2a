import { defineConfig } from '@playwright/test'

/**
 * Config del gate `tests` (Supervisor: `npx playwright test`).
 *
 * Los tests de /desarrollo renderizan los componentes de presentación
 * (TareasTable, EstadoTareaBadge) con react-dom/server y asertan sobre el
 * HTML resultante. NO usan el fixture `page` ni lanzan navegador: corren
 * puros bajo el runner de @playwright/test, sin binarios de chromium
 * (que no existen en el contenedor del Supervisor). Por eso no hay `projects`
 * ni `webServer`: el runner basta.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
})
