# cliente-web2 — superficie de cara al cliente (web2)

Producto de cara al **cliente humano** de A2A Factory: landing bilingüe con cotizador
"deck builder", captura de leads y chat de agente en vivo. Consume el design system
compartido `@a2a/design-system` y el backend del Business OS. Marca: A2A Factory (violeta/rosa,
Space Grotesk + JetBrains Mono). Es una de las tres superficies (ver `../README.md`).

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 · Supabase · Zod ·
`@a2a/design-system` (paquete local, `file:../design-system`).

## Estructura

```
src/
├── app/
│   ├── layout.tsx            # fuentes (next/font) + tokens del DS
│   ├── globals.css           # @import tokens + tema Tailwind + animaciones/layout
│   ├── page.tsx              # → LandingClient
│   └── api/
│       ├── leads/route.ts    # captura de lead (Zod → tabla `leads`, service_role, origen 'web2')
│       ├── chat/stream/route.ts  # proxy SSE al daemon Hermes (degrada si no expuesto)
│       └── checkout/route.ts # Polar checkout (depósito/retainer; degrada si no configurado)
├── features/landing/
│   ├── LandingClient.tsx     # orquesta provider + secciones
│   ├── context.tsx           # estado (idioma, shopper, mazo, panel, demo, agenda)
│   ├── agents.ts             # los 8 agentes ("A2A Cards") + economía del mazo
│   └── sections/*            # TopNav, Hero, Ticker, Steps, Cards, DeckBuilder,
│                             # Panel, Protocol, Agenda, Footer, DemoModal, ChatWidget
├── lib/supabase/{client,service}.ts
└── shared/i18n/strings.ts    # diccionario ES/EN (ES primario)
```

## Cómo se cablea al backend

| Superficie | Ruta | Backend | Estado |
|-----------|------|---------|--------|
| Captura de lead (form de agenda + cotizador) | `POST /api/leads` | Supabase `leads` (service_role, origen `web2`) | ✅ live con Supabase configurado |
| Chat de agente en vivo | `POST /api/chat/stream` | daemon Hermes `${CLAUDECLAW_URL}/chat/stream` (Bearer `OPENCLAW_GATEWAY_TOKEN`) | ⚙ requiere exponer el daemon por el edge (degrada con aviso si no) |
| Pago (depósito) | `POST /api/checkout` | Polar `/checkouts/` | ✅ live con `POLAR_*` configurado (opcional) |

**Prerequisito de datos:** aplicar `../../supabase-fase11-leads-web2.sql` (añade el origen `web2`
al CHECK de `leads`). Sin él, el insert de leads falla.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # rellenar
npm run dev                  # http://localhost:3000
npm run typecheck && npm run build && npm run lint
```

Variables de entorno: ver `.env.example`. Los NEXT_PUBLIC_* van al browser; la
`SUPABASE_SERVICE_ROLE_KEY`, `OPENCLAW_GATEWAY_TOKEN` y `POLAR_*` son server-only.

## Notas de integración (honestidad operativa)

- La app está en **Vercel**; el backend vive en el Droplet Hetzner. Supabase (cloud) y Polar
  (API pública) son alcanzables directo. El **daemon Hermes y grafo NO son públicos** hoy
  (127.0.0.1 tras túnel SSH) → el chat en vivo depende de un paso de infra (exponer una ruta
  autenticada por el edge Caddy). Mientras tanto, el chat **degrada con un aviso claro**, no
  finge funcionar. Ver `../DEPLOY-web2.md`.
- El cotizador es una **estimación** (`energía × $290–$410`, setup `2 + ⌈mazo/2⌉` semanas);
  la conversión primaria es el lead + llamada de descubrimiento. El checkout Polar queda listo
  para un depósito cuando exista un producto Polar.
