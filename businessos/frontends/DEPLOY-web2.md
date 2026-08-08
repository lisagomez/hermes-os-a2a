# Deploy de `cliente-web2` (Vercel) + backend

> **Estado: DESPLEGADO + CHAT EN VIVO** (chat encendido 2026-07-19) — https://cliente-web2.vercel.app
> Proyecto Vercel `cliente-web2` (scope lisagomezs-projects), upload root `frontends/`,
> Root Directory `cliente-web2`. Migración fase11 aplicada; leads verificado end-to-end
> (POST → fila real → limpieza). **Chat live ENCENDIDO** (Opción A: daemon `chat-web2`, no el
> agente Hermes privado) — ver §3.

## 0. Aprendizajes del primer deploy real (2026-07-17)

1. **Upload root ≠ app**: el paquete `file:../design-system` obliga a subir `frontends/`
   completo y fijar Root Directory `cliente-web2` **vía API** (`PATCH /v9/projects/{id}`,
   el CLI no tiene flag). Correr `vercel deploy` DESDE el subdir se auto-linkea mal y busca
   `cliente-web2/cliente-web2`.
2. **Tipos de React del paquete hermano**: en Vercel `tsc` no los resuelve (en dev los
   aportaba el `node_modules` de la raíz del monorepo, que no viaja). NO mapear `react` en
   `tsconfig.paths` — Turbopack usa esos paths como alias de bundling y revienta el build
   apuntando runtime a `@types/`. Fix real: `devDependencies` `@types/react`(-dom) en el
   design-system + installCommand `npm install && npm install --prefix ../design-system`.
3. **El `.env.local` que crea `vercel link` en el upload root MATA las lambdas**: si viaja
   en el deploy, toda function muere con `failed to load env vars: EnvFileReadError` (500
   genérico sin tocar tu código; la landing estática sigue viva y engaña). Fix: borrarlo y
   `.vercelignore` con `.env*`.
4. **El proyecto NO está conectado a GitHub → mergear a master NO despliega** (2026-07-18):
   un merge a master no dispara nada en Vercel (verificado: `vercel ls` sin deploy nuevo tras
   el merge del PR #63). Publicar = `npx vercel deploy --prod` **desde `frontends/`** (el
   upload root con el `.vercel/` linkeado), como cuenta dueña. Antes de asumir "está
   construyendo", consultar `npx vercel ls cliente-web2`.
   **Esto es deliberado, no pendiente**: un `vercel link`/`vercel git connect` corrido sin
   querer (2026-08-02, revisando env vars) conectó el proyecto a GitHub por un rato — el
   Root Directory quedó bien (`businessos/frontends/cliente-web2`, correcto para un clone del
   monorepo completo) pero el build reventaba en el paso de "Deploying outputs" con `ENOENT
   .../cliente-web2/.next/routes-manifest-deterministic.json` (path doubling): es un bug
   conocido y sin resolver de Turbopack + `outputFileTracingRoot` en monorepos anidados
   cuando Vercel corre el build con el Root Directory como cwd (vercel/next.js#88579) — no
   ocurre con el deploy CLI porque ahí el upload root YA es `frontends/`, sin anidamiento que
   duplique. Se revirtió con `vercel git disconnect`. Si algún día se quiere GitHub-deploy
   real para esta app, hay que resolver ese bug primero (o esperar a que Vercel/Next lo
   arregle), no solo reconectar.
5. **Vercel Hobby bloquea los deploys de colaboradores en repos privados** (2026-07-17):
   un push de cualquiera que no sea la cuenta dueña queda "Blocked" — no es fallo de build
   ni de Root Directory, es restricción del plan. Workaround activo:
   `.github/workflows/reauthor-tip-vercel.yml` agrega un commit vacío autorado por la dueña
   tras cada push de colaborador (ramas ≠ master; master no lo necesita: sus merges los
   ejecuta la cuenta dueña, y su protección bloquearía el push de la Action). Costo: un
   commit vacío por push. Fix definitivo si el proyecto escala: **Vercel Pro** + invitar a
   los colaboradores al Team de Vercel (y borrar el workflow).

Runbook para publicar la superficie web2. Deploy en **Vercel**; el backend vive en el Droplet
Hetzner. Honestidad operativa: lo que queda **live** de inmediato vs. lo que necesita un paso
de infra.

## 1. Prerequisito de datos (Supabase)

Aplicar una vez sobre el proyecto Supabase (habilita el origen `web2` en `leads`):

```sql
-- businessos/migrations/supabase-fase11-leads-web2.sql
```

Aplicar con el patrón del repo (MCP Supabase read-only bloquea DDL → management API
`POST /v1/projects/{ref}/database/query` con `SUPABASE_ACCESS_TOKEN`, UA `curl/8.0`), o desde
el SQL editor del dashboard. Verificar con el MCP (reads sí funcionan) que el CHECK acepta `web2`.

## 2. Proyecto Vercel

- **Root Directory**: `businessos/frontends/cliente-web2` (monorepo → subdir).
- **Framework**: Next.js (autodetectado). Build `next build`, output autodetectado.
- El design system (`../design-system`) se resuelve por `file:` + `transpilePackages`; queda
  dentro de la raíz de tracing (`turbopack.root = frontends/`).

### Variables de entorno (Vercel → Settings → Environment Variables)

| Var | Ámbito | Notas |
|-----|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | build+runtime | público |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | build+runtime | público (RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | runtime | **server-only**, bypassa RLS |
| `CLAUDECLAW_URL` | runtime | URL pública del daemon (ver §3); vacío = chat degradado |
| `OPENCLAW_GATEWAY_TOKEN` | runtime | server-only |
| `POLAR_ACCESS_TOKEN` / `POLAR_PRODUCT_ID` | runtime | opcional (checkout) |
| `NEXT_PUBLIC_SITE_URL` | build+runtime | dominio final |

Sin secretos en el repo; todo por env. `.env.local` es solo para dev.

### Qué queda live de inmediato

- **Landing** completa (estática/SSR).
- **Captura de leads** → Supabase `leads` (Supabase es cloud/público). ✅
- **Checkout Polar** → si `POLAR_*` está configurado (API pública). ✅

## 3. Chat en vivo — ENCENDIDO (Opción A, 2026-07-19)

El runbook original asumía "exponer el daemon Hermes por el edge". Realidad al momento de
encenderlo: **ese daemon (`hermes-daemon:3099`) nunca existió** — era un residual del ROADMAP.
Los contenedores Hermes hablan solo por Telegram (sin HTTP entrante, por diseño de seguridad).

Decisión de la dueña: **Opción A — un daemon de venta PROPIO**, no un puente al agente Hermes
privado. Ventajas: no abre la superficie privada de Hermes a internet, es rápido y en-marca, y
captura leads. Implementado como servicio **`businessos/chat-web2/`** (Starlette, hermano de
`ventas-a2a`):

- `POST /chat/stream` → SSE (`text_delta`/`[DONE]`), auth **Bearer `OPENCLAW_GATEWAY_TOKEN`**
  (falla **cerrado** sin token). Motor OpenRouter (`gemini-2.5-flash-lite`) con prompt de venta
  A2A Factory y fronteras honestas (no cierra, no fija precios, no firma). **Captura leads**
  origen `web2` (gate por email → extracción → upsert idempotente por `lead_id`).
- Servicio del compose (`chat-web2`, `127.0.0.1:4500`, `hermes-net`).
- **Edge Caddy** publica SOLO `/chat/stream` (bloque `handle` con rate-limit + `flush_interval
  -1` para el SSE); el resto sigue a `ventas-a2a`. Nada más del daemon es público.

### Cómo se encendió (y cómo re-hacerlo)

1. **Backend (Hetzner)**: sincronizar `chat-web2/` + `docker-compose.yml` + `edge/Caddyfile` al
   snapshot del server (`/home/hermes/repo/businessos/`); generar el token en el server SIN
   imprimirlo (`openssl rand -hex 32` → `OPENCLAW_GATEWAY_TOKEN` en el `.env`, **una sola
   línea**); `docker compose --profile a2a --profile edge up -d --build chat-web2 edge`.
2. **Vercel** (cuenta dueña): fijar en **production** `CLAUDECLAW_URL=https://167-233-233-56.sslip.io`
   y `OPENCLAW_GATEWAY_TOKEN=<el MISMO valor del server>` (piped, sin imprimirlo); `vercel deploy
   --prod` desde `frontends/`. Las env vars nuevas exigen redeploy (no afectan deploys existentes).
3. **Verificación**: `POST cliente-web2.vercel.app/api/chat/stream` devuelve stream real (no el
   aviso de degradación); un email en la charla persiste una fila `origen='web2'` en `leads`.

⚠️ **El token debe ser idéntico en el `.env` del server y en Vercel.** Si el `.env` queda con dos
líneas `OPENCLAW_GATEWAY_TOKEN` (p. ej. por re-ejecución accidental), dejar UNA y recrear
`chat-web2` para que coincida con lo que se puso en Vercel; verificar 200 (token bueno) / 401
(token malo). Si Vercel no toma las vars, es que falta el **redeploy**.

Si `CLAUDECLAW_URL`/`OPENCLAW_GATEWAY_TOKEN` faltan en Vercel, el chat **degrada con aviso**
(`/api/chat/stream` emite un SSE que invita al formulario) — no se cuelga ni finge respuestas.

> Pendiente opcional: replicar las 2 env vars en el entorno **preview** de Vercel si se quiere el
> chat en los deploys de rama (hoy solo están en **production**).

## 4. Verificación post-deploy

1. Landing carga en el dominio; toggle ES/EN; abrir una demo; añadir carta → cotizador con USD.
2. Enviar el formulario de "Agendar llamada" → verificar fila real en Supabase `leads`
   (`select * from leads where origen='web2' order by created_at desc limit 1`).
3. (Si se activó el chat) escribir en el widget → respuesta SSE del daemon.
4. Smoke local de referencia: `businessos/dashboard-screenshots/web2-*.png`.
