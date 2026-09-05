---
name: playwright-cli
description: "Testing automatizado con Playwright CLI. Navega la app, llena formularios, hace click, toma screenshots, y genera reportes. Activar cuando el usuario dice: testea esto, revisa que funcione, hay un bug, verificalo, checalo en el browser, o despues de implementar una feature para validar."
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Skill: QA Automatizado con Playwright CLI

> Ejecutar QA: $ARGUMENTS

---

## Por Que CLI en vez de MCP

Playwright MCP inyecta snapshots completos de pagina directamente en el context window. Esto consume muchos tokens y puede causar ruido para flujos conocidos.

Playwright CLI en cambio:
- Guarda datos de pagina a disco (archivos YAML/screenshots) en vez de llenar el contexto
- Menos tokens consumidos, mayor precision para flujos definidos
- Claude ya sabe usar shell commands, cero overhead de carga de herramientas
- Los artefactos quedan en disco para revision posterior

**Cuando usar MCP en vez de CLI**: Exploracion interactiva de paginas desconocidas o debugging visual en tiempo real. Para todo lo demas, CLI.

---

## Prerequisitos

Instalar Chromium si no esta instalado:

```bash
npx playwright install chromium
```

---

## Comandos Core de Playwright CLI

> ⛔ **`npx playwright` NO tiene los verbos `navigate`, `click`, `fill` ni `snapshot`.** Son nombres de
> herramientas del **MCP**, no del CLI, y este skill los daba por buenos desde su creacion.
> Verificado contra el binario instalado (**1.61.1**, `npx playwright --help`): los unicos
> subcomandos son `open`, `cr`/`ff`/`wk`, `codegen`, `screenshot`, `pdf`, `test`,
> `show-trace`, `show-report`, `install`. Tampoco existe `playwright cli`.
> Y `screenshot` toma el archivo **POSICIONAL**: `--output` no existe.
>
> Doctrina del repo: **manda el binario instalado, no el blog** — comprueba con `--help`
> antes de escribir un comando en un skill.

Lo que el CLI SI hace, y es su mejor uso: **evidencia de una URL, sin escribir codigo.**

```bash
# Screenshot de una pagina (url y archivo POSICIONALES, en ese orden)
npx playwright screenshot http://localhost:3000 captura.png

# Con espera, pagina completa y tema oscuro
npx playwright screenshot --full-page --wait-for-selector "main" \
  --color-scheme dark http://localhost:3000/dashboard captura.png

# Emular un movil (paridad con `npm run smoke`)
npx playwright screenshot --device "iPhone 11" http://localhost:3000 movil.png

# PDF de una pagina
npx playwright pdf http://localhost:3000/reporte reporte.pdf
```

### Interaccion (login, formularios, flujos): un SCRIPT, no el CLI

El CLI **no sabe** hacer click ni llenar campos: eso es la API. Se hace con un script de
Node que escribe sus artefactos a disco — el argumento de tokens del skill se mantiene
intacto, porque lo que llena el contexto es volcar el DOM, no ejecutar un script.

```javascript
// .qa-reports/flujo.mjs  ·  correr con: node .qa-reports/flujo.mjs
import { chromium } from 'playwright';

const dir = '.qa-reports/2026-09-04-login/screenshots';
const navegador = await chromium.launch();
const pagina = await navegador.newPage();

await pagina.goto('http://localhost:3000/login');       // navigate == goto
await pagina.screenshot({ path: `${dir}/01-login.png` });

await pagina.fill('#email', 'test@example.com');
await pagina.fill('#password', 'testpassword');
await pagina.click('text=Sign In');
await pagina.waitForURL('**/dashboard');

await pagina.screenshot({ path: `${dir}/02-dashboard.png` });

// El "snapshot" del MCP es el arbol de accesibilidad: a disco, nunca al contexto
const { writeFileSync } = await import('node:fs');
writeFileSync(`${dir}/../arbol.json`,
  JSON.stringify(await pagina.accessibility.snapshot(), null, 2));

await navegador.close();
```

Para un flujo que se va a repetir, mejor un spec y `npx playwright test`: este repo ya tiene
`playwright.config.ts`, `tests/`, `tests-e2e/` y `npm run smoke`.

---

## Flujo QA en 6 Fases

### Fase 1: SETUP

Leer los requerimientos del test. Identificar que necesita testing.

- Que feature o bug se esta verificando?
- Cuales son los criterios de exito?
- Que URL/rutas estan involucradas?
- Se necesitan datos de prueba?

Crear el directorio de artefactos:

```bash
mkdir -p .qa-reports/[YYYY-MM-DD]-[nombre]/screenshots
```

### Fase 2: PROVISION

Preparar datos de prueba si son necesarios.

- Crear usuario de prueba via Supabase MCP si aplica
- Preparar datos en BD que el flujo necesite
- Verificar que el servidor de desarrollo esta corriendo

```bash
# Verificar que la app esta corriendo
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

### Fase 3: NAVIGATE

Abrir la app y navegar a las paginas relevantes.

```bash
# Screenshot inicial de la pagina (url y archivo POSICIONALES)
npx playwright screenshot http://localhost:3000/[ruta] \
  .qa-reports/[fecha]-[nombre]/screenshots/01-inicio.png
```

### Fase 4: TEST

Ejecutar los pasos del test. Llenar formularios, hacer clicks, verificar resultados.

Un flujo con clicks y formularios **no cabe en el CLI**: va en un script (ver
*Comandos Core*), que ademas mantiene una sola sesion de navegador — encadenar comandos
sueltos abriria un navegador nuevo cada vez y perderia la sesion del login.

```bash
node .qa-reports/[fecha]-[nombre]/flujo.mjs
```

El script toma screenshot ANTES y DESPUES de cada accion critica. Para una pagina suelta
que no requiere sesion, el CLI sigue siendo lo mas barato:

```bash
npx playwright screenshot http://localhost:3000/login \
  .qa-reports/[fecha]-[nombre]/screenshots/02-login-page.png
```

Tomar screenshot ANTES y DESPUES de cada accion critica.

### Fase 5: DOCUMENT

Guardar snapshots de pagina solo cuando se necesite inspeccionar estructura.

```javascript
// Solo si necesitas ver la estructura: arbol de accesibilidad A DISCO
writeFileSync('.qa-reports/[fecha]-[nombre]/snapshot-[paso].json',
  JSON.stringify(await pagina.accessibility.snapshot(), null, 2));
```

**Principio sticky-notes**: NO volcar snapshots completos al contexto. Leer el archivo YAML solo cuando se necesite inspeccionar algo especifico. Resumen primero, detalles on-demand.

### Fase 6: REPORT

Generar reporte markdown con hallazgos.

---

## Template del Reporte

Crear el archivo `.qa-reports/[YYYY-MM-DD]-[nombre]/report.md`:

```markdown
# QA Report: [Feature/Bug Name]

**Date**: [YYYY-MM-DD]
**Status**: PASSED | FAILED | PARTIALLY_FIXED

## Test Steps
1. [Descripcion del paso] - Screenshot: `screenshots/01-nombre.png`
2. [Descripcion del paso] - Screenshot: `screenshots/02-nombre.png`
3. ...

## Findings
- [Issue encontrado o confirmacion de que funciona]
- [Comportamiento inesperado observado]

## Screenshots
- `screenshots/01-inicio.png` - Estado inicial
- `screenshots/02-accion.png` - Despues de [accion]
- ...

## Recommendations
- [Fix sugerido o mejora]
- [Siguiente paso]
```

---

## Modos de Uso

| Comando | Que hace |
|---------|----------|
| `/qa verify [flujo]` | Verificar que un flujo funciona correctamente |
| `/qa reproduce [bug]` | Intentar reproducir un bug reportado |
| `/qa full [feature]` | QA completo de una feature (happy path + edge cases) |

### Ejemplo: `/qa verify login flow`

```
Fase 1: SETUP - Verificar flujo de login. Criterio: usuario puede loguearse y ver dashboard.
Fase 2: PROVISION - Verificar que existe usuario de prueba en BD.
Fase 3: NAVIGATE - Ir a /login, tomar screenshot.
Fase 4: TEST - Llenar email/password, click Sign In, verificar redireccion a /dashboard.
Fase 5: DOCUMENT - Screenshots en cada paso.
Fase 6: REPORT - Generar report.md con status PASSED/FAILED.
```

---

## Directorio de Output

Todos los artefactos de QA se guardan en:

```
.qa-reports/
  [YYYY-MM-DD]-[nombre]/
    report.md
    screenshots/
      01-nombre.png
      02-nombre.png
      ...
    snapshot-[paso].json  (arbol de accesibilidad, solo si se necesito)
```

---

## Reglas

- SIEMPRE crear el directorio de artefactos antes de empezar
- SIEMPRE tomar screenshots en cada paso critico
- NUNCA volcar snapshots completos al contexto (leerlos on-demand)
- NUNCA inventar subcomandos del CLI: comprobar con `npx playwright --help`
- SIEMPRE generar el reporte al final, incluso si todo paso
- Si el servidor no esta corriendo, avisar al usuario en vez de fallar silenciosamente
- Los screenshots se guardan en disco, NO se insertan inline en el reporte (solo paths)
