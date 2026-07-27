import { expect, test } from '@playwright/test'

// Smoke del flujo completo (criterio 13 del SPEC): navegación, audio→resumen,
// launcher, temas y estados vacíos. Corre contra build de producción.

test('home: Mission Control con stats y recomendaciones derivadas', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Mission Control' })).toBeVisible()
  await expect(page.getByText('Reuniones analizadas')).toBeVisible()
  await expect(page.getByTestId('home-reuniones')).toBeVisible()
  await expect(page.getByTestId('home-recomendaciones')).toBeVisible()
})

test('flujo completo: audio demo → transcripción → insights → guided → resumen', async ({ page }) => {
  await page.goto('/herramientas/transcripcion')
  await page.getByTestId('usar-audio-demo').click()
  await expect(page.getByTestId('job-completado')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('enviar-analyzer').click()

  // Insights: score con desglose + evidencia
  await expect(page.getByTestId('score-total')).toBeVisible()
  await expect(page.getByTestId('dim-problema')).toContainText('cubierta')
  await expect(page.getByTestId('insight-pain').first()).toBeVisible()
  await expect(page.getByTestId('hueco-proceso_decision')).toBeVisible()

  // Transcripción: segmentos por speaker
  await page.getByTestId('tab-reunion-transcripcion').click()
  await expect(page.getByTestId('segmento').first()).toBeVisible()

  // Guided: revelar todo → cobertura y panel del coach
  await page.getByTestId('tab-reunion-guiada').click()
  await page.getByTestId('guided-revelar-todo').click()
  await expect(page.getByTestId('cobertura-playbook')).toBeVisible()
  await expect(page.getByTestId('sugerencia-coach')).toBeVisible()

  // Resumen: summary + followup + crm + acciones
  await page.getByTestId('tab-reunion-resumen').click()
  await expect(page.getByTestId('executive-summary')).toBeVisible()
  await expect(page.getByTestId('followup-cuerpo')).toBeVisible()
  await expect(page.getByTestId('crm-notas')).toBeVisible()
  await expect(page.getByTestId('accion').first()).toBeVisible()
})

test('voice transcription: el estado de error es visible y reintentable', async ({ page }) => {
  await page.goto('/herramientas/transcripcion')
  await page.getByTestId('dropzone').locator('input[type=file]').setInputFiles({
    name: 'audio-con-error.mp3',
    mimeType: 'audio/mpeg',
    buffer: Buffer.from('x'),
  })
  await expect(page.getByTestId('job-fallido')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('no pudo decodificarse')).toBeVisible()
  await expect(page.getByTestId('reintentar-job')).toBeVisible()
})

test('guided meeting: la llamada superficial dispara alertas del coach', async ({ page }) => {
  await page.goto('/reuniones/r-kapitalrh-disc/guiada')
  await page.getByTestId('guided-revelar-todo').click()
  await expect(page.getByTestId('alerta-coach')).toBeVisible()
  await expect(page.getByTestId('sugerencia-coach')).toBeVisible()
})

test('grabación en-app: grabar → detener → enviar a la cola de transcripción', async ({ page }) => {
  await page.goto('/grabacion')
  await page.getByTestId('grabar').click()
  await expect(page.getByText('grabando')).toBeVisible()
  await page.waitForTimeout(1500)
  await page.getByTestId('detener').click()
  await expect(page.getByTestId('grabacion-lista')).toBeVisible()
  await page.getByTestId('enviar-transcripcion').click()
  await expect(page).toHaveURL(/herramientas\/transcripcion/)
  await expect(page.getByTestId('job-completado')).toBeVisible({ timeout: 15_000 })
})

test('modo asesor: Prompter embebido en Grabación con fuente demo', async ({ page }) => {
  await page.goto('/grabacion')
  // Sin asesor: la transcripción en curso explica cómo activarse.
  await expect(page.getByTestId('vivo-no-disponible')).toBeVisible()
  // Activar modo asesor → Prompter + campos de contexto (asesor / lead).
  await page.getByTestId('toggle-asesor').click()
  await expect(page.getByTestId('prompter')).toBeVisible()
  await expect(page.getByTestId('prompter-sugerencia')).toContainText('complica')
  await expect(page.getByTestId('contexto-sesion')).toBeVisible()
  await page.getByTestId('input-asesor-nombre').fill('Valeria')
  await page.getByTestId('input-lead-nombre').fill('Marco')
  await expect(page.getByText('contexto completo')).toBeVisible()
  // Fuente demo + grabar → transcripción en curso y señales avanzan.
  await page.getByTestId('fuente-vivo').selectOption('demo')
  await page.getByTestId('grabar').click()
  await expect(page.getByTestId('vivo-segmentos')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('prompter-senales')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('prompter-cobertura')).toBeVisible()
  // Interacciones: otra pregunta.
  const pregunta = await page.getByTestId('prompter-sugerencia').textContent()
  await page.getByTestId('otra-pregunta').click()
  await expect(page.getByTestId('prompter-sugerencia')).not.toHaveText(pregunta ?? '')
  // Detener → registro en bitácora con Descargar/Compartir + metadata de la sesión.
  await page.getByTestId('detener').click()
  await expect(page.getByTestId('grabacion-lista')).toBeVisible()
  const registro = page.getByTestId('bitacora-registro').first()
  await expect(registro).toContainText('asesor: Valeria')
  await expect(registro).toContainText('lead: Marco')
  await expect(registro.getByTestId('bitacora-descargar')).toBeEnabled()
  await expect(registro.getByTestId('bitacora-compartir')).toBeVisible()
  // Guardar sesión analizada → insights de la sesión.
  await page.getByTestId('guardar-sesion').click()
  await expect(page.getByTestId('score-total')).toBeVisible()
  // La bitácora liga la reunión guardada.
  await page.goto('/grabacion')
  await expect(page.getByTestId('bitacora-registro').first()).toContainText('sesión analizada')
  // Apagar el modo asesor deja la grabación normal.
  await page.getByTestId('toggle-asesor').click()
  await expect(page.getByTestId('prompter')).toHaveCount(0)
  await expect(page.getByTestId('grabar')).toBeVisible()
})

test('nueva conversación: pegar transcripción produce insights', async ({ page }) => {
  await page.goto('/reuniones/nueva')
  await page.getByTestId('tab-texto').click()
  await page.getByTestId('input-titulo').fill('Discovery — Prueba E2E')
  await page.getByTestId('input-cuenta').fill('Empresa Prueba')
  await page.getByTestId('input-asesor').fill('Ana')
  await page.getByTestId('input-transcripcion').fill(
    [
      'Ana: ¿Qué es lo que más se les complica hoy en la operación?',
      'Luis: Perdemos pedidos cada semana porque el control lo llevamos en papel.',
      'Ana: ¿Cuánto les cuesta cada pedido perdido?',
      'Luis: Nos cuesta como diez mil pesos por pedido.',
      'Ana: Quedamos en que te mando la propuesta el viernes 31.',
    ].join('\n')
  )
  await page.getByTestId('crear-conversacion').click()
  await expect(page.getByTestId('score-total')).toBeVisible()
  await expect(page.getByTestId('dim-problema')).toContainText('cubierta')
})

test('launcher: popover con búsqueda, pin y navegación', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('abrir-launcher').click()
  await expect(page.getByTestId('launcher-popover')).toBeVisible()
  await page.getByTestId('buscar-herramientas').fill('voice')
  await expect(page.getByTestId('herramienta-voice-transcription').first()).toBeVisible()
  await page.getByTestId('herramienta-voice-transcription').first().click()
  await expect(page).toHaveURL(/herramientas\/transcripcion/)
})

test('command bar: ⌘K busca y navega', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('ControlOrMeta+k')
  await expect(page.getByTestId('command-bar')).toBeVisible()
  await page.keyboard.type('Scorecards')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/manager/)
  await expect(page.getByTestId('tabla-scorecards')).toBeVisible()
})

test('temas: system / light / dark aplican en toda la shell', async ({ page }) => {
  // El toggle vive en la topbar (y también en /configuracion): se ancla al header.
  await page.goto('/configuracion')
  const toggle = (modo: string) => page.locator('header').getByTestId(`theme-${modo}`)
  await toggle('dark').click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await toggle('light').click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await toggle('system').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', /light|dark/)
  // Persistencia + anti-flash: recargar conserva el modo elegido.
  await toggle('dark').click()
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('estados vacíos con criterio: reunión inexistente y manager', async ({ page }) => {
  await page.goto('/reuniones/no-existe/insights')
  await expect(page.getByText('Reunión no encontrada')).toBeVisible()
  await page.goto('/manager')
  await expect(page.getByTestId('tabla-scorecards')).toBeVisible()
})

test('responsive básico: el shell no rompe en viewport angosto', async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 800 })
  await page.goto('/reuniones')
  await expect(page.getByTestId('tabla-reuniones')).toBeVisible()
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflowX).toBeLessThanOrEqual(24)
})

test('pre-discovery: intake → análisis (mock declarado) → brief → activo/costeo → CLIs', async ({ page }) => {
  await page.goto('/pre-discovery')
  await expect(page.getByTestId('tabla-casos')).toBeVisible() // caso demo GAL presente
  await page.getByTestId('nuevo-caso').click()
  await page.getByTestId('intake-empresa').fill('EcoNorte Consultores')
  await page.getByTestId('intake-contacto').fill('Diana Robles')
  await page.getByTestId('intake-giro').fill('Consultoría ambiental')
  await page.getByTestId('crear-caso').click()
  // Workspace del caso: el pipeline mock corre y el caso queda listo.
  await expect(page.getByText('Resumen ejecutivo')).toBeVisible({ timeout: 20_000 })
  // Benchmark honesto: giro sin arquetipos → no concluyente, no se inventa.
  await page.getByTestId('tab-caso-benchmark').click()
  await expect(page.getByTestId('competencia-no-concluyente')).toBeVisible()
  // Marcos: fail-safe del grafo con disclaimer SIEMPRE.
  await page.getByTestId('tab-caso-marcos').click()
  await expect(page.getByTestId('disclaimer-grafo')).toBeVisible()
  await expect(page.getByText('sin regla aplicable').first()).toBeVisible()
  // Brief del asesor consumible.
  await page.getByTestId('tab-caso-brief').click()
  await expect(page.getByTestId('brief-asesor')).toBeVisible()
  await expect(page.getByTestId('descargar-brief')).toBeVisible()
  // Activo Digital espejo ACT + costeo ejecutivo con origen declarado.
  await page.getByTestId('tab-caso-activo').click()
  await expect(page.getByTestId('activo-costeo')).toBeVisible()
  await expect(page.getByText(/ACT-LOC-\d{4}/).first()).toBeVisible()
  await expect(page.getByText('análisis demo: $0 declarado')).toBeVisible()
  await expect(page.getByTestId('exportar-activo')).toBeVisible()
  // CLIs copiables (nunca fingidos).
  await page.getByTestId('tab-caso-clis').click()
  const comandos = page.getByTestId('cli-comando')
  await expect(comandos.first()).toBeVisible()
  expect(await comandos.count()).toBeGreaterThanOrEqual(4)
})

test('pre-discovery: el prep del asesor aparece en Grabación al ligar el lead con caso', async ({ page }) => {
  await page.goto('/grabacion')
  await page.getByTestId('toggle-asesor').click()
  await page.getByTestId('selector-lead-sesion').selectOption('lead-gal')
  await expect(page.getByTestId('prep-asesor')).toBeVisible()
  await expect(page.getByTestId('prep-asesor')).toContainText('Hipótesis a validar')
})

test('pre-discovery: panel admin con tarifas, límites y auditoría', async ({ page }) => {
  await page.goto('/pre-discovery/admin')
  await expect(page.getByTestId('tabla-tarifas')).toBeVisible()
  await expect(page.getByTestId('presupuesto-caso')).toBeVisible()
  await expect(page.getByTestId('eje-desarrollo')).toBeVisible()
  await expect(page.getByText('Sin acciones registradas todavía', { exact: false })).toBeVisible()
  await expect(page.getByTestId('tabla-activos-modulo')).toBeVisible() // activo del caso demo GAL
})
