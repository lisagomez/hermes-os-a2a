import { test, expect } from '@playwright/test';

/**
 * Smoke de /logistica-product-research con NAVEGADOR REAL — vive en tests-e2e/
 * porque usa el fixture `page` (goto, click, screenshot). Entró a master en
 * tests/, el directorio del gate SIN navegador, y dejó ese job en rojo para
 * todos los PRs del repo: sin binario de chromium en el runner, sus 4 casos
 * fallaban por una razón ajena a cada cambio.
 *
 * La URL va relativa al `baseURL` del config e2e (localhost:4310, servido por
 * su `webServer`), no al `localhost:3001` de la máquina del autor. Se corre con
 * `npm run smoke`.
 */

test.describe('Logistics Product Research Platform', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/logistica-product-research');
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should show source investigation section', async ({ page }) => {
    // Wait for the heading to be visible
    await expect(page.locator('text=1. Investigación de Fuentes')).toBeVisible();

    // Take screenshot of the source investigation section
    await page.screenshot({ path: 'test-results/logistica-product-research/1-source-investigation.png', fullPage: true });
  });

  test('should show journey mapping section', async ({ page }) => {
    // Wait for the heading to be visible
    await expect(page.locator('text=2. Journey Mapping')).toBeVisible();

    // Take screenshot of the journey mapping section
    await page.screenshot({ path: 'test-results/logistica-product-research/2-journey-mapping.png', fullPage: true });
  });

  test('should show keyword extraction section', async ({ page }) => {
    // Wait for the heading to be visible
    await expect(page.locator('text=3. Extracción y Rankeo de Palabras')).toBeVisible();

    // Take screenshot of the keyword extraction section
    await page.screenshot({ path: 'test-results/logistica-product-research/3-keyword-extraction.png', fullPage: true });
  });

  test('should demonstrate interactive functionality', async ({ page }) => {
    // Test source investigation button
    const sourceInvestigationButton = page.locator('text=Iniciar Investigación de Fuentes');
    await expect(sourceInvestigationButton).toBeVisible({ timeout: 10000 });
    await sourceInvestigationButton.click();
    // Wait for loading text to appear (button text changes to "Investigando...")
    await expect(page.locator('button:has-text("Investigando...")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Seis Roles Logísticos')).toBeVisible({ timeout: 10000 });

    // Test journey mapping button
    const journeyMappingButton = page.locator('text=Generar Journey Map');
    await expect(journeyMappingButton).toBeVisible({ timeout: 10000 });
    await journeyMappingButton.click();
    // Wait for loading text to appear (button text changes to "Generando...")
    await expect(page.locator('button:has-text("Generando...")')).toBeVisible({ timeout: 10000 });
    // Wait for the USA text to be visible in the journey map table (more specific)
    await expect(page.locator('td:has-text("USA:Estándar alto - enfoque en marca y garantía")')).toBeVisible({ timeout: 10000 });

    // Test keyword extraction button
    const keywordExtractionButton = page.locator('text=Extraer y Ranquear Palabras');
    await expect(keywordExtractionButton).toBeVisible({ timeout: 10000 });
    await keywordExtractionButton.click();
    // Wait for loading text to appear (button text changes to "Extrayendo...")
    await expect(page.locator('button:has-text("Extrayendo...")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Matriz de Riesgo UX')).toBeVisible({ timeout: 10000 });

    // Take final screenshot showing all sections active
    await page.screenshot({ path: 'test-results/logistica-product-research/4-all-sections-active.png', fullPage: true });
  });
});