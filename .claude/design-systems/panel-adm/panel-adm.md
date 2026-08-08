# Panel Adm — Set-up Design (superficies admin internas)

> **Alcance**: Mission Control (raíz del repo, `a2abot-mission-control` en Vercel) y
> Meeting Copilot (`businessos/frontends/meeting-copilot`). Son los paneles ADMIN
> internos del negocio. **NO** aplica a las superficies de cliente (`cliente-web2`,
> `cliente-a2a-web3` → skill `a2a-factory-design`) ni a `control-interno`
> (Titaniumorphism propio).
>
> **Doctrina**: *aislar, no fundir*. Cada superficie conserva su piel; lo que se
> comparte es la ARQUITECTURA de tokens semánticos, el inventario de componentes
> y las reglas duras. Ninguna de las dos consume `@a2a/design-system` (dark-only,
> gamificado) — decisión deliberada y documentada en `SPEC.md` §14 de meeting-copilot.
>
> Generado 2026-07-26 a partir de la auditoría de system design de ambas apps.
> Tokens ejecutables: `./panel-adm-tokens.css`. Skill de invocación: `/design-panel-adm`.

---

## 1. Estado actual auditado (resumen)

| | Mission Control | Meeting Copilot |
|---|---|---|
| Stack | Next 16.2.10 · React 19.2 · **Tailwind 3.4** (config VACÍA) | Next 16.2.12 · React 19.2 · **Tailwind 4.3** (sin config, PostCSS) |
| Tokens | **Cero** CSS vars. Único artefacto: `src/features/dashboard/components/ai-spend/colors.ts` (dataviz) | `globals.css` con 19 tokens semánticos × 2 temas (`:root` light / `.dark`) + `@theme inline` |
| Tema | Dark-only hardcodeado (`bg-slate-950` en body). 0 usos de `dark:` | Tri-estado `system\|light\|dark` con anti-flash script y `ThemeToggle` |
| Fuente | Sistema (0 `next/font`) + `html { font-size: 20px }` (**pedido de la dueña, no revertir**) | Inter vía `next/font` (`--font-inter` → `--font-sans`). Sin token mono |
| Iconos | Glifos Unicode (`✓ ✕ ▲ ● ○ ◌ ◆ ⊘ ☐`) + `aria-hidden` + texto | `lucide-react` (con `optimizePackageImports`) |
| Componentes compartidos | **Ninguno** (`src/shared/` vacío; card repetida a mano 12+ veces; shadcn configurado pero MUERTO) | `src/shared/components/ui.tsx`: Chip, ScoreChip, Card, SectionHeader, EmptyState, Stat, ProgressBar |
| Charts | SVG a mano (0 librerías) | — (score/progress con divs) |
| Layout | Header horizontal + `max-w-6xl px-6`, sin sidebar | AppShell: Sidebar colapsable + Topbar (⌘K) + `max-w-6xl px-6` |
| Estados carga/error | **No existen** (`loading.tsx`/`error.tsx`: 0) | EmptyState + errores visibles con reintento |

Informes completos: ver §7 (archivos clave) y la memoria del proyecto.

---

## 2. Arquitectura de tokens canónica

La arquitectura de Meeting Copilot es el **canon** del panel admin. Toda superficie
admin (existente o nueva) usa estos NOMBRES; los VALORES los pone cada skin.

```
Superficie      --background --surface --surface-raised --surface-muted
Línea           --line --line-subtle
Tinta           --ink --ink-secondary --ink-muted
Acento          --accent --accent-hover --accent-muted --accent-ink
Estado (tonal)  --success/-muted --warning/-muted --danger/-muted --info/-muted
Elevación       --shadow-1 --shadow-2
Radio           --radius-s (0.5rem) --radius-m (0.625rem) --radius-pill (999px)
Fuentes         --font-sans --font-mono
Dataviz         --viz-personal --viz-negocio --viz-clientes --viz-serie
                --viz-good --viz-warning --viz-critical --viz-grid --viz-axis --viz-muted
```

Reglas de la arquitectura:

- **El color sigue a la entidad, nunca al rank** (doctrina de `colors.ts`, validada
  con `dataviz/validate_palette.js`, ΔE adyacente 41.3). `personal` es azul siempre,
  en toda vista y todo chart.
- Estado tonal = par `color` + `color-muted` (texto/borde + fondo). Nunca inventar
  un tercer valor.
- El score usa UNA regla: `>=70 success`, `>=50 warning`, resto `danger`
  (`tonoScore()` — hoy triplicada en copilot, ver deuda §6).
- Tailwind: en v4, puente vía `@theme inline` (`--color-* → bg-surface`,
  `text-ink-muted`, `border-line`); en v3 (Mission Control), vía
  `theme.extend.colors` apuntando a las CSS vars.

## 3. Las dos skins

> **⚠️ ACTUALIZACIÓN 2026-08-08 — la skin `mission` queda RETIRADA.** Por decisión
> de la dueña, Mission Control adopta la skin `ejecutiva` (los MISMOS valores que
> Meeting Copilot, §skin copilot) con tres variantes deliberadas: base **20px**
> (pedido vigente de la dueña), **glifos Unicode** (sin lucide — los tests sin
> navegador y las vistas puras se conservan) y puente alpha `--*-rgb` en
> tailwind.config (v3 no atenúa `var()` sin triplete). El CHROME de los charts
> (`--viz-grid/axis/muted`) pasó a ser POR TEMA en globals.css; `conAlpha()`
> atenúa `var()` vía `color-mix`. El bloque siguiente se conserva como registro
> histórico de los valores que tuvo la skin mission.

### Skin `mission` (RETIRADA 2026-08-08) — dark-only, slate + esmeralda

Valores REALES hoy en producción (hardcodeados como clases Tailwind; el set-up
los convierte en tokens sin cambiar el look):

| Token | Valor | Hoy es |
|---|---|---|
| `--background` | `#020617` | `slate-950` (body, themeColor PWA, manifest) |
| `--surface` | `#0f172a` | `slate-900` (cards, header al 60%, subnav al 40%) |
| `--line` | `#1e293b` | `slate-800` (= `CHROME.grid` duplicado en hex) |
| `--ink` | `#f1f5f9` | `slate-100` |
| `--ink-secondary` | `#cbd5e1` / `#94a3b8` | `slate-300/400` (= `CHROME.muted`) |
| `--ink-muted` | `#64748b` | `slate-500` |
| `--accent` | `#059669` | `emerald-600` (CTA login, badge fuente `real`) |
| `--accent-hover` | `#10b981` | `emerald-500` (focus ring) |
| `--danger` | rose (`rose-400/800/950-40`) | banners denied/error |
| `--warning` | amber (`amber-300/400/800/950-40`) | badge `mock`, avisos |
| `--info` | `#38bdf8` | `sky-400` (enlaces de fuente citada del grafo) |
| Dataviz | `#3987e5` / `#199e70` / `#c98500` · `#0ca30c` / `#fab219` / `#d03b3b` | `colors.ts` |

- Tipografía: sistema, base **20px** (decisión de la dueña; escala todo el rem de
  Tailwind: `text-sm`=17.5px, `text-xs`=15px). `tabular-nums` en tablas y métricas.
- Iconografía: **glifos Unicode**, siempre `aria-hidden` + texto adyacente.
- Card canónica: `rounded-lg border border-line bg-surface p-6` (normalizar el
  vaivén p-5/p-6; p-10 solo para empty states centrados).
- Eyebrow: `uppercase tracking-widest` (wordmark) / `tracking-[0.3em]` (login).
- Grids: `grid gap-6 lg:grid-cols-3` (paneles) · `lg:grid-cols-2` (ai-spend).

### Skin `copilot` (Meeting Copilot) — ejecutiva, light-first + dark, Inter

Ya implementada en `meeting-copilot/src/app/globals.css` (155 líneas). Valores light:
`--background #f6f7f9`, `--surface #ffffff`, `--surface-muted #f1f3f6`, `--line
#e3e6eb`, `--line-subtle #edf0f4`, `--ink #1b2334`, `--ink-secondary #4a5468`,
`--ink-muted #8a93a5`, `--accent #2760db`, `--accent-hover #1d4fc0`, `--accent-muted
#e9effc`, `--accent-ink #ffffff`, `--success #178a4c/#e6f5ec`, `--warning
#b26a05/#fdf3e2`, `--danger #c93434/#fdecec`, `--info #0d7f9e/#e5f5fa`.
Dark: `--background #0f1319`, `--surface #161b23`, `--surface-raised #1b212b`,
`--accent #6a95f0`, etc. — grises azulados, sin neón (referencia Apollo.io).

- Tipografía: **Inter** (`next/font`, `--font-inter`), `font-sans antialiased`.
  `[mm:ss]` en mono es elemento de marca (7 usos) — merece token `--font-mono`.
- Iconos: lucide. Radios: `--radius-m` cards, `--radius-s` botones/inputs.
- Clases globales existentes: `.card .btn-primary .btn-secondary .nav-item
  .nav-item-active .input` (transiciones 100–120 ms).

Los valores completos de ambas skins, listos para copiar: `./panel-adm-tokens.css`.

---

## 4. Inventario de componentes del panel admin

**Canon existente** (en copilot, `src/shared/components/ui.tsx`): `Chip({tono})` (6
tonos), `ScoreChip`/`tonoScore`, `Card`, `SectionHeader`, `EmptyState`, `Stat`,
`ProgressBar`.

**Faltantes que ambas superficies reimplementan a mano** (prioridad al construir):

| Componente | Evidencia de la duplicación |
|---|---|
| `Button` (variantes + tamaños) | copilot escala `.btn-secondary` con `!px-2 !py-1`; MC botones inline |
| `Table` | 3 reimplementaciones en copilot (Home/MeetingsList/Manager); 3 en MC (model/tareas/leads) |
| `PillToggle` / Tabs | 5 versiones distintas en copilot; MC subnav propio |
| `Callout` tonal (alerta) | compuesto a mano ≥5 veces en copilot; banners rose/amber en MC login |
| `Dialog` | prometido en SPEC §7, inexistente |
| `KpiTile` (stat grande + barra + umbral) | `BudgetMeter` de MC es el patrón de referencia |
| Badge de estado con glifo | `estado-tarea-badge` (8 estados) y `NeutralBadge` en MC |

**Patrones de referencia ya resueltos** (copiar, no reinventar):

- **Cita de evidencia** (`CitaEvidencia`, copilot): link `#seg-{idx}` + `[mm:ss]`
  mono + cita truncada en itálicas + `title` completo. Espejo del enlace de fuente
  `sky-400 underline decoration-dotted` del grafo en MC. *Toda afirmación cita su
  fuente* — es la misma regla de oro del grafo.
- **Empty state honesto**: "Sin hallazgos — no se inventa lo que la conversación no
  dio" (copilot) / "sin snapshot", "Grafo inalcanzable" (MC). Siempre: qué pasa +
  qué hacer a continuación. Nunca ocultar la sección vacía.
- **Badge de fuente de datos** (`mock` ámbar / `real` esmeralda) visible en el chrome.
- **SVG a mano para charts** (MC `daily-series.tsx`): sin librería de charting;
  crosshair + tooltip por `onPointerMove`; paleta `--viz-*`.

---

## 5. Reglas duras (no negociables)

1. **El estado nunca es color-solo**: glifo/texto siempre acompaña (`aria-hidden` en
   el glifo). Ya se cumple en ambas — mantener.
2. **Toda afirmación con evidencia**: hallazgos IA citan segmento o se DESCARTAN
   (validador de copilot); evaluaciones del grafo citan fuente y llevan el
   disclaimer SIEMPRE visible en el footer.
3. **No consumir `@a2a/design-system`** en superficies admin. Marca de cliente ≠
   herramienta interna.
4. **`html { font-size: 20px }` en Mission Control es decisión de la dueña** — se
   respeta en cualquier refactor.
5. **Los tests de MC** (`tests/*.spec.ts`, Playwright SIN navegador, asertan sobre
   `style` inline de componentes puros sin hooks) — mover un color de `style={{}}` a
   `className` ROMPE `tests/desarrollo.spec.ts` y `tests/crm-embudo.spec.ts`:
   actualizar los tests en el MISMO cambio, y los componentes de vista siguen puros.
6. **Seguridad del panel**: auth + allowlist fail-closed es prerequisito de todo
   deploy (aprendizaje 2026-07-24); el SW jamás cachea HTML/datos, solo estáticos.
7. Español primario, tuteo. Fechas sin hydration-drift (`slice(0,16).replace('T',' ')`).

---

## 6. Deuda priorizada = plan de set-up

> **Primera tanda EJECUTADA el 2026-07-26** (commits `84a23d6` MC + `219a41f`
> copilot, PR #161). **Segunda tanda EJECUTADA el mismo día** (commits `46ff58e`
> MC + `ea56bef` copilot, rama `fix/design-panel-adm-tanda2`). Los ítems tachados
> están resueltos; lo único abierto es el opcional §MC-9 (next/font — decisión de
> la dueña).

### Mission Control (el grueso: pasar de "cero tokens" al canon)

1. ~~**Fundar los tokens**: llevar la skin `mission` (§3) a `globals.css` como CSS
   vars + `theme.extend.colors` en `tailwind.config.ts`.~~ ✅ 2026-07-26 — mismos
   valores, look intacto; ojo: las clases `var()` no soportan modificador de
   opacidad (`bg-surface/60`), para eso siguen las escalas Tailwind.
2. ~~**Promover `colors.ts` a `src/shared/constants/`** y eliminar redeclarados +
   hex sueltos.~~ ✅ 2026-07-26 t2 — `git mv` (historia intacta); todos importan
   `SERIE_COLOR`/`CHROME`; nuevo `CHROME.surface` para el stroke del chart.
3. ~~**Extraer `Card`** (el literal aparecía 12+ veces) y unificar padding.~~
   ✅ 2026-07-26 — `src/shared/components/card.tsx`, pura y server-safe; cede el
   `p-6` si el `className` trae padding propio.
4. ~~**Unificar headings de sección**.~~ ✅ 2026-07-26 t2 — `SectionTitle`
   (`text-sm font-medium text-ink-secondary`) + `MicroLabel` (`text-xs uppercase
   tracking-wide text-ink-muted`) en `src/shared/components/section-title.tsx`;
   el h2 de entidad de vertical-card queda aparte (es título de entidad).
5. ~~**Decidir shadcn**: limpiarlo o completarlo.~~ ✅ 2026-07-26 — `components.json`
   fósil BORRADO (nada lo referenciaba; un `npx shadcn add` rompía el build).
6. ~~**Estados de carga/error**.~~ ✅ 2026-07-26 — `loading.tsx` + `error.tsx`
   compartidos a nivel `(main)` (skeleton con tokens; error client en español con
   "Reintentar").
7. ~~`/crm` al nav principal.~~ ✅ 2026-07-26 t2 — en `vistas`; el subnav de
   adquisición se conserva (contexto de departamento, no duplicidad).
8. ~~Arreglar alpha por concatenación.~~ ✅ 2026-07-26 t2 — `conAlpha(hex, a)` en
   `shared/constants/colors.ts` valida el hex y devuelve `rgba()`; con input
   no-hex devuelve el color sin alpha (antes producía CSS inválido en silencio).
9. **ABIERTO (opcional consciente)**: `next/font` (p. ej. Inter) para consistencia
   cross-OS en tablas densas — decisión de la dueña, no un default.

### Meeting Copilot (afinar un sistema ya sano)

1. ~~Crear `@keyframes` de `animate-pulse-once`.~~ ✅ 2026-07-26 — flash
   `--accent-muted`→transparente 1.2s; sin tocar TSX (las keys estables re-montan
   el segmento revelado).
2. ~~Usar `--surface-raised` en popover/CommandBar/modal.~~ ✅ 2026-07-26 —
   CommandBar + LauncherPopover (elevación real en dark; en light no cambia nada).
3. ~~Tokens de radio (`--radius-s/m`).~~ ✅ 2026-07-26 t2 — en `:root` + `@theme`;
   `.card`/`.btn-*`/`.input`/`.nav-item` usan `var(--radius-*)`. **Gotcha pagado**:
   `rounded-s` colisiona con la utilidad LÓGICA de lado "start" de Tailwind v4
   (`border-start-*-radius`) → override en `@layer utilities` al final de
   globals.css; verificar SIEMPRE en el CSS compilado.
4. ~~`tonoScore()` como única fuente.~~ ✅ 2026-07-26 — HomeView y ManagerView
   importan de `ui.tsx` (incluido el `detalle` "sano/coaching" que repetía el 70).
5. ~~Construir `Button`, `Table`, `PillToggle`, `Dialog`, `Callout` en `shared/ui`
   y migrar las duplicaciones.~~ ✅ COMPLETO 2026-07-26 (t1: Button/Table/Dialog;
   t2: PillToggle con variantes `segmentado`/`suelto` y Callout `card`/`inline` —
   4 toggles y ~10 avisos migrados). `MeetingHeader` queda como Tabs (border-b-2,
   patrón distinto a propósito); chips/tiles tonales NO son callouts.
6. ~~Alinear SPEC §14 con los nombres reales; documentar `--font-mono`.~~
   ✅ 2026-07-26 t2 — SPEC §14 usa `--line`/`--ink*`/`--radius-*`; `--font-mono`
   es token real documentado (los `[mm:ss]` son marca).
7. ~~Declarar `tailwindcss`; `@tailwindcss/postcss` a devDependencies;
   `turbopack.root` determinista.~~ ✅ 2026-07-26 t2 — `__dirname` en next.config.
8. ~~UX: "La usé" ≠ "Otra pregunta".~~ ✅ 2026-07-26 t2 — "La usé" registra
   constancia en `live-store` (`preguntasUsadas` con dimensión/timestamp/segundo,
   contador visible en Estado, 5 tests con control real); "Otra pregunta" solo rota.
9. ~~Anchos de columna derecha a `22rem`.~~ ✅ 2026-07-26 t2 — Recorder y Home
   alineados con Insights/Workspace/Guided.

---

## 7. Archivos clave

| Qué | Dónde |
|---|---|
| Tokens ejecutables de este set-up | `.claude/design-systems/panel-adm/panel-adm-tokens.css` |
| MC — tema global (punto de entrada) | `src/app/globals.css` + `tailwind.config.ts` (raíz) |
| MC — único token actual (dataviz) | `src/features/dashboard/components/ai-spend/colors.ts` |
| MC — shell | `src/app/layout.tsx` + `src/app/(main)/layout.tsx` |
| MC — contratos de datos | `src/features/dashboard/types/index.ts` |
| MC — capturas de referencia | `businessos/dashboard-screenshots/*.png` |
| Copilot — tokens canon | `businessos/frontends/meeting-copilot/src/app/globals.css` |
| Copilot — primitivas UI | `businessos/frontends/meeting-copilot/src/shared/components/ui.tsx` |
| Copilot — shell | `.../src/features/shell/{AppShell,Sidebar,Topbar}.tsx` |
| Copilot — spec de producto | `businessos/frontends/meeting-copilot/SPEC.md` |
| Marca de cliente (NO usar aquí) | `businessos/frontends/design-system/` |

---

*Parte de las carpetas de diseño de la fábrica. Invocación: `/design-panel-adm`.*
