# Design system del panel admin (panel-adm)

**Estado (2026-07-26): set-up design CREADO; ejecución de la deuda PENDIENTE.**

## Qué es

Design system de las superficies ADMIN internas — Mission Control (Next.js de la
raíz del repo) y Meeting Copilot (`businessos/frontends/meeting-copilot`) — creado
tras auditar el system design de ambas. Fuente de verdad:
`.claude/design-systems/panel-adm/panel-adm.md` (+ `panel-adm-tokens.css`).
Invocable con el skill **`/design-panel-adm`** (`.claude/skills/design-panel-adm/`).

## Decisiones que lo estructuran

- **La arquitectura de tokens de Meeting Copilot es el canon** (`--background
  --surface --line --ink* --accent*` + estados tonales `--*-muted`): Copilot ya la
  tenía sana (19 tokens × light/dark) mientras Mission Control tenía CERO tokens
  (tailwind.config vacío, todo hardcodeado como clases slate/emerald).
- **Dos skins separadas, doctrina "aislar, no fundir"**: `mission` (dark-only,
  slate `#020617/#0f172a` + esmeralda `#059669`, glifos Unicode, sistema base 20px
  — los 20px son decisión de la dueña) y `copilot` (light-first + dark, Inter,
  azul `#2760db`, lucide). Ninguna consume `@a2a/design-system` (marca de CLIENTE).
- **Dataviz compartida** (`--viz-*`, de `colors.ts` de ai-spend): el color sigue a
  la ENTIDAD, nunca al rank.
- **No se imprimen CLIs para esto** (evaluado 2026-07-26): el trabajo es edición de
  código una vez, no consumo repetitivo de API. Candidato adyacente si algún día:
  CLI del grafo (`grafo:3000`).

## La deuda auditada ES el plan (resumen; detalle en §6 del set-up)

- **Mission Control** (el grueso): fundar tokens en globals/tailwind.config,
  promover `colors.ts` a shared (4 redeclaraciones de `#3987e5`), extraer `Card`
  (12+ repeticiones a mano), limpiar shadcn fósil (`components.json` muerto:
  `npx shadcn add` hoy ROMPE el build), loading/error states (0 existen), `/crm`
  al nav.
- **Meeting Copilot** (afinar): `animate-pulse-once` NO existe (el destaque de
  segmento nunca ocurre), `--surface-raised` sin uso, `tonoScore` triplicado,
  faltan Button/Table/PillToggle/Dialog/Callout, "La usé"≡"Otra pregunta" (misma
  acción).

## Restricción dura al ejecutar

Los tests de Mission Control (Playwright SIN navegador) asertan sobre `style`
inline de componentes puros: mover color de `style={{}}` a clase rompe
`tests/desarrollo.spec.ts` y `tests/crm-embudo.spec.ts` → actualizar tests en el
MISMO cambio.

Relacionado: [fase4-dashboard](fase4-dashboard.md),
[frontend-meeting-copilot](frontend-meeting-copilot.md).
