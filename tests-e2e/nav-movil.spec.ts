import { test, expect, type Page } from '@playwright/test'

/**
 * Smoke de viewport ANGOSTO (#1 del ataque adversarial al PR #194): en móvil
 * el shell recortaba el header ("Salir" y el combo inalcanzables) porque el
 * sidebar desktop ocupaba 280px reales. El fix (#195): sidebar `hidden
 * md:flex` + drawer NavMovil + header flex-wrap con el combo oculto en <sm.
 *
 * Estos son los checks que los 41 specs sin navegador NO pueden ver: aquí
 * hay CSS compilado y layout real (el CSS compilado manda — 2026-07-26).
 */

const MOVIL = { width: 390, height: 844 } // iPhone 12-ish, portrait (el PWA de la dueña)

const sidebarVisible = (page: Page) =>
  page.locator('[data-testid="sidebar-mc"]:visible')

test.describe('móvil (<md)', () => {
  test.use({ viewport: MOVIL })

  test('el sidebar desktop no existe y el header queda completo en pantalla', async ({ page }) => {
    await page.goto('/dashboard')

    // El middleware con AUTH_DISABLED sirve el shell (no redirige a /login).
    await expect(page).toHaveURL(/\/dashboard/)

    // Sidebar desktop oculto bajo md; hamburguesa visible.
    await expect(sidebarVisible(page)).toHaveCount(0)
    await expect(page.getByTestId('nav-movil')).toBeVisible()

    // "Salir" alcanzable SIN scroll horizontal: dentro del viewport.
    const salir = page.getByRole('button', { name: 'Salir' })
    await expect(salir).toBeVisible()
    const caja = await salir.boundingBox()
    expect(caja).not.toBeNull()
    expect(caja!.x + caja!.width).toBeLessThanOrEqual(MOVIL.width)

    // Nada desborda horizontalmente el documento.
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    expect(desborde).toBeLessThanOrEqual(0)

    // El combo de departamento se esconde en <sm (lo cubre el drawer).
    await expect(page.locator('header select')).toBeHidden()
  })

  test('el drawer abre, navega (y se cierra), y cierra con Escape', async ({ page }) => {
    await page.goto('/dashboard')

    await page.getByTestId('nav-movil').click()
    await expect(sidebarVisible(page)).toHaveCount(1)

    // Navegar desde el drawer cierra el drawer (el CRM se movió a
    // meeting-copilot 2026-08-08; Contratos SC cubre el mismo caso a 1 clic).
    await page.getByRole('link', { name: 'Contratos SC' }).click()
    await expect(page).toHaveURL(/\/contratos/)
    await expect(sidebarVisible(page)).toHaveCount(0)

    // Escape cierra sin navegar.
    await page.getByTestId('nav-movil').click()
    await expect(sidebarVisible(page)).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(sidebarVisible(page)).toHaveCount(0)
    await expect(page).toHaveURL(/\/contratos/)
  })
})

test.describe('desktop (≥md)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('el sidebar fijo existe y la hamburguesa no', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(sidebarVisible(page)).toHaveCount(1)
    await expect(page.getByTestId('nav-movil')).toBeHidden()
  })
})
