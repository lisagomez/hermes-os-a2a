import { test, expect } from '@playwright/test';

test.describe('Logistics Product Research Platform', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001/logistica-product-research');
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should show source investigation section', async ({ page }) => {
    // Wait for the heading to be visible
    await expect(page.locator('text=1. Investigación de Fuentes')).toBeVisible();

    // Take screenshot of the source investigation section
    await page.screenshot({ path: 'screenshots/1-source-investigation.png', fullPage: true });
  });

  test('should show journey mapping section', async ({ page }) => {
    // Wait for the heading to be visible
    await expect(page.locator('text=2. Journey Mapping')).toBeVisible();

    // Take screenshot of the journey mapping section
    await page.screenshot({ path: 'screenshots/2-journey-mapping.png', fullPage: true });
  });

  test('should show keyword extraction section', async ({ page }) => {
    // Wait for the heading to be visible
    await expect(page.locator('text=3. Extracción y Rankeo de Palabras')).toBeVisible();

    // Take screenshot of the keyword extraction section
    await page.screenshot({ path: 'screenshots/3-keyword-extraction.png', fullPage: true });
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
    await page.screenshot({ path: 'screenshots/4-all-sections-active.png', fullPage: true });
  });
});