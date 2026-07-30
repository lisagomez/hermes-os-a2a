# Frontends del Business OS — cuatro superficies

El Business OS se opera desde **cuatro frontends distintos**, uno por tipo de usuario y
canal. Todos son *espejo* del sistema agéntico (la UI muestra y entiende; el agente opera);
comparten el backend (Hermes / trío A2A / grafo / ERP) pero se **aíslan** entre sí ("aislar,
no fundir"). Mapean a la estrategia de superficies del maestro (Slack interno · Web propia del
cliente · A2A).

| Dir | Superficie | Para quién | Canal / stack | Estado |
|-----|-----------|-----------|---------------|--------|
| `design-system/` | **Design system A2A Factory** | las superficies de cliente | tokens CSS + componentes TSX (`@a2a/design-system`) | ✅ fundado (vendored del ZIP de la dueña, 2026-07-16; ver `design-system/README.md`) |
| `control-interno/` | **Control interno** | el equipo (operar el Business OS) | Next.js + Supabase + Tauri (Titaniumorphism) | ✅ integrado (vendored de `daniel-carreon/business-os-new`; ver `control-interno/VENDORED-FROM.md`) |
| `cliente-web2/` | **Cliente web2** | clientes finales, web tradicional | Next.js 16 + Supabase + Tailwind v4 + `@a2a/design-system` | ✅ integrado (landing bilingüe + cotizador + leads + chat; deploy Vercel — ver `DEPLOY-web2.md`) |
| `meeting-copilot/` | **Meeting Copilot** | agentes de ventas/discovery/CS (marca blanca) | Next.js 16 + Tailwind v4, mock-first (seams STT/LLM/Supabase) | ✅ MVP (transcripción→insights→score→guided→manager; ver `meeting-copilot/README.md` y `SPEC.md`) |
| `cliente-a2a-web3/` | **Cliente A2A-card web3** | clientes vía A2A card / web3 | web3 + A2A card (identidad de agente) | 🎨 diseño + scaffold (demo de la Tarjeta A2A; app en scaffold) |

## Rol de cada superficie

- **Control interno** — la cabina del equipo: board, calendario, canvas, conversaciones,
  finanzas, segundo cerebro. Uso interno, NO de cara al cliente. Es el panel humano que el
  maestro pone junto a Slack para el equipo.
- **Cliente web2** — el producto de cara al cliente final por web tradicional (marca blanca,
  aislamiento por tenant). El canal "Web propia" del maestro.
- **Meeting Copilot** — copiloto comercial de reuniones (línea marca blanca): convierte
  audio/transcripción en insights con evidencia, score de discovery explicable, guided
  meeting y salidas listas para CRM. Corre 100% local con motor determinista; los seams
  (STT real, LLM, Supabase) están diseñados en su `SPEC.md`.
- **Cliente A2A-card web3** — la superficie web3 donde el cliente interactúa vía **A2A card**
  (la tarjeta de agente del protocolo agente-a-agente) — el puente hacia el pago/identidad
  agéntica (Circle/USDC, contratos, verificación) que el roadmap contempla como capa futura.

## Cómo se conectan al backend

Los tres consumen el mismo **contrato de daemon** (HTTP: `/chat/stream` SSE + webhooks
`/api/openclaw/action`, auth por `OPENCLAW_GATEWAY_TOKEN`). El daemon es Hermes/A2A. Cada
superficie usa su propio token y su propio alcance de tenant; el aislamiento entre clientes
es el mismo RLS + tarjeta de agente de la fábrica.

> Cuando lleguen `cliente-web2` y `cliente-a2a-web3`, se integran con el mismo patrón que
> `control-interno`: copia adoptada (vendored) con su nota de procedencia, o su propio repo,
> según se decida al momento.

## Ecosistema de apps: registro y navegación (2026-07-29)

Las superficies comparten un **App Launcher (waffle)** y un patrón de **navegación
jerárquica** (Sección → Página → Subpágina, máx 3 niveles, breadcrumb derivado). La
fuente de verdad es el paquete de DATOS puros **`app-registry/`** (`@a2a/app-registry`):
registro de apps + schema `NavArbol` + funciones puras (`esRutaActiva`, `rastroDe`,
`aplanarNav`, `validarArbol`). Reglas:

1. **Toda app nueva se da de alta en `app-registry/src/apps.ts`** con
   `audiencia: 'interna' | 'publica'` decidida al nacer. Las **públicas jamás pintan
   launcher** (`appsParaLauncher()` filtra internas — un waffle con superficies internas
   en una landing anónima es fuga de superficie).
2. **Consumo vendored por default** (`node app-registry/scripts/sync-vendored.mjs`, con
   `--check` cableado a los gates de cada app: el drift es test rojo, no silencio).
   `file:` + `transpilePackages` solo para apps cuyo deploy ya suba `frontends/`
   (patrón cliente-web2). Protocolo de drift y Fase X de unificación: `app-registry/README.md`.
3. **El árbol de navegación es config por app** (`nav.config.ts`, tipado con `NavArbol`,
   validado con `validarArbol` en sus tests). El JSX (sidebar/waffle/breadcrumb) es
   SIEMPRE local con los tokens de cada skin — se comparte el DATO, nunca el componente
   ("aislar, no fundir").
4. **El launcher no introduce auth**: cada app conserva su puerta; un tile hacia una app
   sin acceso termina en el rechazo de la destino. ⚠️ Hoy cada app vive en su dominio;
   **si algún día se unifican dominios, revisar el scope de cookies Supabase ANTES**
   (incidente 2026-07-28) — gate duro: smoke de auth/cookies verde contra preview
   (ver `app-registry/README.md` §Auth y cookies).

Integradas: Mission Control (raíz del repo), control-interno y meeting-copilot.
