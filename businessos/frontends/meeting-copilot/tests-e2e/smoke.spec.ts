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

test('integridad de diseño: el selector de playbook persiste su posición al salir y volver', async ({ page }) => {
  // Regla 2 de hermes-design-integrity: la selección es estado de navegación →
  // vive en la URL. Control del bug "el selector regresa solo al primero".
  await page.goto('/playbooks')
  await expect(page.getByTestId('playbook-pb-discovery')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('playbook-pb-negociacion').click()
  await expect(page.getByTestId('playbook-pb-negociacion')).toHaveAttribute('aria-pressed', 'true')
  await expect(page).toHaveURL(/playbook=pb-negociacion/)

  // Salir a otra sección y volver por el sidebar: la selección debe seguir ahí
  // …al volver por la URL con la selección (back del navegador / link compartido).
  await page.goto('/')
  await page.goBack()
  await expect(page.getByTestId('playbook-pb-negociacion')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: 'Negociación' })).toBeVisible()
})

test('login: la página pública renderiza el formulario sin el shell', async ({ page }) => {
  // Con AUTH_DISABLED=1 (webServer del smoke) /login sigue siendo pública:
  // valida el render de la vista y el escape del AppShell (sin sidebar).
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Meeting Copilot' })).toBeVisible()
  await expect(page.getByLabel('Correo del equipo')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar enlace de acceso' })).toBeVisible()
  await expect(page.getByTestId('sidebar')).toHaveCount(0)

  // Estados de error honestos por query param
  await page.goto('/login?denied=1')
  await expect(page.getByText('no tiene acceso')).toBeVisible()
  await page.goto('/login?error=config')
  await expect(page.getByText('no está configurada')).toBeVisible()
})

// ─── Agendamiento (SPEC §19) ────────────────────────────────────────────────

test('agendamiento M1: catálogo con humanos e IA, filtro en URL y semáforo derivado', async ({ page }) => {
  await page.goto('/asesores')
  await expect(page.getByTestId('catalogo-asesores')).toBeVisible()
  const tarjetas = page.getByTestId('tarjeta-asesor')
  await expect(tarjetas.first()).toBeVisible()
  expect(await tarjetas.count()).toBeGreaterThanOrEqual(6)
  await expect(page.locator('[data-testid="tarjeta-asesor"][data-tipo="ia"]').first()).toBeVisible()
  await expect(page.getByTestId('semaforo-disponibilidad').first()).toBeVisible()
  // Un asesor IA 24/7 siempre da semáforo 'inmediata' (derivado, no almacenado)
  await expect(page.locator('[data-testid="tarjeta-asesor"][data-tipo="ia"] [data-semaforo="inmediata"]').first()).toBeVisible()

  // El filtro es estado de navegación → vive en la URL y sobrevive al back
  await page.getByTestId('filtro-tipo-ia').click()
  await expect(page).toHaveURL(/tipo=ia/)
  await expect(page.locator('[data-testid="tarjeta-asesor"][data-tipo="humano"]')).toHaveCount(0)
  await page.goto('/')
  await page.goBack()
  await expect(page.getByTestId('filtro-tipo-ia')).toHaveAttribute('aria-pressed', 'true')
})

test('agendamiento M2: aprobar dispara confirmaciones mock; el pago pendiente es candado visible', async ({ page }) => {
  await page.goto('/asesores/asesor-ana/agenda')
  await expect(page.getByTestId('editor-disponibilidad')).toBeVisible()
  await expect(page.getByText('America/Mexico_City').first()).toBeVisible() // TZ explícita

  // La solicitud demo (discovery) muestra su brief al asesor
  const bandeja = page.getByTestId('bandeja-solicitudes')
  await expect(bandeja.getByText('Marta Villa')).toBeVisible()
  await expect(bandeja.getByTestId('brief-solicitud')).toBeVisible()

  // Aprobar → par [email, whatsapp] registrado (mock declarado) y bandeja vacía
  await bandeja.getByTestId('boton-aprobar').click()
  const aviso = page.getByTestId('notificaciones-cita')
  await expect(aviso).toContainText('email')
  await expect(aviso).toContainText('whatsapp')
  await expect(bandeja.getByText('Sin solicitudes pendientes')).toBeVisible()

  // En el tablero quedó CONFIRMADA (la firma el sistema notificador)
  await page.goto('/citas')
  await expect(
    page.locator('[data-testid="fila-cita"]', { hasText: 'Marta Villa' }).locator('[data-estado="confirmada"]')
  ).toBeVisible()

  // Candado de pago: la solicitud de Luis (auditoría con pago previo) no se puede aprobar
  await page.goto('/asesores/asesor-luis/agenda')
  await expect(page.getByTestId('bandeja-solicitudes').getByText('Pago pendiente')).toBeVisible()
  await expect(page.getByTestId('boton-aprobar')).toBeDisabled()
})

test('agendamiento M2: reasignar mueve la solicitud a otro asesor conservando la cita viva', async ({ page }) => {
  await page.goto('/asesores/asesor-ana/agenda')
  const bandeja = page.getByTestId('bandeja-solicitudes')
  await bandeja.getByTestId('boton-reasignar').click()
  await page.getByTestId('reasignar-a-asesor-carla').click()
  await expect(page.getByTestId('notificaciones-cita')).toContainText('reasignada a Carla')
  await expect(bandeja.getByText('Sin solicitudes pendientes')).toBeVisible()

  // La solicitud ahora vive en la bandeja de Carla, sigue 'solicitada'
  await page.goto('/asesores/asesor-carla/agenda')
  await expect(page.getByTestId('bandeja-solicitudes').getByText('Marta Villa')).toBeVisible()
})

test('agendamiento M3: el cliente reserva en móvil, sin shell, y la solicitud llega a la bandeja', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/reservar/ana-torres')

  // Superficie pública: sin sidebar y con la demo declarada
  await expect(page.getByTestId('reserva-cliente')).toBeVisible()
  await expect(page.getByTestId('sidebar')).toHaveCount(0)
  await expect(page.getByTestId('banner-demo')).toBeVisible()

  // Paso 1: datos
  await page.getByTestId('reserva-nombre').fill('Cliente Móvil')
  await page.getByTestId('reserva-email').fill('cliente@movil.mx')
  await page.getByTestId('reserva-telefono').fill('5544332211')
  await page.getByTestId('reserva-continuar').click()
  await expect(page).toHaveURL(/paso=horario/)

  // Paso 2: día con disponibilidad → SOLO slots libres, hora con TZ explícita
  await page.locator('[data-testid^="fecha-"]:not([disabled])').first().click()
  await expect(page.getByTestId('reserva-slots')).toBeVisible()
  await page.getByTestId('reserva-slot').first().click()
  await page.getByTestId('reserva-confirmar').click()
  await expect(page.getByTestId('reserva-exito')).toBeVisible()
  await expect(page.getByTestId('reserva-exito')).toContainText('solicitada')

  // Mismo navegador (mock declarado): la solicitud aparece en la bandeja de Ana
  await page.goto('/asesores/asesor-ana/agenda')
  await expect(page.getByTestId('bandeja-solicitudes').getByText('Cliente Móvil')).toBeVisible()
})

test('agendamiento M4: tablero con métricas derivadas, transición por máquina, llamar y filtro en URL', async ({ page }) => {
  await page.goto('/citas')
  await expect(page.getByTestId('tablero-citas')).toBeVisible()
  await expect(page.getByText('Aprobación media')).toBeVisible()

  // La fila en_curso ofrece EXACTAMENTE las transiciones de la máquina
  const enCurso = page.locator('[data-testid="fila-cita"][data-cita="cita-demo-encurso"]')
  await expect(enCurso.getByTestId('accion-completar')).toBeVisible()
  await expect(enCurso.getByTestId('accion-iniciar')).toHaveCount(0)
  await enCurso.getByTestId('accion-completar').click()
  await expect(enCurso.locator('[data-estado="completada"]')).toBeVisible()

  // Botón Llamar → handoff tel:/wa.me + seam declarado de la herramienta integrada
  await enCurso.getByTestId('boton-llamar').click()
  await expect(page.getByTestId('dialog-llamar')).toBeVisible()
  await expect(page.getByTestId('llamar-tel')).toBeVisible()
  await expect(page.getByTestId('llamar-whatsapp')).toBeVisible()
  await page.keyboard.press('Escape')

  // El filtro vive en la URL y sobrevive a un reload
  await page.getByTestId('filtro-citas-no_show').click()
  await expect(page).toHaveURL(/estado=no_show/)
  await expect(page.locator('[data-testid="fila-cita"]')).toHaveCount(1)
  await page.reload()
  await expect(page.getByTestId('filtro-citas-no_show')).toHaveAttribute('aria-pressed', 'true')
})

test('agendamiento M5: la ruta discovery exige brief y lo propaga hasta la bandeja del asesor', async ({ page }) => {
  await page.goto('/servicios')
  await expect(page.getByTestId('catalogo-servicios')).toBeVisible()

  // Ruta A (quick): va directo al selector de asesor, sin formulario
  await page.getByTestId('elegir-diagnostico-express').click()
  await expect(page.getByTestId('dialog-servicio')).toBeVisible()
  await expect(page.getByTestId('formulario-discovery')).toHaveCount(0)
  await page.keyboard.press('Escape')

  // Ruta B (discovery): mini-formulario primero
  await page.getByTestId('elegir-discovery-profundo').click()
  await expect(page.getByTestId('formulario-discovery')).toBeVisible()
  await page.getByTestId('disc-respuesta-0').fill('Manufactura de autopartes')
  await page.getByTestId('disc-respuesta-1').fill('Automatizar cotizaciones')
  await page.getByTestId('disc-respuesta-2').fill('Este mes')
  await page.getByTestId('disc-continuar').click()
  await page.getByTestId('servicio-asesor-ana-torres').click()
  await expect(page).toHaveURL(/depth=discovery/)

  // La reserva viaja con el brief; al confirmar llega a la bandeja con él
  await page.getByTestId('reserva-nombre').fill('Lead Discovery')
  await page.getByTestId('reserva-email').fill('lead@discovery.mx')
  await page.getByTestId('reserva-telefono').fill('5599887766')
  await page.getByTestId('reserva-continuar').click()
  await page.locator('[data-testid^="fecha-"]:not([disabled])').first().click()
  await page.getByTestId('reserva-slot').first().click()
  await page.getByTestId('reserva-confirmar').click()
  await expect(page.getByTestId('reserva-exito')).toBeVisible()

  await page.goto('/asesores/asesor-ana/agenda')
  const solicitud = page.locator('[data-testid="solicitud-item"]', { hasText: 'Lead Discovery' })
  await expect(solicitud.getByText('Discovery', { exact: true })).toBeVisible() // el Chip de profundidad
  await solicitud.getByTestId('brief-solicitud').locator('summary').click()
  await expect(solicitud.getByText('Manufactura de autopartes')).toBeVisible()

  // En el tablero, la fila muestra la profundidad correcta
  await page.goto('/citas')
  await expect(
    page.locator('[data-testid="fila-cita"]', { hasText: 'Lead Discovery' }).getByText('Discovery', { exact: true })
  ).toBeVisible()
})

test('agendamiento M1: CRUD de asesores — agregar, visualizar, editar y borrar con guard', async ({ page }) => {
  await page.goto('/asesores')

  // AGREGAR
  await page.getByTestId('agregar-asesor').click()
  await page.getByTestId('asesor-nombre').fill('María Prueba')
  await page.getByTestId('asesor-especialidad').fill('Pruebas end to end')
  await page.getByTestId('guardar-asesor').click()
  const tarjeta = page.locator('[data-testid="tarjeta-asesor"][data-slug="maria-prueba"]')
  await expect(tarjeta).toBeVisible()
  // Nueva sin franjas → semáforo honesto 'sin agenda'
  await expect(tarjeta.locator('[data-semaforo="sin_agenda"]')).toBeVisible()

  // VISUALIZAR
  await tarjeta.getByTestId('ver-maria-prueba').click()
  await expect(page.getByTestId('ficha-asesor')).toBeVisible()
  await expect(page.getByTestId('ficha-asesor')).toContainText('/reservar/maria-prueba')
  await page.keyboard.press('Escape')

  // EDITAR (persiste al recargar: copy-on-write a localStorage)
  await tarjeta.getByTestId('editar-maria-prueba').click()
  await page.getByTestId('asesor-especialidad').fill('Especialidad editada')
  await page.getByTestId('guardar-asesor').click()
  await expect(tarjeta).toContainText('Especialidad editada')
  await page.reload()
  await expect(page.locator('[data-testid="tarjeta-asesor"][data-slug="maria-prueba"]')).toContainText('Especialidad editada')

  // BORRAR con guard: Ana tiene citas activas → bloqueado con motivo
  await page.getByTestId('borrar-ana-torres').click()
  await page.getByTestId('confirmar-borrar-asesor').click()
  await expect(page.getByTestId('borrar-bloqueado')).toContainText('activa')
  await page.keyboard.press('Escape')

  // BORRAR la nueva (sin citas) → desaparece del catálogo
  await page.getByTestId('borrar-maria-prueba').click()
  await page.getByTestId('confirmar-borrar-asesor').click()
  await expect(page.locator('[data-testid="tarjeta-asesor"][data-slug="maria-prueba"]')).toHaveCount(0)
})

// ─── Ecosistema: sidebar jerárquico + App Launcher cross-app (SPEC nav) ─────

test('ecosistema: secciones del sidebar, waffle cross-app con la app actual resaltada y breadcrumb', async ({ page }) => {
  await page.goto('/citas')

  // Sidebar jerárquico: la sección Agendamiento existe y su página activa se marca
  await expect(page.getByTestId('seccion-sec-agendamiento')).toBeVisible()
  await expect(page.getByTestId('sidebar').getByRole('link', { name: 'Citas' })).toHaveAttribute('aria-current', 'page')

  // Breadcrumb derivado del árbol
  await expect(page.getByTestId('breadcrumb')).toContainText('Agendamiento')
  await expect(page.getByTestId('breadcrumb')).toContainText('Citas')

  // Waffle: SOLO apps internas; la actual resaltada; la nota de acceso visible
  await page.getByTestId('waffle-ecosistema').click()
  const lanzador = page.getByTestId('lanzador-ecosistema')
  await expect(lanzador).toBeVisible()
  await expect(lanzador.getByTestId('app-meeting-copilot')).toContainText('actual')
  await expect(lanzador.getByTestId('app-mission-control')).toHaveAttribute('href', /a2abot-mission-control/)
  await expect(lanzador.getByTestId('app-control-interno')).toContainText('vía túnel SSH')
  expect(await lanzador.locator('a, div[data-testid^="app-"]').count()).toBe(3) // cero públicas
  await page.keyboard.press('Escape')
  await expect(lanzador).toHaveCount(0)

  // Plegar una sección persiste tras reload (ui-store migrado a v1)
  await page.getByTestId('seccion-sec-agendamiento').click()
  await expect(page.getByTestId('sidebar').getByRole('link', { name: 'Servicios' })).toHaveCount(0)
  await page.reload()
  await expect(page.getByTestId('sidebar').getByRole('link', { name: 'Servicios' })).toHaveCount(0)
  await page.getByTestId('seccion-sec-agendamiento').click()
  await expect(page.getByTestId('sidebar').getByRole('link', { name: 'Servicios' })).toBeVisible()

  // Desambiguación por query: Conversaciones activa, Reuniones no
  await page.goto('/reuniones?vista=conversaciones')
  await expect(page.getByTestId('sidebar').getByRole('link', { name: 'Conversaciones' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByTestId('breadcrumb')).toContainText('Conversaciones')
})

test('evento presencial: crear, capturar contactos, corregir y detectar el gafete repetido', async ({ page }) => {
  await page.goto('/reuniones/nueva')
  await page.getByTestId('tab-presencial').click()

  // Los tres campos identifican dónde y con quién se capturó cada contacto.
  await page.getByTestId('crear-evento-presencial').click()
  await expect(page.getByTestId('error-nueva-presencial')).toBeVisible()

  await page.getByTestId('input-titulo-presencial').fill('Expo Logística 2026')
  await page.getByTestId('input-cuenta-presencial').fill('Centro Citibanamex')
  await page.getByTestId('input-asesor-presencial').fill('Valeria')
  await page.getByTestId('crear-evento-presencial').click()

  // Aterriza en la captura, y una reunión presencial NO ofrece las vistas de
  // audio: nunca va a tener transcripción que analizar.
  await expect(page).toHaveURL(/\/reuniones\/r-[^/]+\/gafetes$/)
  await expect(page.getByTestId('tab-reunion-gafetes')).toBeVisible()
  await expect(page.getByTestId('tab-reunion-transcripcion')).toHaveCount(0)
  await expect(page.getByTestId('tab-reunion-insights')).toHaveCount(0)

  // Sin aviso de privacidad configurado, la pantalla lo dice antes de capturar.
  await expect(page.getByTestId('aviso-privacidad-falta')).toBeVisible()
  await expect(page.getByTestId('tabla-asistentes')).toHaveCount(0)

  // El nombre es lo único obligatorio.
  await page.getByTestId('guardar-gafete').click()
  await expect(page.getByTestId('error-ficha')).toBeVisible()

  // Captura pegando el contenido del gafete.
  const gafete = 'Marco Díaz\nTranslogika SA de CV\nmarco@translogika.mx\nhttps://translogika.mx'
  await page.getByTestId('input-texto-crudo').fill(gafete)
  await page.getByTestId('gafete-nombre').fill('Marco Díaz')
  await page.getByTestId('gafete-empresa').fill('Translogika SA de CV')
  await page.getByTestId('gafete-email').fill('marco@translogika.mx')
  await page.getByTestId('gafete-sitio').fill('translogika.mx')
  await page.getByTestId('guardar-gafete').click()

  await expect(page.getByTestId('captura-guardada')).toBeVisible()
  await expect(page.getByTestId('tabla-asistentes')).toContainText('Marco Díaz')
  await expect(page.getByTestId('aviso-sin-sincronizar')).toContainText('1 contacto vive')

  // El MISMO gafete otra vez: sube el contador, no duplica la fila.
  await page.getByTestId('input-texto-crudo').fill(gafete)
  await page.getByTestId('gafete-nombre').fill('Marco Díaz')
  await page.getByTestId('guardar-gafete').click()
  await expect(page.getByTestId('captura-repetida')).toBeVisible()
  await expect(page.getByTestId('tabla-asistentes').locator('tbody tr')).toHaveCount(1)
  await expect(page.getByTestId('tabla-asistentes')).toContainText('2 escaneos')

  // Un contacto sin forma de contactarlo se avisa, pero no se bloquea.
  await page.getByTestId('gafete-nombre').fill('Lucía Ramos')
  await expect(page.getByTestId('aviso-sin-contacto')).toBeVisible()
  await page.getByTestId('guardar-gafete').click()
  await expect(page.getByTestId('tabla-asistentes').locator('tbody tr')).toHaveCount(2)

  // Corregir queda marcado y sobrevive a recargar (persistencia local).
  const filaLucia = page.getByTestId('tabla-asistentes').locator('tbody tr').filter({ hasText: 'Lucía Ramos' })
  await filaLucia.getByRole('button', { name: 'Corregir' }).click()
  await page.getByTestId('gafete-email').fill('lucia@translogika.mx')
  await page.getByTestId('guardar-gafete').click()
  await expect(page.getByTestId('tabla-asistentes')).toContainText('corregido')

  await page.reload()
  await expect(page.getByTestId('tabla-asistentes')).toContainText('lucia@translogika.mx')
  await expect(page.getByTestId('tabla-asistentes')).toContainText('2 escaneos')
  await expect(page.getByTestId('tabla-asistentes').locator('tbody tr')).toHaveCount(2)
})
