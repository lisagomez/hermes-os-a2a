---
name: design-panel-adm
description: Usa este skill para diseñar o modificar UI de las superficies ADMIN internas del negocio — Mission Control (panel a2abot en la raíz del repo) y Meeting Copilot (businessos/frontends/meeting-copilot) — con los tokens y reglas del set-up design "panel-adm". Contiene la arquitectura de tokens canónica, las 2 skins (mission dark slate+esmeralda / copilot ejecutiva Inter dual-theme), el inventario de componentes y la deuda priorizada. Triggers: "design panel adm", "diseña el panel admin", "UI de Mission Control", "UI de Meeting Copilot", "tokens del panel", "nueva vista del dashboard", "on-brand admin".
user-invocable: true
---

# Panel Adm — Design System de las superficies admin (skill)

La fuente de verdad vive en el repo: **`.claude/design-systems/panel-adm/`**.

Antes de diseñar o escribir UI de Mission Control o Meeting Copilot:

1. Lee `.claude/design-systems/panel-adm/panel-adm.md` — set-up completo: estado
   auditado, arquitectura de tokens, skins, inventario de componentes, reglas duras
   y deuda priorizada (esa deuda ES el plan de trabajo por defecto).
2. Tokens ejecutables: `.claude/design-systems/panel-adm/panel-adm-tokens.css` —
   cada superficie es dueña de su copia; no importar el archivo cross-app.
3. Referencia visual: `businessos/dashboard-screenshots/*.png` (Mission Control) y
   `businessos/frontends/meeting-copilot/src/app/globals.css` (tokens vivos de Copilot).

## Reglas rápidas (no romperlas)

- **Una sola skin admin desde 2026-08-08**: la `ejecutiva` (light-first + dark,
  Inter, acento azul `#2760db`) viste a AMBAS superficies por decisión de la dueña.
  Variantes por app: Mission Control conserva base 20px, glifos Unicode (sin
  lucide) y puente alpha `--*-rgb`; Copilot usa lucide y base 16px. La skin
  `mission` (dark slate+esmeralda) está RETIRADA — no revivirla. NUNCA usar
  `@a2a/design-system` (eso es marca de CLIENTE, no admin).
- Nombres de token canónicos: `--background --surface --line --ink* --accent*` +
  estados tonales `--success/-muted` etc. Dataviz compartida `--viz-*`: el color
  sigue a la ENTIDAD (personal azul, negocio verde, clientes ámbar), nunca al rank.
- El estado nunca es color-solo (glifo `aria-hidden` + texto). Toda afirmación cita
  su evidencia (segmento en Copilot, fuente en el grafo) y el disclaimer del grafo
  es siempre visible. Empty states honestos: qué pasa + qué hacer.
- Score: una sola regla `>=70 success / >=50 warning / resto danger` (`tonoScore`).
- Charts: SVG a mano con `--viz-*`; sin librerías de charting.
- `html { font-size: 20px }` de Mission Control es decisión de la dueña — respetar.
- Los tests de Mission Control (Playwright SIN navegador) asertan sobre `style`
  inline de componentes puros sin hooks: si mueves color de `style={{}}` a clase,
  actualiza `tests/desarrollo.spec.ts` / `tests/crm-embudo.spec.ts` en el MISMO cambio.
- Seguridad: auth + allowlist fail-closed es PRERREQUISITO de exponer cualquier
  vista; el service worker jamás cachea HTML/datos. Español, tuteo.

## Uso

- **Vista/feature nueva**: copia los patrones de referencia (Card canónica, Chip
  tonal, CitaEvidencia, badge de fuente mock/real, KpiTile estilo BudgetMeter) del
  inventario §4 del set-up; no reinventes tablas/toggles/callouts.
- **Refactor visual**: sigue el orden de la deuda priorizada (§6) — en Mission
  Control primero fundar tokens (tailwind.config vacío → skin mission), en Copilot
  afinar (keyframes `pulse-once`, `--surface-raised`, `tonoScore` único…).
- **Mock/prototipo**: HTML autocontenido con la skin correspondiente copiada de
  `panel-adm-tokens.css`.

Si el usuario invoca este skill sin más guía, pregunta sobre cuál de las dos
superficies va a trabajar y qué quiere construir, y actúa como diseñador experto
del panel con las reglas de arriba.

## Shell interna: sidebar jerárquico + waffle (2026-07-29)

Anatomía compartida de las apps INTERNAS (Mission Control, control-interno,
meeting-copilot): sidebar colapsable config-driven (árbol en `nav.config.ts`,
Sección → Página → Subpágina, máx 3 niveles) + topbar delgada con **waffle**
(App Launcher del ecosistema, solo apps internas) + **breadcrumb derivado**
(`rastroDe` del registro vendored `src/shared/app-registry/`). Reglas:

- El árbol es DATA (`NavArbol`); el JSX se pinta por app con SUS tokens:
  mission = slate+esmeralda con glifos Unicode (sin lucide, vista pura +
  wrapper por los tests sin navegador); copilot = `.nav-item/.nav-item-active`
  tema dual; control-interno = Titanium con RBAC (`canAccessRoute` por nodo —
  sección sin hijos visibles para el rol no se pinta).
- El activo se deriva SIEMPRE de `rastroDe` (desambigua hermanos por query);
  las subpáginas con `:id` van `ocultoEnSidebar` (solo breadcrumb).
- 4 estados de tile del waffle: actual / activa / acceso-especial (nota) /
  en-construccion. Nunca fingir disponibilidad.
- Alta de una app nueva: `businessos/frontends/README.md` §Ecosistema.
