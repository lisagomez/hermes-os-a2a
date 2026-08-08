# Frontend cliente-web2 + design system A2A Factory

Estado y decisiones de la superficie de cara al cliente humano. Iniciado 2026-07-16.

## Qué se construyó

- **Design system compartido** `businessos/frontends/design-system/` (paquete local
  `@a2a/design-system`): tokens CSS + 9 componentes TSX (Button, PillToggle, Badge, EnergyChip,
  StatBar, Tabs, AgentCard, TerminalWindow, KpiCard). Vendored del ZIP de la dueña
  ("Interfaz Hermes A2A Factory.zip", export del skill de diseño de Claude). Marca: fondo
  casi-negro violáceo, dúo violeta `#9F7BFF`+rosa `#FF4D8D`, Space Grotesk + JetBrains Mono,
  A2A Cards gamificadas. Skill de marca instalado en `.claude/skills/a2a-factory-design/`.
  **NO** aplica a control-interno (marca Titaniumorphism aparte).
- **`businessos/frontends/cliente-web2/`** — Next.js 16 + React 19 + TS + Tailwind v4 + Supabase.
  Landing bilingüe ES/EN (portada 1:1 de `design-system/landing-reference.dc.html`): hero con
  terminal viva, deck de 8 A2A Cards, cotizador "deck builder" (energía × $290–$410, setup
  2+⌈mazo/2⌉ sem), panel con tabs/KPIs, protocolo A2A, formulario de lead + calendario, chat widget.
  typecheck + build + lint + smoke Playwright verdes (0 errores de consola).
- **Sección Intake y Cotización** (2026-07-18, del mock `intake-cotizacion-mazo.html` de la
  dueña, adaptado al design system): intake por prompt → detección por keywords → mazo del trío
  recomendado (10 cartas: 4 base + 4 por dominio + 2 opcionales punteadas) → entregables →
  cotización MXN+IVA con tokens proyectados → aprobación (gate dorado→verde) → kickoff con
  decision_id. Respeta los toggles globales ES/EN y humano/A2A: en modo A2A muestra el log
  simulado del canal ventas-a2a (invariante: firma+pago siempre humanos). Archivos:
  `features/landing/intake.ts` (datos/lógica bilingüe) + `sections/Intake.tsx`; va entre
  DeckBuilder y Panel (el kickoff desemboca en Mission Control). Todo simulado, cero runtime.
  Gotcha: ESLint `react-hooks/set-state-in-effect` prohíbe sincronizar estado con efectos →
  el prompt de ejemplo se deriva (`customPrompt ?? DEFAULT[lang]`), no se setea en useEffect.

## Decisiones

- **Alcance (dueña, 2026-07-16):** web2 completo primero; cliente-a2a-web3 solo scaffold.
- **Deploy: Vercel** (subdir `businessos/frontends/cliente-web2`). Runbook: `frontends/DEPLOY-web2.md`.
- **Integración honesta:** Supabase (leads) y Polar (checkout) quedan **live** desde Vercel
  (son públicos). El **chat en vivo depende de exponer el daemon Hermes por el edge Caddy**
  (hoy solo ventas-a2a:4400 es público) → mientras no, el chat degrada con aviso, no finge.
- **Invariante un-escritor-por-origen:** el frontend web2 usa su propio origen **`web2`** en la
  tabla `leads` (no reusa `a2a` de ventas-a2a ni `manual` de humanos). Migración:
  `businessos/migrations/supabase-fase11-leads-web2.sql` (PREREQUISITO de deploy, aún NO aplicada en prod).

## Residuales

- ~~Aplicar `supabase-fase11-leads-web2.sql`~~ → **APLICADA en prod 2026-07-17** (management API; CHECK verificado con el MCP).
- ~~Configurar el proyecto Vercel + publicar~~ → **DESPLEGADO 2026-07-17**: https://cliente-web2.vercel.app (proyecto `cliente-web2`, upload root `frontends/`, rootDirectory `cliente-web2`, installCommand instala también el design-system). Leads verificado end-to-end (POST → fila `origen='web2'` → limpieza). Gotchas del deploy en `frontends/DEPLOY-web2.md` §0 y CLAUDE.md 2026-07-17.
- ~~(Opt-in) exponer el daemon por el edge para el chat live~~ → **CHAT LIVE ENCENDIDO
  2026-07-19 (PR #76)**. NO se puenteó al agente Hermes privado (Opción A): se construyó un
  **daemon de venta propio** `businessos/chat-web2/` (Starlette, hermano de ventas-a2a) que
  sirve `POST /chat/stream` (SSE) auth Bearer `OPENCLAW_GATEWAY_TOKEN` (falla cerrado), motor
  OpenRouter (gemini-2.5-flash-lite) con prompt de venta, y **captura leads origen web2** (gate
  por email → extracción JSON → upsert idempotente por lead_id determinista). Publicado por el
  edge Caddy (SOLO `/chat/stream`, `flush_interval -1`); frontend cableado en Vercel
  (`CLAUDECLAW_URL` + token, en **production**). Verificado end-to-end (stream real + fila de
  lead). Gotcha vivido: el `.env` del server quedó con 2 líneas de token por re-ejecución
  accidental → dejar UNA y recrear el contenedor para que coincida con Vercel (200/401).
  Detalle en `frontends/DEPLOY-web2.md` §3. Pendiente opcional: replicar las 2 env vars en el
  entorno **preview** de Vercel.
- cliente-a2a-web3: subir de scaffold a app (siguiente pase). Ver [[fase5-a2a]] para el contrato A2A.

Rama de trabajo: `feature/design-system-cliente-web2` (mergeada). El chat live salió en la rama
`feat/chat-web2-daemon` (PR #76, mergeada). Relacionado: [[fase9-adquisicion]] (ventas-a2a/leads),
[[despliegue-hetzner]] (dónde vive el backend), [[mantener-docs-vivas]].
